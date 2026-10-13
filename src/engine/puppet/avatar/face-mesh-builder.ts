import type { SKRSContext2D } from "@napi-rs/canvas";
import type { FaceSpec, FaceStyle, VisemeType } from "../../../core/models/modular-character.js";

export interface FaceRenderContext {
  timeMs: number;
  isSpeaking: boolean;
  activeViseme?: VisemeType;
  visemeOpenness?: number; // 0..1
  expression?: string;
  headScale: number; // In pixels (e.g. 120)
}

/**
 * Multi-Style Procedural Facial Mesh & Lip-Sync Engine:
 * Renders distinct facial art styles (Xianxia, Anime, Donghua, Chibi)
 * with dynamic phonetic mouth movements, natural blinking, and micro-expressions.
 */
export class FaceMeshBuilder {
  /**
   * Main entrypoint to render face features onto Canvas context
   */
  static renderFace(ctx: SKRSContext2D, face: FaceSpec, options: FaceRenderContext): void {
    const { headScale, timeMs, isSpeaking, expression = "normal" } = options;
    const style = face.style || "xianxia_real";

    ctx.save();

    // 1. Face contour base (if rendering full face mesh)
    this.renderContour(ctx, face, style, headScale);

    // 2. Eyebrows
    this.renderEyebrows(ctx, face, style, headScale, expression);

    // 3. Eyes & Dynamic Blinking
    this.renderEyes(ctx, face, style, headScale, timeMs, expression);

    // 4. Nose
    if (face.nose.visible) {
      this.renderNose(ctx, face, style, headScale);
    }

    // 5. Dynamic Lip-Sync Mouth
    const viseme = options.activeViseme || face.mouth.currentViseme || (isSpeaking ? "a" : "silence");
    const openness = options.visemeOpenness !== undefined
      ? options.visemeOpenness
      : isSpeaking
      ? Math.abs(Math.sin(timeMs * 0.015)) * 0.85 + 0.15
      : 0;

    this.renderVisemeMouth(ctx, face, style, headScale, viseme, openness, expression);

    // 6. Micro-expressions overlays
    this.renderMicroExpressions(ctx, face, headScale, timeMs, expression);

    ctx.restore();
  }

  /**
   * 1. Face Contour
   */
  private static renderContour(ctx: SKRSContext2D, face: FaceSpec, style: FaceStyle, scale: number): void {
    ctx.save();

    const w = scale * 0.85;
    const h = scale * 1.05;

    // Cel-shaded anime skin gradient
    const skinGrad = ctx.createRadialGradient(0, -h * 0.15, scale * 0.1, 0, 0, scale * 0.7);
    skinGrad.addColorStop(0, "#fff5ee");
    skinGrad.addColorStop(0.65, face.skinTone || "#f6dfd3");
    skinGrad.addColorStop(1, "#eed0c0");
    ctx.fillStyle = skinGrad;

    ctx.beginPath();
    if (style === "chibi_comedy") {
      // Round squishy face
      ctx.ellipse(0, 0, w * 0.58, h * 0.48, 0, 0, Math.PI * 2);
    } else if (style === "donghua_action") {
      // Sharp chiseled jawline
      ctx.moveTo(-w * 0.48, -h * 0.35);
      ctx.quadraticCurveTo(-w * 0.48, h * 0.1, -w * 0.32, h * 0.35);
      ctx.lineTo(0, h * 0.52);
      ctx.lineTo(w * 0.32, h * 0.35);
      ctx.quadraticCurveTo(w * 0.48, h * 0.1, w * 0.48, -h * 0.35);
      ctx.quadraticCurveTo(0, -h * 0.52, -w * 0.48, -h * 0.35);
    } else if (style === "anime_modern") {
      // Petite V-shape jaw
      ctx.moveTo(-w * 0.45, -h * 0.35);
      ctx.quadraticCurveTo(-w * 0.46, h * 0.12, -w * 0.22, h * 0.38);
      ctx.lineTo(0, h * 0.48);
      ctx.lineTo(w * 0.22, h * 0.38);
      ctx.quadraticCurveTo(w * 0.46, h * 0.12, w * 0.45, -h * 0.35);
      ctx.quadraticCurveTo(0, -h * 0.48, -w * 0.45, -h * 0.35);
    } else {
      // Xianxia elegant oval (凤仪仙姿)
      ctx.moveTo(-w * 0.44, -h * 0.38);
      ctx.quadraticCurveTo(-w * 0.45, h * 0.15, -w * 0.25, h * 0.42);
      ctx.lineTo(0, h * 0.51);
      ctx.lineTo(w * 0.25, h * 0.42);
      ctx.quadraticCurveTo(w * 0.45, h * 0.15, w * 0.44, -h * 0.38);
      ctx.quadraticCurveTo(0, -h * 0.50, -w * 0.44, -h * 0.38);
    }
    ctx.closePath();
    ctx.fill();

    // Soft peach blush on both cheeks
    [-1, 1].forEach((dir) => {
      ctx.save();
      const blushGrad = ctx.createRadialGradient(
        dir * scale * 0.25,
        scale * 0.08,
        2,
        dir * scale * 0.25,
        scale * 0.08,
        scale * 0.16
      );
      blushGrad.addColorStop(0, "rgba(251, 146, 178, 0.32)");
      blushGrad.addColorStop(1, "rgba(251, 146, 178, 0)");
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.arc(dir * scale * 0.25, scale * 0.08, scale * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Subtle edge jaw shadow for 3D depth
    ctx.strokeStyle = "rgba(180, 120, 110, 0.22)";
    ctx.lineWidth = Math.max(1, scale * 0.015);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 2. Eyebrows
   */
  private static renderEyebrows(
    ctx: SKRSContext2D,
    face: FaceSpec,
    style: FaceStyle,
    scale: number,
    expression: string
  ): void {
    ctx.save();
    ctx.strokeStyle = face.eyebrows.color || "#161a22";
    ctx.fillStyle = face.eyebrows.color || "#161a22";
    ctx.lineCap = "round";

    const browY = -scale * 0.12;
    const span = scale * 0.24;
    const isAngry = expression === "angry" || expression === "battle";
    const isShocked = expression === "shocked";
    const tilt = isAngry ? 0.25 : isShocked ? -0.15 : 0;

    const thickness = style === "donghua_action" ? scale * 0.035 : style === "chibi_comedy" ? scale * 0.04 : scale * 0.022;

    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * span, browY);
      ctx.rotate(dir * tilt);

      ctx.beginPath();
      if (face.eyebrows.type === "sword_sharp") {
        // Sword-sharp heroic eyebrow (斜飞入鬓剑眉)
        ctx.lineWidth = thickness;
        ctx.moveTo(-dir * scale * 0.08, scale * 0.02);
        ctx.lineTo(0, -scale * 0.01);
        ctx.lineTo(dir * scale * 0.11, -scale * 0.03);
        ctx.stroke();
      } else if (face.eyebrows.type === "willow_leaf") {
        // Willow-leaf delicate arch (如月柳叶眉)
        ctx.lineWidth = thickness * 0.8;
        ctx.moveTo(-dir * scale * 0.08, scale * 0.01);
        ctx.quadraticCurveTo(0, -scale * 0.03, dir * scale * 0.09, scale * 0.01);
        ctx.stroke();
      } else {
        ctx.lineWidth = thickness;
        ctx.moveTo(-dir * scale * 0.07, 0);
        ctx.lineTo(dir * scale * 0.09, -scale * 0.01);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * 3. Eyes & Blinking
   */
  private static renderEyes(
    ctx: SKRSContext2D,
    face: FaceSpec,
    style: FaceStyle,
    scale: number,
    timeMs: number,
    expression: string
  ): void {
    ctx.save();

    // Natural blink: blink every 3.5s for 140ms
    const blinkCycle = timeMs % 3500;
    const isBlinking = blinkCycle < 140 && expression !== "shocked";
    const blinkRatio = isBlinking ? Math.sin((blinkCycle / 140) * Math.PI) : 0;

    const eyeY = -scale * 0.02;
    const span = scale * 0.22;
    const eyeW = style === "anime_modern" ? scale * 0.16 : scale * 0.13;
    const eyeH = (style === "anime_modern" ? scale * 0.14 : scale * 0.09) * (1 - blinkRatio * 0.9);

    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * span, eyeY);

      if (isBlinking && blinkRatio > 0.7) {
        // Closed eye line
        ctx.strokeStyle = "#161a22";
        ctx.lineWidth = scale * 0.024;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-eyeW * 0.5, 0);
        ctx.quadraticCurveTo(0, eyeH * 0.22, eyeW * 0.5, 0);
        ctx.stroke();
      } else {
        // 1. Sclera (White base)
        ctx.fillStyle = face.eyes.scleraColor || "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW * 0.5, eyeH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Soft eyelid shadow under upper lid
        const shadowGrad = ctx.createLinearGradient(0, -eyeH * 0.5, 0, eyeH * 0.15);
        shadowGrad.addColorStop(0, "rgba(160, 140, 160, 0.40)");
        shadowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW * 0.5, eyeH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Iris with two-tone anime crystal gradient
        const irisR = Math.min(eyeW, eyeH) * 0.46;
        const irisGrad = ctx.createLinearGradient(0, -irisR, 0, irisR);
        irisGrad.addColorStop(0, "#0b1120"); // Deep top shadow
        irisGrad.addColorStop(0.55, face.eyes.irisColor || "#1e293b");
        irisGrad.addColorStop(1, "#60a5fa"); // Vibrant lower crystal reflection
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(dir * scale * 0.01, 0, irisR, irisR, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Concentric Dark Pupil
        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.arc(dir * scale * 0.01, 0, irisR * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // 5. Specular Highlights (Primary shine + secondary twinkle)
        if (style === "anime_modern" || style === "xianxia_real") {
          // Main bright star highlight
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(dir * scale * 0.01 - irisR * 0.35, -irisR * 0.35, irisR * 0.28, 0, Math.PI * 2);
          ctx.fill();
          // Secondary lower twinkle
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(dir * scale * 0.01 + irisR * 0.30, irisR * 0.28, irisR * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Eyelash & Winged Eyeliner line
        ctx.strokeStyle = "#090d16";
        ctx.lineWidth = scale * 0.026;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-eyeW * 0.55, -eyeH * 0.1);
        ctx.quadraticCurveTo(0, -eyeH * 0.65, eyeW * 0.55, -eyeH * 0.1);
        ctx.stroke();

        // 7. Double Eyelid Crease
        ctx.strokeStyle = "rgba(50, 40, 50, 0.35)";
        ctx.lineWidth = scale * 0.012;
        ctx.beginPath();
        ctx.moveTo(-eyeW * 0.42, -eyeH * 0.82);
        ctx.quadraticCurveTo(0, -eyeH * 1.05, eyeW * 0.42, -eyeH * 0.82);
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * 4. Nose
   */
  private static renderNose(ctx: SKRSContext2D, face: FaceSpec, style: FaceStyle, scale: number): void {
    ctx.save();
    ctx.strokeStyle = "rgba(160, 100, 90, 0.45)";
    ctx.lineWidth = Math.max(1, scale * 0.014);
    ctx.lineCap = "round";

    const noseY = scale * 0.12;

    if (face.nose.type === "sharp_bridge" || style === "donghua_action") {
      ctx.beginPath();
      ctx.moveTo(scale * 0.01, noseY - scale * 0.06);
      ctx.lineTo(scale * 0.02, noseY);
      ctx.lineTo(-scale * 0.01, noseY + scale * 0.01);
      ctx.stroke();
    } else {
      // Subtle line / dot
      ctx.beginPath();
      ctx.moveTo(0, noseY - scale * 0.02);
      ctx.lineTo(scale * 0.015, noseY);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 5. Speech Viseme Mouth (Lip-sync phonemes: silence, a, i, u, e, o, m)
   */
  private static renderVisemeMouth(
    ctx: SKRSContext2D,
    face: FaceSpec,
    style: FaceStyle,
    scale: number,
    viseme: VisemeType,
    openness: number,
    expression: string
  ): void {
    ctx.save();
    const mouthY = scale * 0.28;
    const baseW = scale * 0.14;
    const lipColor = face.mouth.lipColor || "#c27171";

    ctx.translate(0, mouthY);

    if (viseme === "silence" || openness < 0.05) {
      // Closed natural lips (优雅合唇)
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = Math.max(1.2, scale * 0.018);
      ctx.beginPath();
      const smile = expression === "smug" ? -scale * 0.02 : 0;
      ctx.moveTo(-baseW * 0.5, 0);
      ctx.quadraticCurveTo(0, scale * 0.015, baseW * 0.5, smile);
      ctx.stroke();

      // Lower lip subtle sheen
      ctx.fillStyle = "rgba(255, 230, 230, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, scale * 0.02, baseW * 0.25, scale * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Dynamic open viseme phonemes
      let openW = baseW;
      let openH = scale * 0.08 * openness;

      switch (viseme) {
        case "a": // Wide open "Ah"
          openW = baseW * (1.1 + openness * 0.2);
          openH = scale * 0.12 * openness;
          break;
        case "i": // Stretched wide "Ee"
          openW = baseW * (1.3 + openness * 0.2);
          openH = scale * 0.05 * openness;
          break;
        case "u": // Pursed narrow "Oo"
          openW = baseW * 0.65;
          openH = scale * 0.07 * openness;
          break;
        case "o": // Vertical round "Oh"
          openW = baseW * 0.85;
          openH = scale * 0.13 * openness;
          break;
        case "e": // Half-open "Eh"
          openW = baseW * 1.05;
          openH = scale * 0.08 * openness;
          break;
        case "m": // Compressed closed "Mm"
          openW = baseW * 0.95;
          openH = scale * 0.01;
          break;
      }

      // Inside mouth dark cavity
      ctx.fillStyle = "#3e1218";
      ctx.beginPath();
      ctx.ellipse(0, 0, openW * 0.5, openH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper white teeth sliver
      if (openH > scale * 0.04) {
        ctx.fillStyle = "#fefefe";
        ctx.beginPath();
        ctx.rect(-openW * 0.35, -openH * 0.5, openW * 0.7, openH * 0.3);
        ctx.fill();
      }

      // Outer Lip contour
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = Math.max(1.2, scale * 0.016);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 6. Micro-expressions overlays
   */
  private static renderMicroExpressions(
    ctx: SKRSContext2D,
    face: FaceSpec,
    scale: number,
    timeMs: number,
    expression: string
  ): void {
    const expr = face.expressions;
    const isAngry = expr.angerVein || expression === "angry";
    const isSweat = expr.sweatDrop || expression === "shocked" || expression === "hurt";
    const isBlush = expr.blush || expression === "smug";

    // Anger vein on temple
    if (isAngry) {
      ctx.save();
      ctx.translate(scale * 0.28, -scale * 0.22);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = scale * 0.02;
      ctx.lineCap = "round";
      const pulse = 1 + Math.sin(timeMs * 0.02) * 0.15;
      ctx.scale(pulse, pulse);

      ctx.beginPath();
      ctx.moveTo(-scale * 0.04, -scale * 0.04);
      ctx.lineTo(scale * 0.04, scale * 0.04);
      ctx.moveTo(scale * 0.04, -scale * 0.04);
      ctx.lineTo(-scale * 0.04, scale * 0.04);
      ctx.stroke();
      ctx.restore();
    }

    // Sweat drop on cheek
    if (isSweat) {
      ctx.save();
      ctx.translate(scale * 0.26, -scale * 0.05);
      ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(0, -scale * 0.05);
      ctx.quadraticCurveTo(scale * 0.03, scale * 0.02, 0, scale * 0.04);
      ctx.quadraticCurveTo(-scale * 0.03, scale * 0.02, 0, -scale * 0.05);
      ctx.fill();
      ctx.restore();
    }

    // Gentle blush
    if (isBlush) {
      ctx.save();
      ctx.fillStyle = "rgba(244, 114, 182, 0.25)";
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.ellipse(dir * scale * 0.24, scale * 0.10, scale * 0.08, scale * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }
}
