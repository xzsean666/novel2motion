import type { TransformKeyframe, EasingType } from "../core/models/timeline.js";

export interface InterpolateTransformInput {
  keyframes: TransformKeyframe[];
  timeMs: number;
}

export interface TransformSample {
  timeMs: number;
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

/**
 * Calculates easing progress [0, 1] for a given normalized time t [0, 1].
 */
export function applyEasing(t: number, easing: EasingType = "easeInOut"): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "linear":
      return clamped;
    case "easeIn":
      return clamped * clamped;
    case "easeOut":
      return clamped * (2 - clamped);
    case "easeInOut":
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    case "spring":
      // Light spring overshoot
      return 1 - Math.cos(clamped * Math.PI * 2.5) * Math.exp(-clamped * 3);
    case "instant":
      return clamped >= 1 ? 1 : 0;
    default:
      return clamped;
  }
}

/**
 * Interpolates transform state at a given timestamp among an array of keyframes.
 */
export function interpolateTransform(
  keyframes: TransformKeyframe[],
  timeMs: number
): TransformSample {
  if (keyframes.length === 0) {
    return { timeMs, x: 0, y: 0, z: 0, rotationZ: 0, scaleX: 1, scaleY: 1, opacity: 1 };
  }

  if (keyframes.length === 1 || timeMs <= keyframes[0].timeMs) {
    const k = keyframes[0];
    return {
      timeMs,
      x: k.x,
      y: k.y,
      z: k.z,
      rotationZ: k.rotationZ,
      scaleX: k.scaleX,
      scaleY: k.scaleY,
      opacity: k.opacity
    };
  }

  const lastKey = keyframes[keyframes.length - 1];
  if (timeMs >= lastKey.timeMs) {
    return {
      timeMs,
      x: lastKey.x,
      y: lastKey.y,
      z: lastKey.z,
      rotationZ: lastKey.rotationZ,
      scaleX: lastKey.scaleX,
      scaleY: lastKey.scaleY,
      opacity: lastKey.opacity
    };
  }

  // Find surrounding keyframe pair
  let prev = keyframes[0];
  let next = keyframes[1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (timeMs >= keyframes[i].timeMs && timeMs <= keyframes[i + 1].timeMs) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const duration = next.timeMs - prev.timeMs;
  const rawT = duration > 0 ? (timeMs - prev.timeMs) / duration : 1;
  const easedT = applyEasing(rawT, next.easing);

  const lerp = (a: number, b: number) => a + (b - a) * easedT;

  return {
    timeMs,
    x: lerp(prev.x, next.x),
    y: lerp(prev.y, next.y),
    z: lerp(prev.z, next.z),
    rotationZ: lerp(prev.rotationZ, next.rotationZ),
    scaleX: lerp(prev.scaleX, next.scaleX),
    scaleY: lerp(prev.scaleY, next.scaleY),
    opacity: lerp(prev.opacity, next.opacity)
  };
}
