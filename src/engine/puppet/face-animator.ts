import type { SKRSContext2D } from "@napi-rs/canvas";

export interface FaceRoiConfig {
  /** Head top Y relative to character height (e.g. -0.85 means near head) */
  headCenterY: number;
  /** Mouth center Y relative to target height */
  mouthY: number;
  /** Mouth center X offset relative to target height */
  mouthX: number;
  /** Mouth natural width relative to head width */
  mouthWidth: number;
  /** Eyes Y offset relative to target height */
  eyesY: number;
  /** Left eye X, Right eye X offsets */
  eyeSpan: number;
  /** Eye size in pixels */
  eyeSize: number;
  /** Forehead center Y for emotion lines & anger veins */
  foreheadY: number;
  /** Temple / cheek position for sweat / anger */
  templeX: number;
  /** Character skin tone for seamless mouth patch */
  skinColor: string;
}

import { CALIBRATED_FACE_ROIS, FaceDetector } from "./face-detector.js";

/** Pre-calibrated Face & Mouth ROIs for characters */
export const CHARACTER_FACE_ROIS: Record<string, FaceRoiConfig> = CALIBRATED_FACE_ROIS;

export function getFaceRoi(characterId: string, img?: any): FaceRoiConfig {
  return FaceDetector.getOrDetectRoi(characterId, img);
}

export interface FaceAnimationParams {
  timeMs: number;
  isSpeaking: boolean;
  expression: string;
  targetH: number;
  targetW: number;
  scale: number;
  characterId: string;
  image?: any;
}

/**
 * FaceAnimator: Real-time procedural facial animation on Three.js / Canvas character planes.
 * Features:
 * 1. Lip Flapping on Dialogue (natural speaking mouth movement with open/close visemes).
 * 2. Natural Dynamic Blinking (blinks naturally every 3-4s).
 * 3. On-Face Emotional Overlays (anger veins on temple, shock hatch lines on forehead, sweat on cheek, hurt bloodline, smiling eyes).
 */
export class FaceAnimator {
  /**
   * Render complete face animation: Speaking mouth + blinking eyes + emotional facial details
   */
  public static renderFace(ctx: SKRSContext2D, params: FaceAnimationParams): void {
    const { timeMs, isSpeaking, expression, targetH, scale, characterId, image } = params;

    // Spiritual pets and non-human creatures don't have human lips or facial features
    if (characterId.includes("rooster") || characterId.includes("pet") || characterId.includes("beast")) {
      return;
    }

    const roi = getFaceRoi(characterId, image);

    const faceCenterX = targetH * roi.mouthX;
    const mouthCenterY = targetH * roi.mouthY;
    const eyesCenterY = targetH * roi.eyesY;
    const foreheadCenterY = targetH * roi.foreheadY;

    ctx.save();
    // Translate directly to face center coordinate so all features align seamlessly
    ctx.translate(faceCenterX, 0);

    // 1. Render Eyes & Natural Blinking on the face (subtle, non-destructive to model artwork)
    this.renderEyesAndBlink(ctx, {
      timeMs,
      expression,
      eyesY: eyesCenterY,
      eyeSpan: roi.eyeSpan * scale,
      eyeSize: roi.eyeSize * scale,
      scale
    });

    // 2. Render Real Facial Emotions (only non-destructive subtle atmospheric highlights)
    this.renderOnFaceEmotions(ctx, {
      timeMs,
      expression,
      foreheadY: foreheadCenterY,
      mouthY: mouthCenterY,
      templeX: roi.templeX * scale,
      scale
    });

    // 3. Render Dynamic Talking Mouth tailored to each model
    this.renderMouth(ctx, {
      timeMs,
      isSpeaking,
      expression,
      mouthY: mouthCenterY,
      baseWidth: roi.mouthWidth * scale,
      skinColor: roi.skinColor,
      scale,
      characterId
    });

    ctx.restore();
  }

  /**
   * 1. Natural Blinking System (preserves model's original artwork and expressions)
   */
  private static renderEyesAndBlink(
    ctx: SKRSContext2D,
    opts: {
      timeMs: number;
      expression: string;
      eyesY: number;
      eyeSpan: number;
      eyeSize: number;
      scale: number;
    }
  ): void {
    const { timeMs, expression, eyesY, eyeSpan, eyeSize, scale } = opts;

    // If character already has an active painted emotional sprite (shocked, hurt, angry, happy),
    // respect the authentic model artwork 100% and do not draw vector doodles on eyes!
    if (expression !== "normal" && expression !== "battle") {
      return;
    }

    // Calculate natural blink: ~100ms blink duration every ~3400ms
    const blinkCycle = 3400;
    const blinkPhase = timeMs % blinkCycle;
    let blinkRatio = 0;
    if (blinkPhase < 120) {
      blinkRatio = blinkPhase < 60 ? blinkPhase / 60 : 1 - (blinkPhase - 60) / 60;
      blinkRatio = Math.sin(blinkRatio * (Math.PI / 2));
    }

    // Only draw delicate anime eyelid during peak blink
    if (blinkRatio > 0.45) {
      const leftX = -eyeSpan / 2;
      const rightX = eyeSpan / 2;

      ctx.save();
      ctx.strokeStyle = "rgba(40, 20, 10, 0.65)";
      ctx.lineWidth = 2.0 * scale;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.arc(leftX, eyesY, eyeSize * 0.45, Math.PI * 0.12, Math.PI * 0.88, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightX, eyesY, eyeSize * 0.45, Math.PI * 0.12, Math.PI * 0.88, false);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * 2. On-Face Emotional Details (subtle, non-destructive highlights directly on the face)
   */
  private static renderOnFaceEmotions(
    ctx: SKRSContext2D,
    opts: {
      timeMs: number;
      expression: string;
      foreheadY: number;
      mouthY: number;
      templeX: number;
      scale: number;
    }
  ): void {
    const { expression, mouthY, templeX, scale } = opts;

    if (expression === "hurt") {
      // Subtle, realistic trickle of blood from mouth corner
      ctx.save();
      ctx.strokeStyle = "rgba(180, 12, 12, 0.85)";
      ctx.lineWidth = 1.8 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(templeX * 0.42, mouthY + 1 * scale);
      ctx.lineTo(templeX * 0.45, mouthY + 12 * scale);
      ctx.stroke();
      ctx.restore();
    } else if (expression === "happy" || expression === "smug") {
      // Gentle, soft anime blush on cheeks (subtle transparency, no doll stripes)
      ctx.save();
      ctx.fillStyle = "rgba(255, 120, 140, 0.16)";
      ctx.beginPath();
      ctx.ellipse(-templeX * 0.75, mouthY - 10 * scale, 14 * scale, 6 * scale, 0.1, 0, Math.PI * 2);
      ctx.ellipse(templeX * 0.75, mouthY - 10 * scale, 14 * scale, 6 * scale, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Angry and shocked expressions are 100% portrayed by the character model's actual painted sprite
  }

  /**
   * 3. Dynamic Mouth Talking & Natural Anime Viseme System
   * Synchronizes talking jaw movement and delicate, model-fitting anime lip parting.
   * Completely avoids ugly large circular patches or clunky rectangular doodle teeth.
   */
  private static renderMouth(
    ctx: SKRSContext2D,
    opts: {
      timeMs: number;
      isSpeaking: boolean;
      expression: string;
      mouthY: number;
      baseWidth: number;
      skinColor: string;
      scale: number;
      characterId?: string;
    }
  ): void {
    const { timeMs, isSpeaking, expression, mouthY, baseWidth, skinColor, scale, characterId } = opts;

    // When idle / not speaking, keep original pristine anime character mouth from model asset 100%
    if (!isSpeaking) {
      return;
    }

    ctx.save();
    ctx.translate(0, mouthY);

    // Multi-harmonic syllable cadence with natural speech pauses (eliminates goldfish popping)
    const openRatio = this.computeSyllableRhythm(timeMs, expression);
    if (openRatio < 0.08) {
      ctx.restore();
      return;
    }

    const isDemonic = characterId ? characterId.includes("evil") : false;

    if (expression === "angry") {
      this.renderRoaringTalkingMouth(ctx, openRatio, baseWidth, scale, skinColor, isDemonic);
    } else if (expression === "shocked") {
      this.renderShockedTalkingMouth(ctx, openRatio, baseWidth, scale, skinColor, isDemonic);
    } else {
      this.renderNormalTalkingMouth(ctx, openRatio, baseWidth, scale, expression, skinColor, isDemonic);
    }

    ctx.restore();
  }

  /**
   * Computes realistic human / anime speech rhythm with multi-frequency beats and micro-pauses
   */
  private static computeSyllableRhythm(timeMs: number, expression: string): number {
    // Primary syllable beat (~280ms) + secondary consonant modulation (~160ms) + breath pause (~1400ms)
    const beatA = Math.sin(timeMs * 0.022);
    const beatB = Math.sin(timeMs * 0.038 + 0.6);
    const breath = Math.sin(timeMs * 0.0045);

    let raw = (beatA * 0.6 + beatB * 0.4);
    // Micro speech pauses between clauses
    if (breath < -0.45) {
      raw *= 0.15;
    }

    let ratio = Math.max(0, Math.min(1, raw));
    if (expression === "angry") {
      ratio = 0.25 + ratio * 0.75;
    }
    return ratio;
  }

  /**
   * Standard talking mouth: Delicate anime lip parting with subtle inner depth
   * Preserves authentic artwork with zero clumsy skin patch halos
   */
  private static renderNormalTalkingMouth(
    ctx: SKRSContext2D,
    openRatio: number,
    baseWidth: number,
    scale: number,
    expression: string,
    skinColor: string,
    isDemonic = false
  ): void {
    const mouthW = baseWidth * (0.68 + openRatio * 0.22);
    const mouthH = Math.max(1.2 * scale, 3.8 * scale * openRatio);
    const smileLift = (expression === "happy" || expression === "smug") ? -0.8 * scale : 0;

    ctx.save();

    // 1. Micro feather blend precisely bounded within the lip seam (never bleeds onto chin or cheeks)
    const featherH = Math.max(mouthH * 1.15, 3.2 * scale);
    const seamGrad = ctx.createRadialGradient(0, 0, 0.5 * scale, 0, 0, mouthW * 0.48);
    seamGrad.addColorStop(0, skinColor);
    seamGrad.addColorStop(0.75, skinColor);
    seamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seamGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 0.48, featherH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Delicate inner oral cavity (warm deep anime carmine, elegant curved opening)
    ctx.fillStyle = isDemonic ? "#230612" : "#360e15";
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.42, 0);
    ctx.quadraticCurveTo(0, -0.6 * scale + smileLift, mouthW * 0.42, 0);
    ctx.quadraticCurveTo(0, mouthH * 0.95, -mouthW * 0.42, 0);
    ctx.closePath();
    ctx.fill();

    // 3. Subtle translucent tooth sheen (fine soft anime highlight, never a solid white block)
    if (openRatio > 0.4) {
      ctx.fillStyle = isDemonic ? "rgba(230, 220, 235, 0.75)" : "rgba(255, 252, 248, 0.85)";
      ctx.beginPath();
      ctx.ellipse(0, -0.1 * scale, mouthW * 0.22, 0.85 * scale, 0, 0, Math.PI);
      ctx.fill();
    }

    // 4. Ultra-fine anime upper lip seam contour line
    ctx.strokeStyle = isDemonic ? "rgba(45, 10, 25, 0.88)" : "rgba(65, 20, 25, 0.88)";
    ctx.lineWidth = 1.1 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.44, 0);
    ctx.quadraticCurveTo(0, -0.6 * scale + smileLift, mouthW * 0.44, 0);
    ctx.stroke();

    // 5. Lower lip soft shadow arc
    ctx.strokeStyle = isDemonic ? "rgba(45, 10, 25, 0.4)" : "rgba(80, 25, 30, 0.4)";
    ctx.lineWidth = 0.9 * scale;
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.24, mouthH * 0.92);
    ctx.quadraticCurveTo(0, mouthH + 0.8 * scale, mouthW * 0.24, mouthH * 0.92);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Roaring / Shouting mouth flap (model-conforming anime battle shout)
   */
  private static renderRoaringTalkingMouth(
    ctx: SKRSContext2D,
    openRatio: number,
    baseWidth: number,
    scale: number,
    skinColor: string,
    isDemonic = false
  ): void {
    const mouthW = baseWidth * (0.82 + openRatio * 0.22);
    const mouthH = Math.max(2.2 * scale, 6.2 * scale * openRatio);

    ctx.save();

    // 1. Micro seam feather blend
    const seamGrad = ctx.createRadialGradient(0, 0, 1 * scale, 0, 0, mouthW * 0.52);
    seamGrad.addColorStop(0, skinColor);
    seamGrad.addColorStop(0.8, skinColor);
    seamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seamGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 0.52, mouthH * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Expressive inner oral cavity
    ctx.fillStyle = isDemonic ? "#1a030c" : "#2e090f";
    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.45, -mouthH * 0.2);
    ctx.quadraticCurveTo(0, -mouthH * 0.35, mouthW * 0.45, -mouthH * 0.2);
    ctx.quadraticCurveTo(0, mouthH * 0.95, -mouthW * 0.45, -mouthH * 0.2);
    ctx.closePath();
    ctx.fill();

    // 3. Upper subtle tooth contour
    ctx.fillStyle = isDemonic ? "rgba(235, 225, 238, 0.82)" : "rgba(255, 250, 245, 0.88)";
    ctx.beginPath();
    ctx.ellipse(0, -mouthH * 0.15, mouthW * 0.28, 1.1 * scale, 0, 0, Math.PI);
    ctx.fill();

    // 4. Sharp anime contour lines
    ctx.strokeStyle = isDemonic ? "#2b0a1a" : "#380d12";
    ctx.lineWidth = 1.3 * scale;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.45, -mouthH * 0.2);
    ctx.quadraticCurveTo(0, -mouthH * 0.35, mouthW * 0.45, -mouthH * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-mouthW * 0.35, mouthH * 0.85);
    ctx.quadraticCurveTo(0, mouthH * 0.95, mouthW * 0.35, mouthH * 0.85);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Shocked anime open mouth (natural round opening with fine contour)
   */
  private static renderShockedTalkingMouth(
    ctx: SKRSContext2D,
    openRatio: number,
    baseWidth: number,
    scale: number,
    skinColor: string,
    isDemonic = false
  ): void {
    const mouthW = baseWidth * 0.55;
    const mouthH = Math.max(1.8 * scale, 5.0 * scale * openRatio);

    ctx.save();

    // 1. Micro seam feather blend
    const seamGrad = ctx.createRadialGradient(0, 0, 1 * scale, 0, 0, mouthW * 0.52);
    seamGrad.addColorStop(0, skinColor);
    seamGrad.addColorStop(0.78, skinColor);
    seamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seamGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 0.52, mouthH * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Compact shock oral cavity
    ctx.fillStyle = isDemonic ? "#1a030c" : "#2a0a0d";
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 0.38, mouthH * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Delicate contour
    ctx.strokeStyle = isDemonic ? "#280a1a" : "#2e0c10";
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 0.38, mouthH * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

