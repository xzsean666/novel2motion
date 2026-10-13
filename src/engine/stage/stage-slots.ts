import * as THREE from "three";
import type { StageSlot } from "../../core/models/dsl.js";

/**
 * Slot normalized X ratios (0.0 = left edge, 1.0 = right edge)
 */
export const DEFAULT_SLOT_RATIOS: Record<StageSlot, number> = {
  far_left: 0.15,
  mid_left: 0.32,
  center: 0.50,
  mid_right: 0.68,
  far_right: 0.85
};

export const LANDSCAPE_SLOT_RATIOS: Record<StageSlot, number> = {
  far_left: 0.12,
  mid_left: 0.28,
  center: 0.50,
  mid_right: 0.72,
  far_right: 0.88
};

/**
 * Normalized slot aliases for flexible invocation
 */
export const SLOT_ALIASES: Record<string, StageSlot> = {
  far_left: "far_left",
  mid_left: "mid_left",
  center: "center",
  mid_right: "mid_right",
  far_right: "far_right",
  farLeft: "far_left",
  left: "mid_left",
  midLeft: "mid_left",
  midRight: "mid_right",
  right: "mid_right",
  farRight: "far_right"
};

export interface StageLayoutOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  baselineYRatio?: number; // 0.0 is top of screen, 1.0 is bottom of screen. 0.66 is standard ground/cultivator baseline
  flightAltitudeOffset?: number; // Extra world units for flying sword hovering (default: 120)
}

/**
 * Stage Layout Engine: handles viewport coordinate translation and 5-slot positioning
 */
export class StageLayoutEngine {
  readonly width: number;
  readonly height: number;
  readonly baselineYRatio: number;
  readonly flightAltitudeOffset: number;
  private readonly slotRatios: Record<StageSlot, number>;

  constructor(options: StageLayoutOptions = {}) {
    this.width = options.viewportWidth ?? 1080;
    this.height = options.viewportHeight ?? 1920;
    this.baselineYRatio = options.baselineYRatio ?? (this.height <= 1080 ? 0.65 : 0.66);
    this.flightAltitudeOffset = options.flightAltitudeOffset ?? (this.height <= 1080 ? 90 : 120);
    const isLandscape = this.width > this.height;
    this.slotRatios = isLandscape ? { ...LANDSCAPE_SLOT_RATIOS } : { ...DEFAULT_SLOT_RATIOS };
  }

  /**
   * Resolve slot string or alias to canonical StageSlot
   */
  resolveSlot(slotName: string): StageSlot {
    const canonical = SLOT_ALIASES[slotName];
    if (!canonical) {
      return "center";
    }
    return canonical;
  }

  /**
   * Get normalized X ratio (0..1) for a slot
   */
  getSlotXRatio(slot: string): number {
    const canonical = this.resolveSlot(slot);
    return this.slotRatios[canonical] ?? 0.50;
  }

  /**
   * Convert normalized screen ratios (x: 0..1 from left, y: 0..1 from top) to Three.js world coordinates
   * In Three.js: center is (0, 0), +X is right, +Y is up.
   */
  ratioToWorld(xRatio: number, yRatio: number, z = 0): THREE.Vector3 {
    const worldX = (xRatio - 0.5) * this.width;
    const worldY = (0.5 - yRatio) * this.height;
    return new THREE.Vector3(worldX, worldY, z);
  }

  /**
   * Convert Three.js world coordinates back to screen ratios (x: 0..1, y: 0..1)
   */
  worldToRatio(x: number, y: number): { xRatio: number; yRatio: number } {
    const xRatio = x / this.width + 0.5;
    const yRatio = 0.5 - y / this.height;
    return { xRatio, yRatio };
  }

  /**
   * Get world position for a slot
   * @param slot StageSlot or alias
   * @param isFlying Whether cultivator is hovering on flying sword (adds flight altitude)
   * @param customOffset Additional offset vector
   * @param layerZ Depth layer Z
   */
  getSlotWorldPosition(
    slot: string,
    isFlying = true,
    customOffset?: { x?: number; y?: number; z?: number },
    layerZ = 0
  ): THREE.Vector3 {
    const xRatio = this.getSlotXRatio(slot);
    const pos = this.ratioToWorld(xRatio, this.baselineYRatio, layerZ);

    if (isFlying) {
      pos.y += this.flightAltitudeOffset;
    }

    if (customOffset?.x) pos.x += customOffset.x;
    if (customOffset?.y) pos.y += customOffset.y;
    if (customOffset?.z) pos.z += customOffset.z;

    return pos;
  }

  /**
   * Determine relative facing direction between two slots
   * E.g. character at far_left should face "right" to look at character at mid_right
   */
  getFacingDirection(fromSlot: string, toSlot: string): "left" | "right" {
    const fromX = this.getSlotXRatio(fromSlot);
    const toX = this.getSlotXRatio(toSlot);
    return toX >= fromX ? "right" : "left";
  }

  /**
   * Calculate world distance between two slots
   */
  getSlotDistance(slotA: string, slotB: string): number {
    const xA = (this.getSlotXRatio(slotA) - 0.5) * this.width;
    const xB = (this.getSlotXRatio(slotB) - 0.5) * this.width;
    return Math.abs(xB - xA);
  }

  /**
   * Get subtitle anchor position (bottom area of screen)
   */
  getSubtitlePosition(yRatio = 0.82, layerZ = 300): THREE.Vector3 {
    return this.ratioToWorld(0.5, yRatio, layerZ);
  }
}
