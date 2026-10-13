import * as THREE from "three";
import sharp from "sharp";
import fs from "node:fs";

export type ExpressionType = "normal" | "shocked" | "angry" | "hurt" | "battle" | "happy" | "smug";

export interface ExpressionEntry {
  expression: ExpressionType;
  assetPath: string;
}

/**
 * ExpressionTextureManager: loads and caches PNG face textures as Three.js DataTextures in Node.js
 */
export class ExpressionTextureManager {
  private static readonly textureCache = new Map<string, THREE.DataTexture>();

  /**
   * Load an image file into a Three.js DataTexture using Sharp
   */
  static async loadTextureFromFile(filePath: string): Promise<THREE.DataTexture> {
    if (this.textureCache.has(filePath)) {
      return this.textureCache.get(filePath)!;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Expression texture not found: ${filePath}`);
    }

    const { data, info } = await sharp(filePath)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const texture = new THREE.DataTexture(
      new Uint8Array(data),
      info.width,
      info.height,
      THREE.RGBAFormat
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    this.textureCache.set(filePath, texture);
    return texture;
  }

  /**
   * Create a procedural solid or colored pattern texture (useful for tests or fallback)
   */
  static createProceduralFaceTexture(
    expression: ExpressionType | string,
    width = 128,
    height = 128
  ): THREE.DataTexture {
    const cacheKey = `procedural_${expression}_${width}x${height}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const buffer = new Uint8Array(width * height * 4);
    // Distinct base tones depending on emotion
    let r = 255, g = 224, b = 189; // Normal warm skin
    if (expression === "shocked") {
      r = 240; g = 240; b = 255; // Pale shocked white-blue
    } else if (expression === "angry") {
      r = 255; g = 140; b = 140; // Flushed red anger
    } else if (expression === "hurt") {
      r = 210; g = 200; b = 240; // Bruised purple-grey
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(buffer, width, height, THREE.RGBAFormat);
    texture.name = "procedural_fallback";
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * Clear all cached textures and dispose GPU memory
   */
  static clearCache(): void {
    for (const tex of this.textureCache.values()) {
      tex.dispose();
    }
    this.textureCache.clear();
  }
}
