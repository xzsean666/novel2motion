import { createHash } from "node:crypto";
import type { ScenePlan } from "../core/models/dsl.js";

/**
 * Deterministically stringifies an arbitrary value by sorting object keys recursively.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map((k) => {
    const val = (value as Record<string, unknown>)[k];
    return JSON.stringify(k) + ":" + stableStringify(val);
  });
  return "{" + pairs.join(",") + "}";
}

export interface SceneHashInputs {
  scene: ScenePlan;
  /**
   * Optional map of asset identifiers to content hashes (e.g. image or audio sha256)
   */
  assetFingerprints?: Record<string, string>;
  /**
   * Additional render options (resolution, fps, etc.) affecting video output
   */
  renderConfig?: {
    width?: number;
    height?: number;
    fps?: number;
    quality?: string;
  };
}

/**
 * Computes a deterministic SHA-256 hash representing all factors that define a scene's rendered video.
 */
export function computeSceneHash(inputs: SceneHashInputs): string {
  const hash = createHash("sha256");

  const normalized = {
    engineVersion: "v5_cinematic_facing_mouth_multiscene_3",
    scene: inputs.scene,
    assetFingerprints: inputs.assetFingerprints ?? {},
    renderConfig: inputs.renderConfig ?? {}
  };

  const payload = stableStringify(normalized);
  hash.update(payload, "utf8");
  return hash.digest("hex");
}
