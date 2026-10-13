import { GlobalFonts, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

export type SubtitleStyleType = "calligraphy_gold" | "shout_red" | "narration_white";

export interface RasterizeOptions {
  fontSize?: number; // In pixels (default: 72)
  maxWidth?: number; // In pixels (default: 960 for 1080w screen)
  style?: SubtitleStyleType;
  speakerName?: string;
  outlineWidth?: number; // In pixels (default: 12)
}

export interface RasterizedSubtitle {
  texture: THREE.DataTexture;
  width: number;
  height: number;
}

/**
 * FontRasterizer: Renders ultra-sharp calligraphy Chinese text with 3-layer rendering:
 * Shadow -> Thick Black Outline -> Radiant Golden Gradient Fill
 */
export class FontRasterizer {
  private static fontRegistered = false;
  private static fontFamily = "MaShanZheng";

  /**
   * Ensure local TTF fonts are registered with Skia Canvas
   */
  static ensureFonts(): void {
    if (this.fontRegistered) return;

    const baseDir = path.resolve(process.cwd(), "assets/fonts");
    const primaryFont = path.join(baseDir, "MaShanZheng-Regular.ttf");
    const altFont = path.join(baseDir, "ZCOOLKuaiLe-Regular.ttf");

    if (fs.existsSync(primaryFont)) {
      GlobalFonts.registerFromPath(primaryFont, "MaShanZheng");
      this.fontFamily = "MaShanZheng";
    } else if (fs.existsSync(altFont)) {
      GlobalFonts.registerFromPath(altFont, "ZCOOLKuaiLe");
      this.fontFamily = "ZCOOLKuaiLe";
    } else {
      this.fontFamily = "sans-serif";
    }

    this.fontRegistered = true;
  }

  /**
   * Rasterize subtitle text to a Three.js DataTexture
   */
  static rasterize(text: string, options: RasterizeOptions = {}): RasterizedSubtitle {
    this.ensureFonts();

    const fontSize = options.fontSize ?? 72;
    const outlineWidth = options.outlineWidth ?? 12;
    const style = options.style ?? "calligraphy_gold";
    const speaker = options.speakerName ? `【${options.speakerName}】` : "";
    const fullText = speaker ? `${speaker} ${text}` : text;

    // Canvas size (high-res buffer)
    const canvasWidth = 1000;
    const canvasHeight = 180;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Setup font
    ctx.font = `bold ${fontSize}px "${this.fontFamily}", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // 1. Layer 1: Drop Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    ctx.strokeText(fullText, centerX, centerY);
    ctx.restore();

    // 2. Layer 2: Heavy Black Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    ctx.strokeText(fullText, centerX, centerY);

    // 3. Layer 3: Vivid Gradient Fill
    let fillStyle: string | CanvasGradient = "#FFE600";
    if (style === "calligraphy_gold") {
      const grad = ctx.createLinearGradient(0, centerY - fontSize / 2, 0, centerY + fontSize / 2);
      grad.addColorStop(0.0, "#FFF7A0"); // Bright gold highlight
      grad.addColorStop(0.4, "#FFD700"); // Rich gold
      grad.addColorStop(1.0, "#FF9900"); // Warm amber gold
      fillStyle = grad;
    } else if (style === "shout_red") {
      const grad = ctx.createLinearGradient(0, centerY - fontSize / 2, 0, centerY + fontSize / 2);
      grad.addColorStop(0.0, "#FFAAAA");
      grad.addColorStop(0.5, "#FF2222");
      grad.addColorStop(1.0, "#990000");
      fillStyle = grad;
    } else if (style === "narration_white") {
      fillStyle = "#FFFFFF";
    }

    ctx.fillStyle = fillStyle as any;
    ctx.fillText(fullText, centerX, centerY);

    // Extract raw RGBA buffer into Three.js DataTexture
    const rawBuffer = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
    const texture = new THREE.DataTexture(
      new Uint8Array(rawBuffer),
      canvasWidth,
      canvasHeight,
      THREE.RGBAFormat
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return {
      texture,
      width: canvasWidth,
      height: canvasHeight
    };
  }
}
