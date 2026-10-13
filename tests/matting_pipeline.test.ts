import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  removeBorderBackground,
  computeBoundingBox,
  cropToBoundingBox,
  MattingPipeline
} from "../src/assets/index.js";

describe("Matting Pipeline & Alpha Bounding Box Cropper (TASK-106)", () => {
  /**
   * Helper to create a test 100x100 image with:
   * - Pure white background (#FFFFFF)
   * - A red rectangle in the center (x: 20..80, y: 20..80)
   * - An enclosed white circle/dot inside the red rectangle (x: 45..55, y: 45..55)
   */
  async function createTestImage(): Promise<Buffer> {
    const width = 100;
    const height = 100;
    const data = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        // Default white background
        let r = 255;
        let g = 255;
        let b = 255;

        // Red outer body
        if (x >= 20 && x <= 80 && y >= 20 && y <= 80) {
          r = 255;
          g = 0;
          b = 0;

          // Internal white spot (like white robes or teeth)
          if (x >= 45 && x <= 55 && y >= 45 && y <= 55) {
            r = 255;
            g = 255;
            b = 255;
          }
        }

        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255; // Fully opaque
      }
    }

    return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }

  it("should remove outer background while preserving internal matching colors", async () => {
    const inputBuffer = await createTestImage();
    const { buffer: processed } = await removeBorderBackground(inputBuffer, {
      targetColor: [255, 255, 255],
      tolerance: 10
    });

    const { data } = await sharp(processed).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    // Check corner (0, 0) is transparent
    expect(data[3]).toBe(0);

    // Check border (5, 5) is transparent
    const borderOffset = (5 * 100 + 5) * 4;
    expect(data[borderOffset + 3]).toBe(0);

    // Check red body (30, 30) is opaque
    const redOffset = (30 * 100 + 30) * 4;
    expect(data[redOffset]).toBe(255);
    expect(data[redOffset + 1]).toBe(0);
    expect(data[redOffset + 3]).toBe(255);

    // Crucial check: Enclosed internal white spot (50, 50) is STILL OPAQUE!
    const internalWhiteOffset = (50 * 100 + 50) * 4;
    expect(data[internalWhiteOffset]).toBe(255);
    expect(data[internalWhiteOffset + 1]).toBe(255);
    expect(data[internalWhiteOffset + 2]).toBe(255);
    expect(data[internalWhiteOffset + 3]).toBe(255); // Opaque! Not erased!
  });

  it("should compute accurate tight bounding box", async () => {
    const inputBuffer = await createTestImage();
    const { buffer: transparent } = await removeBorderBackground(inputBuffer);
    const { bbox } = await computeBoundingBox(transparent, 10);

    // The red rectangle was drawn at x: 20..80, y: 20..80
    expect(bbox.minX).toBe(20);
    expect(bbox.minY).toBe(20);
    expect(bbox.maxX).toBe(80);
    expect(bbox.maxY).toBe(80);
    expect(bbox.width).toBe(61);
    expect(bbox.height).toBe(61);
  });

  it("should crop to bounding box and assign anchor points correctly", async () => {
    const inputBuffer = await createTestImage();
    const { buffer: transparent } = await removeBorderBackground(inputBuffer);

    const cropped = await cropToBoundingBox(transparent, {
      padding: 0,
      anchorMode: "bottom_center"
    });

    expect(cropped.croppedWidth).toBe(61);
    expect(cropped.croppedHeight).toBe(61);
    expect(cropped.anchorX).toBe(0.5);
    expect(cropped.anchorY).toBe(1.0);
  });

  it("should execute end-to-end MattingPipeline.processBuffer", async () => {
    const inputBuffer = await createTestImage();
    const result = await MattingPipeline.processBuffer(inputBuffer, {
      cropping: { padding: 4, anchorMode: "center" }
    });

    expect(result.croppedWidth).toBe(61 + 8); // 61 + 4*2
    expect(result.croppedHeight).toBe(61 + 8);
    expect(result.anchorX).toBe(0.5);
    expect(result.anchorY).toBe(0.5);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
