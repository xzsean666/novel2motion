import sharp from "sharp";

export interface ImageClient {
  generate(prompt: string, type: "character" | "background"): Promise<Buffer>;
}

/**
 * Mock Image Client for offline testing, local CI, and fallback rendering.
 * Synthesizes valid PNGs matching the required format (white background for characters).
 */
export class MockImageClient implements ImageClient {
  async generate(_prompt: string, type: "character" | "background"): Promise<Buffer> {
    if (type === "character") {
      // 200x400 canvas with pure white background and colored character body
      const width = 200;
      const height = 400;
      const data = Buffer.alloc(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          let r = 255;
          let g = 255;
          let b = 255;

          // Central cultivator silhouette
          if (x >= 50 && x <= 150 && y >= 60 && y <= 350) {
            r = 60;
            g = 120;
            b = 210; // Blue Daoist robe
          }

          data[offset] = r;
          data[offset + 1] = g;
          data[offset + 2] = b;
          data[offset + 3] = 255;
        }
      }

      return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
    } else {
      // 1920x1080 landscape background with dark purple/indigo sky gradient
      const width = 640;
      const height = 360;
      const data = Buffer.alloc(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          const ratio = y / height;
          data[offset] = Math.round(25 + ratio * 30); // R
          data[offset + 1] = Math.round(15 + ratio * 20); // G
          data[offset + 2] = Math.round(60 + ratio * 70); // B
          data[offset + 3] = 255;
        }
      }

      return sharp(data, { raw: { width, height, channels: 4 } })
        .resize(1920, 1080)
        .png()
        .toBuffer();
    }
  }
}

/**
 * HTTP Image Client for external AI generation APIs (OpenAI DALL-E, Stability, ComfyUI).
 */
export class HttpImageClient implements ImageClient {
  constructor(
    private readonly endpointUrl: string,
    private readonly apiKey?: string
  ) {}

  async generate(prompt: string, type: "character" | "background"): Promise<Buffer> {
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        prompt,
        size: type === "character" ? "1024x1792" : "1792x1024",
        response_format: "b64_json"
      })
    });

    if (!response.ok) {
      throw new Error(`AI Image Generation failed with status ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("No b64_json returned from Image Generation API");
    }

    return Buffer.from(b64, "base64");
  }
}
