import sharp from "sharp";

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CropOptions {
  alphaThreshold?: number;
  padding?: number;
  anchorMode?: "bottom_center" | "center";
}

export interface CropResult {
  buffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  bbox: BoundingBox;
  anchorX: number;
  anchorY: number;
}

/**
 * Computes tight bounding box of non-transparent pixels in an RGBA image.
 */
export async function computeBoundingBox(
  imageBuffer: Buffer,
  alphaThreshold = 10
): Promise<{ bbox: BoundingBox; width: number; height: number }> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If entire image is transparent, return full canvas
  if (maxX === -1) {
    return {
      bbox: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1, width, height },
      width,
      height
    };
  }

  return {
    bbox: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    },
    width,
    height
  };
}

/**
 * Crops image to its tight bounding box and computes standard anchor coordinates.
 */
export async function cropToBoundingBox(
  imageBuffer: Buffer,
  options: CropOptions = {}
): Promise<CropResult> {
  const alphaThreshold = options.alphaThreshold ?? 10;
  const padding = options.padding ?? 8;
  const anchorMode = options.anchorMode ?? "bottom_center";

  const { bbox, width, height } = await computeBoundingBox(imageBuffer, alphaThreshold);

  // Apply padding constrained to original image bounds
  const left = Math.max(0, bbox.minX - padding);
  const top = Math.max(0, bbox.minY - padding);
  const right = Math.min(width - 1, bbox.maxX + padding);
  const bottom = Math.min(height - 1, bbox.maxY + padding);

  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;

  const croppedBuffer = await sharp(imageBuffer)
    .extract({
      left,
      top,
      width: croppedWidth,
      height: croppedHeight
    })
    .png()
    .toBuffer();

  const anchorX = 0.5;
  const anchorY = anchorMode === "bottom_center" ? 1.0 : 0.5;

  return {
    buffer: croppedBuffer,
    originalWidth: width,
    originalHeight: height,
    croppedWidth,
    croppedHeight,
    bbox,
    anchorX,
    anchorY
  };
}
