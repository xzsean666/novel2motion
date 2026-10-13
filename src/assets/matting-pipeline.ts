import sharp from "sharp";

export interface MattingOptions {
  /** Target background color to remove in [R, G, B]. Defaults to white [255, 255, 255]. */
  targetColor?: [number, number, number];
  /** Color matching tolerance (0-255). Default 25. */
  tolerance?: number;
  /** Feather radius for soft edge blending (0-5). Default 1. */
  featherRadius?: number;
}

/**
 * Removes background using perimeter flood-fill to preserve internal matching colors
 * (e.g. white robes, teeth, sclera inside a character on a white background).
 */
export async function removeBorderBackground(
  imageBuffer: Buffer,
  options: MattingOptions = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const tolerance = options.tolerance ?? 25;
  const targetColor = options.targetColor ?? [255, 255, 255];
  const [tr, tg, tb] = targetColor;

  // Convert to raw RGBA buffer
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const isBg = new Uint8Array(totalPixels);

  const colorDistanceSq = (r: number, g: number, b: number): number => {
    const dr = r - tr;
    const dg = g - tg;
    const db = b - tb;
    return dr * dr + dg * dg + db * db;
  };

  const tolSq = tolerance * tolerance * 3;

  // Queue for BFS flood fill from the borders
  const queue = new Int32Array(totalPixels);
  let queueHead = 0;
  let queueTail = 0;

  const pushIfMatch = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;

    const offset = idx * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    if (colorDistanceSq(r, g, b) <= tolSq) {
      isBg[idx] = 1;
      queue[queueTail++] = idx;
    }
  };

  // Seed with all 4 perimeter borders
  for (let x = 0; x < width; x++) {
    pushIfMatch(x, 0);
    pushIfMatch(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfMatch(0, y);
    pushIfMatch(width - 1, y);
  }

  // 4-way BFS expansion
  while (queueHead < queueTail) {
    const currentIdx = queue[queueHead++];
    const cx = currentIdx % width;
    const cy = Math.floor(currentIdx / width);

    // Neighbors: Up, Down, Left, Right
    if (cx > 0) pushIfMatch(cx - 1, cy);
    if (cx < width - 1) pushIfMatch(cx + 1, cy);
    if (cy > 0) pushIfMatch(cx, cy - 1);
    if (cy < height - 1) pushIfMatch(cx, cy + 1);
  }

  // Apply transparency to identified background pixels
  for (let i = 0; i < totalPixels; i++) {
    if (isBg[i]) {
      data[i * 4 + 3] = 0; // Alpha = 0
    }
  }

  // Re-encode back to PNG buffer
  const processedBuffer = await sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  return {
    buffer: processedBuffer,
    width,
    height
  };
}
