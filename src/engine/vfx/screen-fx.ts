import * as THREE from "three";
import { LightningEffect, type LightningConfig } from "./lightning-effect.js";
import { SwordTrailParticles, type SwordTrailConfig } from "./sword-trail-particles.js";

export interface ScreenFlashOptions {
  width?: number;
  height?: number;
  defaultColor?: number;
}

/**
 * ScreenFlash: Instant full-screen white/tinted hit flash with ultra-fast quadratic decay
 */
export class ScreenFlash {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly geometry: THREE.PlaneGeometry;

  private durationMs = 120;
  private elapsedMs = 0;
  private maxOpacity = 0.85;
  private active = false;

  constructor(options: ScreenFlashOptions = {}) {
    const w = options.width ?? 1200;
    const h = options.height ?? 2100;

    this.geometry = new THREE.PlaneGeometry(w, h);
    this.material = new THREE.MeshBasicMaterial({
      color: options.defaultColor ?? 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = "ScreenFlashQuad";
    this.mesh.renderOrder = 999; // Always render on top of VFX
    this.mesh.visible = false;
  }

  /**
   * Trigger screen flash
   */
  trigger(durationMs = 120, colorHex = 0xffffff, maxOpacity = 0.85): void {
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.maxOpacity = maxOpacity;
    this.active = true;

    this.material.color.setHex(colorHex);
    this.material.opacity = maxOpacity;
    this.mesh.visible = true;
  }

  isActive(): boolean {
    return this.active;
  }

  update(deltaTimeMs: number): void {
    if (!this.active) return;

    this.elapsedMs += deltaTimeMs;
    const progress = Math.min(1.0, this.elapsedMs / this.durationMs);

    if (progress >= 1.0) {
      this.active = false;
      this.mesh.visible = false;
      this.material.opacity = 0;
      return;
    }

    // Fast non-linear decay
    const decay = 1.0 - progress;
    this.material.opacity = this.maxOpacity * decay * decay;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * VFXManager: Unified manager orchestrating lightning, particle streams, and screen flashes
 */
export class VFXManager {
  readonly root: THREE.Group;
  readonly lightning: LightningEffect;
  readonly swordTrail: SwordTrailParticles;
  readonly screenFlash: ScreenFlash;

  constructor(options: { width?: number; height?: number } = {}) {
    this.root = new THREE.Group();
    this.root.name = "VFXRootGroup";

    this.lightning = new LightningEffect();
    this.swordTrail = new SwordTrailParticles();
    this.screenFlash = new ScreenFlash({ width: options.width, height: options.height });

    this.root.add(this.lightning.group);
    this.root.add(this.swordTrail.points);
    this.root.add(this.screenFlash.mesh);
  }

  /**
   * Trigger combat hit visual burst (screen flash + optional sparks)
   */
  triggerHit(heavy = false): void {
    const duration = heavy ? 180 : 110;
    const opacity = heavy ? 0.95 : 0.75;
    this.screenFlash.trigger(duration, 0xffffff, opacity);
  }

  /**
   * Trigger divine thunder strike
   */
  strikeThunder(start: THREE.Vector3, target: THREE.Vector3, durationMs = 350): void {
    this.lightning.strike(start, target, durationMs);
    // Concurrent mini flash
    this.screenFlash.trigger(100, 0xddbbff, 0.65);
  }

  /**
   * Update all active VFX elements
   */
  update(deltaTimeMs: number): void {
    this.lightning.update(deltaTimeMs);
    this.swordTrail.update(deltaTimeMs);
    this.screenFlash.update(deltaTimeMs);
  }

  dispose(): void {
    this.lightning.dispose();
    this.swordTrail.dispose();
    this.screenFlash.dispose();
  }
}
