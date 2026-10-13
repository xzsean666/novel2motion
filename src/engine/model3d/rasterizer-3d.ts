import * as THREE from "three";
import { createCanvas, type Canvas } from "@napi-rs/canvas";

export interface RenderTriangle {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  depth: number;
  renderOrder?: number;
  // Colored shading
  fillColor?: string;
  // Textured mapping
  textureCanvas?: Canvas;
  s0?: [number, number];
  s1?: [number, number];
  s2?: [number, number];
  texW?: number;
  texH?: number;
  // Cel-shading / rim overlays
  shadowAlpha?: number;
  isRim?: boolean;
  rimColor?: string;
}

export interface RasterizerOptions {
  enableOutlines?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  keyLightDir?: THREE.Vector3;
  rimColor?: THREE.Color | string;
  rimIntensity?: number;
  ambientIntensity?: number;
}

/**
 * Simple3DRasterizer: High-fidelity 3D Cel-Shaded & Textured Rasterizer for Three.js
 * Runs entirely in Node.js on CPU using Skia Canvas.
 */
export class Simple3DRasterizer {
  renderScene(
    scene: THREE.Scene | THREE.Group,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    options: RasterizerOptions = {}
  ): Buffer {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const vpMatrix = new THREE.Matrix4();
    vpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    const normalMatrix = new THREE.Matrix3();

    const keyLight = (options.keyLightDir || new THREE.Vector3(0.45, 0.75, 0.60)).normalize();
    const rimIntensity = options.rimIntensity ?? 0.50;
    const ambientIntensity = options.ambientIntensity ?? 0.45;

    let rimColorHex = "rgba(180, 225, 255, 0.55)";
    if (options.rimColor) {
      if (typeof options.rimColor === "string") {
        rimColorHex = options.rimColor;
      } else {
        rimColorHex = `rgba(${Math.floor(options.rimColor.r * 255)}, ${Math.floor(options.rimColor.g * 255)}, ${Math.floor(options.rimColor.b * 255)}, 0.55)`;
      }
    }

    const renderTriangles: RenderTriangle[] = [];

    // Traverse all meshes in scene
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;

      const geometry = obj.geometry;
      if (!geometry || !geometry.attributes.position) return;

      const posAttr = geometry.attributes.position;
      const normAttr = geometry.attributes.normal;
      const uvAttr = geometry.attributes.uv;
      const index = geometry.index;
      const matrixWorld = obj.matrixWorld;

      normalMatrix.getNormalMatrix(matrixWorld);

      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const texture = mat && "map" in mat ? (mat as any).map : undefined;
      const hasTexture = !!(texture && texture.image);
      const texCanvas = hasTexture ? (texture.image as Canvas) : undefined;
      const texW = texCanvas ? texCanvas.width : 0;
      const texH = texCanvas ? texCanvas.height : 0;

      const baseColor = (mat && "color" in mat && mat.color) ? mat.color.clone() : new THREE.Color(0.85, 0.85, 0.85);
      const isBasic = mat instanceof THREE.MeshBasicMaterial;

      let rOrder = obj.renderOrder || 0;
      const mName = ((mat && "name" in mat ? (mat as any).name : "") + " " + obj.name).toLowerCase();
      if (/skin/i.test(mName)) rOrder = -10;
      else if (/eyewhite/i.test(mName)) rOrder = -5;
      else if (/iris/i.test(mName)) rOrder = 5;
      else if (/highlight/i.test(mName)) rOrder = 10;
      else if (/brow|eyelash|eyeline|mouth/i.test(mName)) rOrder = 15;
      else if (/hair/i.test(mName)) rOrder = 20;

      const vertCount = posAttr.count;
      const worldPositions: THREE.Vector3[] = new Array(vertCount);
      const isSkinned = !!((obj as any).isSkinnedMesh && (obj as any).skeleton && geometry.attributes.skinIndex && geometry.attributes.skinWeight);
      const skinIndex = isSkinned ? geometry.attributes.skinIndex : null;
      const skinWeight = isSkinned ? geometry.attributes.skinWeight : null;
      const boneMatrices = isSkinned ? (obj as any).skeleton.boneMatrices : null;
      const bindMatInv = isSkinned ? (obj as any).bindMatrixInverse : null;
      const bindMat = isSkinned ? (obj as any).bindMatrix : null;
      const morphPos = geometry.morphAttributes?.position;
      const morphInfluences = (obj as any).morphTargetInfluences;

      const tempV = new THREE.Vector3();
      const tempBone = new THREE.Matrix4();
      const skinnedPt = new THREE.Vector3();

      for (let vi = 0; vi < vertCount; vi++) {
        tempV.fromBufferAttribute(posAttr, vi);

        // Morph targets (blend shapes)
        if (morphPos && morphInfluences) {
          for (let m = 0; m < morphPos.length; m++) {
            const inf = morphInfluences[m];
            if (inf > 0) {
              tempV.x += morphPos[m].getX(vi) * inf;
              tempV.y += morphPos[m].getY(vi) * inf;
              tempV.z += morphPos[m].getZ(vi) * inf;
            }
          }
        }

        if (isSkinned && skinIndex && skinWeight && boneMatrices && bindMatInv && bindMat) {
          const j0 = skinIndex.getX(vi), w0 = skinWeight.getX(vi);
          const j1 = skinIndex.getY(vi), w1 = skinWeight.getY(vi);
          const j2 = skinIndex.getZ(vi), w2 = skinWeight.getZ(vi);
          const j3 = skinIndex.getW(vi), w3 = skinWeight.getW(vi);

          const jArr = [j0, j1, j2, j3];
          const wArr = [w0, w1, w2, w3];

          const worldV = new THREE.Vector3(0, 0, 0);
          const baseV = tempV.clone().applyMatrix4(bindMat);

          for (let k = 0; k < 4; k++) {
            const w = wArr[k];
            if (w > 0) {
              tempBone.fromArray(boneMatrices, jArr[k] * 16);
              skinnedPt.copy(baseV).applyMatrix4(bindMatInv).applyMatrix4(tempBone);
              worldV.addScaledVector(skinnedPt, w);
            }
          }
          worldPositions[vi] = worldV.applyMatrix4(matrixWorld);
        } else {
          worldPositions[vi] = tempV.clone().applyMatrix4(matrixWorld);
        }
      }

      const n0 = new THREE.Vector3(), n1 = new THREE.Vector3(), n2 = new THREE.Vector3();
      const ndc0 = new THREE.Vector3(), ndc1 = new THREE.Vector3(), ndc2 = new THREE.Vector3();
      const edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3();
      const faceNormal = new THREE.Vector3(), smoothNormal = new THREE.Vector3();
      const center = new THREE.Vector3(), viewDir = new THREE.Vector3();

      const triCount = index ? index.count / 3 : posAttr.count / 3;

      for (let i = 0; i < triCount; i++) {
        const i0 = index ? index.getX(i * 3) : i * 3;
        const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
        const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

        const w0 = worldPositions[i0];
        const w1 = worldPositions[i1];
        const w2 = worldPositions[i2];

        // Backface culling with face normal
        edge1.subVectors(w1, w0);
        edge2.subVectors(w2, w0);
        faceNormal.crossVectors(edge1, edge2).normalize();

        center.set(
          (w0.x + w1.x + w2.x) / 3,
          (w0.y + w1.y + w2.y) / 3,
          (w0.z + w1.z + w2.z) / 3
        );

        viewDir.subVectors(camera.position, center);
        const vDotFaceN = faceNormal.dot(viewDir);
        if (vDotFaceN <= 0.0001) continue;

        // Smooth normal interpolation
        if (normAttr) {
          n0.fromBufferAttribute(normAttr, i0).applyMatrix3(normalMatrix);
          n1.fromBufferAttribute(normAttr, i1).applyMatrix3(normalMatrix);
          n2.fromBufferAttribute(normAttr, i2).applyMatrix3(normalMatrix);
          smoothNormal.set(
            (n0.x + n1.x + n2.x) / 3,
            (n0.y + n1.y + n2.y) / 3,
            (n0.z + n1.z + n2.z) / 3
          ).normalize();
        } else {
          smoothNormal.copy(faceNormal);
        }

        // Project
        ndc0.copy(w0).applyMatrix4(vpMatrix);
        ndc1.copy(w1).applyMatrix4(vpMatrix);
        ndc2.copy(w2).applyMatrix4(vpMatrix);

        // Frustum culling
        if (ndc0.z > 1 && ndc1.z > 1 && ndc2.z > 1) continue;
        if (ndc0.z < -1 && ndc1.z < -1 && ndc2.z < -1) continue;

        const sx0 = ((ndc0.x + 1) * width) / 2;
        const sy0 = ((1 - ndc0.y) * height) / 2;
        const sx1 = ((ndc1.x + 1) * width) / 2;
        const sy1 = ((1 - ndc1.y) * height) / 2;
        const sx2 = ((ndc2.x + 1) * width) / 2;
        const sy2 = ((1 - ndc2.y) * height) / 2;

        const avgDepth = (ndc0.z + ndc1.z + ndc2.z) / 3;

        // Cel-Shading & Rim calculations
        viewDir.normalize();
        const nDotL = Math.max(0, smoothNormal.dot(keyLight));
        const vDotN = Math.max(0, smoothNormal.dot(viewDir));

        let toonStep = 0.55;
        if (nDotL > 0.55) {
          toonStep = 1.0;
        } else if (nDotL > 0.20) {
          toonStep = 0.80;
        }

        const isRim = vDotN < 0.35 && rimIntensity > 0;
        const rimFactor = Math.pow(1 - vDotN, 2.5) * rimIntensity;

        if (hasTexture && uvAttr && texCanvas) {
          const flipY = texture ? texture.flipY : true;
          const u0 = uvAttr.getX(i0) * texW;
          const t0 = (flipY ? (1 - uvAttr.getY(i0)) : uvAttr.getY(i0)) * texH;
          const u1 = uvAttr.getX(i1) * texW;
          const t1 = (flipY ? (1 - uvAttr.getY(i1)) : uvAttr.getY(i1)) * texH;
          const u2 = uvAttr.getX(i2) * texW;
          const t2 = (flipY ? (1 - uvAttr.getY(i2)) : uvAttr.getY(i2)) * texH;

          let shadowAlpha = 0.0;
          if (nDotL < 0.25) shadowAlpha = 0.35;
          else if (nDotL < 0.55) shadowAlpha = 0.18;

          renderTriangles.push({
            p0: [sx0, sy0],
            p1: [sx1, sy1],
            p2: [sx2, sy2],
            depth: avgDepth,
            renderOrder: rOrder,
            textureCanvas: texCanvas,
            s0: [u0, t0],
            s1: [u1, t1],
            s2: [u2, t2],
            texW,
            texH,
            shadowAlpha,
            isRim,
            rimColor: rimColorHex
          });
        } else {
          // Solid Cel-Shaded color
          let r = Math.floor(baseColor.r * 255);
          let g = Math.floor(baseColor.g * 255);
          let b = Math.floor(baseColor.b * 255);

          if (!isBasic) {
            const lightFactor = ambientIntensity + toonStep * (1.0 - ambientIntensity);
            const halfVec = new THREE.Vector3().addVectors(keyLight, viewDir).normalize();
            const specDot = Math.max(0, smoothNormal.dot(halfVec));
            const specFactor = Math.pow(specDot, 28) * 0.35;

            r = Math.min(255, Math.floor((baseColor.r * lightFactor + rimFactor * 0.4 + specFactor) * 255));
            g = Math.min(255, Math.floor((baseColor.g * lightFactor + rimFactor * 0.5 + specFactor) * 255));
            b = Math.min(255, Math.floor((baseColor.b * lightFactor + rimFactor * 0.7 + specFactor) * 255));
          }

          renderTriangles.push({
            p0: [sx0, sy0],
            p1: [sx1, sy1],
            p2: [sx2, sy2],
            depth: avgDepth,
            renderOrder: rOrder,
            fillColor: `rgb(${r},${g},${b})`
          });
        }
      }
    });

    // Depth Sorting (Painter's algorithm: renderOrder ascending, then depth back-to-front)
    renderTriangles.sort((a, b) => {
      const roA = a.renderOrder ?? 0;
      const roB = b.renderOrder ?? 0;
      if (roA !== roB) {
        return roA - roB;
      }
      return b.depth - a.depth;
    });

    // Rasterize all triangles
    for (const tri of renderTriangles) {
      const { p0, p1, p2, fillColor, textureCanvas, s0, s1, s2, texW, texH, shadowAlpha, isRim, rimColor } = tri;

      if (textureCanvas && s0 && s1 && s2 && texW && texH) {
        const sx1 = s1[0] - s0[0], sy1 = s1[1] - s0[1];
        const sx2 = s2[0] - s0[0], sy2 = s2[1] - s0[1];
        const det = sx1 * sy2 - sx2 * sy1;
        if (Math.abs(det) < 0.001) continue;

        const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1];
        const dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];

        const a = (dx1 * sy2 - dx2 * sy1) / det;
        const b = (dy1 * sy2 - dy2 * sy1) / det;
        const c = (dx2 * sx1 - dx1 * sx2) / det;
        const d = (dy2 * sx1 - dy1 * sx2) / det;

        ctx.save();
        ctx.beginPath();
        const cx = (p0[0] + p1[0] + p2[0]) / 3;
        const cy = (p0[1] + p1[1] + p2[1]) / 3;
        const pts = [p0, p1, p2];
        pts.forEach((pt, j) => {
          const len = Math.hypot(pt[0] - cx, pt[1] - cy) || 1;
          const x = pt[0] + ((pt[0] - cx) / len) * 0.45;
          const y = pt[1] + ((pt[1] - cy) / len) * 0.45;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.clip();

        ctx.transform(a, b, c, d, p0[0] - a * s0[0] - c * s0[1], p0[1] - b * s0[0] - d * s0[1]);

        const minX = Math.max(0, Math.floor(Math.min(s0[0], s1[0], s2[0]) - 1));
        const minY = Math.max(0, Math.floor(Math.min(s0[1], s1[1], s2[1]) - 1));
        const maxX = Math.min(texW, Math.ceil(Math.max(s0[0], s1[0], s2[0]) + 1));
        const maxY = Math.min(texH, Math.ceil(Math.max(s0[1], s1[1], s2[1]) + 1));

        ctx.drawImage(textureCanvas, minX, minY, maxX - minX, maxY - minY, minX, minY, maxX - minX, maxY - minY);

        if (shadowAlpha && shadowAlpha > 0) {
          ctx.fillStyle = `rgba(15, 20, 35, ${shadowAlpha})`;
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        }

        if (isRim && rimColor) {
          ctx.fillStyle = rimColor;
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        }

        ctx.restore();
      } else if (fillColor) {
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // Cartoon ink outline post-processing (if enabled)
    if (options.enableOutlines) {
      // In Skia Canvas, can stroke boundaries or add silhouette
    }

    return canvas.toBuffer("image/png");
  }
}
