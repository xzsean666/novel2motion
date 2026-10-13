import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import fs from "node:fs";

// Ensure Node.js environment polyfills for Three.js GLTFLoader
(function ensureNodePolyfills() {
  (globalThis as any).self = globalThis;
  if (!(globalThis as any).window) (globalThis as any).window = globalThis;
  if (!(globalThis as any).document) {
    (globalThis as any).document = {
      createElement: () => ({ setAttribute: () => {}, style: {} }),
      createElementNS: () => ({ setAttribute: () => {}, style: {} })
    };
  }
})();

export interface LoadedGlbModel {
  scene: THREE.Group;
  textures: THREE.CanvasTexture[];
}

/**
 * Loads a GLB binary file and decodes all embedded textures into CanvasTextures in Node.js
 */
export async function loadGlbWithTextures(glbPath: string): Promise<LoadedGlbModel> {
  if (!fs.existsSync(glbPath)) {
    throw new Error(`GLB file not found: ${glbPath}`);
  }

  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltfJson = JSON.parse(buf.toString("utf8", 20, 20 + jsonLen));

  const binHeaderOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHeaderOffset);
  const binDataOffset = binHeaderOffset + 8;
  const binBuf = buf.subarray(binDataOffset, binDataOffset + binLen);

  // Decode all embedded images using @napi-rs/canvas
  const loadedTextures: THREE.CanvasTexture[] = [];
  if (gltfJson.images) {
    for (let i = 0; i < gltfJson.images.length; i++) {
      const imgDef = gltfJson.images[i];
      if (imgDef.bufferView !== undefined) {
        const bv = gltfJson.bufferViews[imgDef.bufferView];
        const imgData = binBuf.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
        try {
          const img = await loadImage(imgData);
          const c = createCanvas(img.width, img.height);
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const tex = new THREE.CanvasTexture(c as any);
          tex.name = imgDef.name || `tex_${i}`;
          tex.flipY = false;
          loadedTextures.push(tex);
        } catch (e) {
          console.warn(`Failed to decode image ${i} in ${glbPath}:`, e);
          loadedTextures.push(null as any);
        }
      } else {
        loadedTextures.push(null as any);
      }
    }
  }

  // Parse GLTF geometry & skeletal structure
  const loader = new GLTFLoader();
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  return new Promise((resolve, reject) => {
    loader.parse(
      arrayBuf,
      "",
      (gltf) => {
        // Bind loaded textures to materials
        if (gltfJson.materials && gltfJson.textures) {
          gltfJson.materials.forEach((matDef: any) => {
            const pbr = matDef.pbrMetallicRoughness;
            if (pbr && pbr.baseColorTexture) {
              const texDef = gltfJson.textures[pbr.baseColorTexture.index];
              const imgIdx = texDef?.source ?? pbr.baseColorTexture.index;
              const texture = loadedTextures[imgIdx];
              if (texture) {
                gltf.scene.traverse((obj) => {
                  if (obj instanceof THREE.Mesh) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach((m) => {
                      if (m && m.name === matDef.name) {
                        m.map = texture;
                        m.needsUpdate = true;
                      }
                    });
                  }
                });
              }
            }
          });
        }

        // Normalize Scale & Up-Vector if model was exported in cm or Z-up
        gltf.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Mixamo 0.01 scale fix
        if (size.y < 0.1 && size.y > 0) {
          gltf.scene.scale.set(100, 100, 100);
          gltf.scene.updateMatrixWorld(true);
        }

        resolve({ scene: gltf.scene, textures: loadedTextures });
      },
      reject
    );
  });
}
