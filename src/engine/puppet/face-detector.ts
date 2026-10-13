import { createCanvas, type Image } from "@napi-rs/canvas";
import type { FaceRoiConfig } from "./face-animator.js";

const ROI_CACHE = new Map<string, FaceRoiConfig>();

/**
 * Pre-calibrated accurate ROIs for built-in models
 */
export const CALIBRATED_FACE_ROIS: Record<string, FaceRoiConfig> = {
  han_tianzun: {
    headCenterY: -0.83,
    mouthY: -0.7933,
    mouthX: -0.0358,
    mouthWidth: 26,
    eyesY: -0.828,
    eyeSpan: 36,
    eyeSize: 14,
    foreheadY: -0.852,
    templeX: 32,
    skinColor: "#fae3d2"
  },
  evil_lord: {
    headCenterY: -0.75,
    mouthY: -0.7021,
    mouthX: -0.1895,
    mouthWidth: 24,
    eyesY: -0.738,
    eyeSpan: 32,
    eyeSize: 14,
    foreheadY: -0.765,
    templeX: 28,
    skinColor: "#dfd6e2"
  },
  hero_m: {
    headCenterY: -0.82,
    mouthY: -0.7856,
    mouthX: -0.0065,
    mouthWidth: 24,
    eyesY: -0.816,
    eyeSpan: 38,
    eyeSize: 15,
    foreheadY: -0.842,
    templeX: 32,
    skinColor: "#fbe6d8"
  },
  hero_f: {
    headCenterY: -0.80,
    mouthY: -0.760,
    mouthX: 0.0,
    mouthWidth: 22,
    eyesY: -0.790,
    eyeSpan: 36,
    eyeSize: 15,
    foreheadY: -0.825,
    templeX: 30,
    skinColor: "#fbe6d8"
  },
  common_disciple: {
    headCenterY: -0.82,
    mouthY: -0.7856,
    mouthX: -0.0065,
    mouthWidth: 24,
    eyesY: -0.816,
    eyeSpan: 38,
    eyeSize: 15,
    foreheadY: -0.842,
    templeX: 32,
    skinColor: "#fbe6d8"
  },
  common_guard: {
    headCenterY: -0.80,
    mouthY: -0.760,
    mouthX: 0.0,
    mouthWidth: 22,
    eyesY: -0.790,
    eyeSpan: 36,
    eyeSize: 15,
    foreheadY: -0.825,
    templeX: 30,
    skinColor: "#fbe6d8"
  },
  meme_rooster: {
    headCenterY: -0.68,
    mouthY: -0.58,
    mouthX: 0.18,
    mouthWidth: 26,
    eyesY: -0.65,
    eyeSpan: 44,
    eyeSize: 20,
    foreheadY: -0.70,
    templeX: 36,
    skinColor: "#ffe680"
  },
  default: {
    headCenterY: -0.80,
    mouthY: -0.75,
    mouthX: 0,
    mouthWidth: 22,
    eyesY: -0.78,
    eyeSpan: 40,
    eyeSize: 15,
    foreheadY: -0.83,
    templeX: 35,
    skinColor: "#fce4cf"
  }
};

/**
 * Generic Face & Mouth Detector.
 * Automatically scans any character image with transparent background,
 * locates the head skin cluster, samples the skin tone, and calculates
 * the mouth coordinates and facing direction.
 */
export class FaceDetector {
  /**
   * Resolves FaceRoiConfig for a character image, using calibrated config if available,
   * or dynamically analyzing the image pixels.
   */
  public static getOrDetectRoi(characterId: string, img?: Image): FaceRoiConfig {
    for (const [key, roi] of Object.entries(CALIBRATED_FACE_ROIS)) {
      if (characterId.includes(key)) {
        return roi;
      }
    }

    const cacheKey = img ? `${characterId}:${img.width}:${img.height}` : characterId;
    if (ROI_CACHE.has(cacheKey)) {
      return ROI_CACHE.get(cacheKey)!;
    }

    if (!img) {
      return CALIBRATED_FACE_ROIS.default;
    }

    const detected = this.analyzeImage(img);
    ROI_CACHE.set(cacheKey, detected);
    return detected;
  }

  /**
   * Scans image pixels to detect facial features and mouth position
   */
  public static analyzeImage(img: Image): FaceRoiConfig {
    const width = img.width;
    const height = img.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Find character visible bounding box
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX >= maxX || minY >= maxY) {
      // Empty image fallback
      return { ...CALIBRATED_FACE_ROIS.han_tianzun };
    }

    const charH = maxY - minY;
    const headTop = Math.floor(minY + charH * 0.04);
    const headBottom = Math.floor(minY + charH * 0.32);

    // 2. Identify skin cluster in the head region
    let skinCount = 0;
    let sumSkinX = 0;
    let sumSkinY = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let skinMinX = width;
    let skinMaxX = 0;
    let skinMinY = height;
    let skinMaxY = 0;

    for (let y = headTop; y <= headBottom; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 180) {
          // Anime skin tone heuristic
          const isSkin =
            r > 150 &&
            g > 110 &&
            b > 80 &&
            r >= g &&
            g >= b &&
            r - b > 15 &&
            r - b < 120;

          if (isSkin) {
            skinCount++;
            sumSkinX += x;
            sumSkinY += y;
            sumR += r;
            sumG += g;
            sumB += b;
            if (x < skinMinX) skinMinX = x;
            if (x > skinMaxX) skinMaxX = x;
            if (y < skinMinY) skinMinY = y;
            if (y > skinMaxY) skinMaxY = y;
          }
        }
      }
    }

    const facePixelX = skinCount > 0 ? sumSkinX / skinCount : width / 2;
    const facePixelY = skinCount > 0 ? sumSkinY / skinCount : headTop + (headBottom - headTop) * 0.5;

    const skinColor =
      skinCount > 0
        ? "#" +
          [sumR / skinCount, sumG / skinCount, sumB / skinCount]
            .map((v) => Math.round(v).toString(16).padStart(2, "0"))
            .join("")
        : "#fae3d2";

    // 3. Find mouth line: search lower 40% of face skin cluster for darkest horizontal line
    const mouthSearchTop = Math.floor(skinMinY + (skinMaxY - skinMinY) * 0.55);
    const mouthSearchBottom = Math.min(height - 1, Math.floor(skinMaxY + (skinMaxY - skinMinY) * 0.15));
    let minLum = 999;
    let mouthPixelX = facePixelX;
    let mouthPixelY = facePixelY + 25;

    for (let y = mouthSearchTop; y <= mouthSearchBottom; y++) {
      for (let x = Math.max(0, skinMinX - 10); x <= Math.min(width - 1, skinMaxX + 10); x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 180) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < minLum && lum < 150) {
            minLum = lum;
            mouthPixelX = x;
            mouthPixelY = y;
          }
        }
      }
    }

    // Convert pixel coordinates to normalized offsets relative to (width / 2, height)
    const mouthXOffset = (mouthPixelX - width / 2) / height;
    const mouthYOffset = (mouthPixelY - height) / height;

    const eyesPixelY = Math.max(minY, mouthPixelY - charH * 0.055);
    const eyesYOffset = (eyesPixelY - height) / height;
    const foreheadPixelY = Math.max(minY, eyesPixelY - charH * 0.025);
    const foreheadYOffset = (foreheadPixelY - height) / height;

    return {
      headCenterY: (headTop + (headBottom - headTop) * 0.5 - height) / height,
      mouthY: mouthYOffset,
      mouthX: mouthXOffset,
      mouthWidth: Math.max(18, Math.round(charH * 0.025)),
      eyesY: eyesYOffset,
      eyeSpan: Math.max(26, Math.round(charH * 0.035)),
      eyeSize: Math.max(12, Math.round(charH * 0.015)),
      foreheadY: foreheadYOffset,
      templeX: Math.max(24, Math.round(charH * 0.03)),
      skinColor
    };
  }
}
