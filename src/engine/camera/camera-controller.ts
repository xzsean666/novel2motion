import * as THREE from "three";
import { CameraShake, type ShakePreset, type ShakeConfig } from "./camera-shake.js";
import { IdleMotion, type IdleMotionConfig } from "./idle-motion.js";
import { StageLayoutEngine } from "../stage/stage-slots.js";
import { applyEasing } from "../../runtime/timeline-worker.js";
import type { EasingType } from "../../core/models/timeline.js";

export interface CameraControllerOptions {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  baseCameraZ?: number;
  layoutEngine?: StageLayoutEngine;
  idleBreathing?: boolean | IdleMotionConfig;
}

interface PanTween {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  durationMs: number;
  elapsedMs: number;
  easing: EasingType;
}

interface ZoomTween {
  startZoom: number;
  targetZoom: number;
  durationMs: number;
  elapsedMs: number;
  easing: EasingType;
}

/**
 * CameraController: Cinema-grade 3D camera motion controller
 * Supports Pan, Zoom (Dolly Close-up), Shake, and Idle Breathing
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  readonly shake: CameraShake;
  readonly idleMotion: IdleMotion;
  readonly baseZ: number;
  private readonly layout: StageLayoutEngine;

  // Camera state
  private currentX = 0;
  private currentY = 0;
  private currentZoom = 1.0;

  // Active Tweens
  private panTween: PanTween | null = null;
  private zoomTween: ZoomTween | null = null;

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera;
    this.shake = new CameraShake();

    const idleCfg = typeof options.idleBreathing === "object"
      ? options.idleBreathing
      : { enabled: options.idleBreathing !== false };
    this.idleMotion = new IdleMotion(idleCfg);

    this.layout = options.layoutEngine ?? new StageLayoutEngine();
    this.baseZ = options.baseCameraZ ?? this.camera.position.z;
  }

  /**
   * Current camera coordinates & zoom
   */
  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this.currentX,
      y: this.currentY,
      z: this.camera.position.z
    };
  }

  getZoom(): number {
    return this.currentZoom;
  }

  /**
   * Smoothly pan camera to (targetX, targetY)
   */
  panTo(targetX: number, targetY: number, durationMs = 0, easing: EasingType = "easeInOut"): void {
    if (durationMs <= 0) {
      this.currentX = targetX;
      this.currentY = targetY;
      this.panTween = null;
      return;
    }

    this.panTween = {
      startX: this.currentX,
      startY: this.currentY,
      targetX,
      targetY,
      durationMs,
      elapsedMs: 0,
      easing
    };
  }

  /**
   * Smoothly zoom camera (1.0 = full frame, 1.4 = medium close-up, 1.8 = extreme close-up)
   */
  zoomTo(targetZoom: number, durationMs = 0, easing: EasingType = "easeInOut"): void {
    const clampedZoom = Math.max(0.2, Math.min(5.0, targetZoom));
    if (durationMs <= 0) {
      this.currentZoom = clampedZoom;
      this.zoomTween = null;
      return;
    }

    this.zoomTween = {
      startZoom: this.currentZoom,
      targetZoom: clampedZoom,
      durationMs,
      elapsedMs: 0,
      easing
    };
  }

  /**
   * Focus camera onto a specific character slot with optional close-up zoom
   */
  focusOnSlot(slot: string, zoomLevel = 1.35, durationMs = 300, isFlying = true): void {
    const worldPos = this.layout.getSlotWorldPosition(slot, isFlying);
    // Pan slightly above character foot anchor to focus on chest / face
    const focusY = worldPos.y + 160;
    this.panTo(worldPos.x, focusY, durationMs, "easeInOut");
    this.zoomTo(zoomLevel, durationMs, "easeInOut");
  }

  /**
   * Reset camera back to center (0, 0) and neutral zoom 1.0
   */
  reset(durationMs = 300): void {
    this.panTo(0, 0, durationMs, "easeInOut");
    this.zoomTo(1.0, durationMs, "easeInOut");
  }

  /**
   * Trigger combat screen shake
   */
  triggerShake(presetOrConfig?: ShakePreset | ShakeConfig): void {
    this.shake.trigger(presetOrConfig);
  }

  /**
   * Toggle idle breathing float
   */
  setIdleBreathing(enabled: boolean): void {
    this.idleMotion.setEnabled(enabled);
  }

  /**
   * Update camera motion and apply to Three.js camera transform
   */
  update(deltaTimeMs: number): void {
    // 1. Advance Pan Tween
    if (this.panTween) {
      this.panTween.elapsedMs += deltaTimeMs;
      const progress = Math.min(1.0, this.panTween.elapsedMs / this.panTween.durationMs);
      const t = applyEasing(progress, this.panTween.easing);
      this.currentX = this.panTween.startX + (this.panTween.targetX - this.panTween.startX) * t;
      this.currentY = this.panTween.startY + (this.panTween.targetY - this.panTween.startY) * t;
      if (progress >= 1.0) {
        this.panTween = null;
      }
    }

    // 2. Advance Zoom Tween
    if (this.zoomTween) {
      this.zoomTween.elapsedMs += deltaTimeMs;
      const progress = Math.min(1.0, this.zoomTween.elapsedMs / this.zoomTween.durationMs);
      const t = applyEasing(progress, this.zoomTween.easing);
      this.currentZoom = this.zoomTween.startZoom + (this.zoomTween.targetZoom - this.zoomTween.startZoom) * t;
      if (progress >= 1.0) {
        this.zoomTween = null;
      }
    }

    // 3. Compute Idle and Shake offsets
    const idleOffset = this.idleMotion.update(deltaTimeMs);
    const shakeOffset = this.shake.update(deltaTimeMs);

    // 4. Combine offsets
    const finalX = this.currentX + shakeOffset.offsetX;
    const finalY = this.currentY + idleOffset.offsetY + shakeOffset.offsetY;
    const finalRotZ = idleOffset.offsetRotationZ + shakeOffset.offsetRotationZ;

    // 5. Apply to camera
    if (this.camera instanceof THREE.PerspectiveCamera) {
      // Perspective Dolly Zoom: adjust distance along Z axis
      const dollyZ = this.baseZ / this.currentZoom;
      this.camera.position.set(finalX, finalY, dollyZ);
      this.camera.lookAt(finalX, finalY, 0);
      this.camera.rotation.z = finalRotZ;
    } else {
      // Orthographic Zoom
      const ortho = this.camera as THREE.OrthographicCamera;
      ortho.zoom = this.currentZoom;
      ortho.updateProjectionMatrix();
      ortho.position.set(finalX, finalY, 1000);
      ortho.lookAt(finalX, finalY, 0);
      ortho.rotation.z = finalRotZ;
    }
  }
}
