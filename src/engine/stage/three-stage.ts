import * as THREE from "three";
import { StageLayoutEngine, type StageLayoutOptions } from "./stage-slots.js";
import { StageLayerManager, type StageLayerKey } from "./stage-layer.js";
import type { StageSlot } from "../../core/models/dsl.js";

export type CameraMode = "perspective" | "orthographic";

export interface ThreeStageOptions extends StageLayoutOptions {
  cameraMode?: CameraMode;
  fov?: number; // Perspective camera vertical FOV in degrees (default: 45)
  near?: number;
  far?: number;
}

export interface ActorPlacement {
  id: string;
  object: THREE.Object3D;
  slot?: StageSlot;
  facing: "left" | "right";
  isFlying: boolean;
}

/**
 * ThreeStage: High-precision 2.5D canvas stage in Three.js
 * Default resolution: 1080x1920 (9:16 vertical short-video tweet animation)
 */
export class ThreeStage {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  readonly layers: StageLayerManager;
  readonly layout: StageLayoutEngine;

  readonly width: number;
  readonly height: number;
  readonly cameraMode: CameraMode;
  readonly fov: number;
  readonly cameraZ: number;
  readonly userData: Record<string, any> = {};

  private readonly actors: Map<string, ActorPlacement> = new Map();

  constructor(options: ThreeStageOptions = {}) {
    this.width = options.viewportWidth ?? 1080;
    this.height = options.viewportHeight ?? 1920;
    this.cameraMode = options.cameraMode ?? "perspective";
    this.fov = options.fov ?? 45;

    const near = options.near ?? 0.1;
    const far = options.far ?? 10000;

    // Calculate camera distance so 1 world unit = 1 pixel at Z = 0
    const fovRad = (this.fov / 2) * (Math.PI / 180);
    this.cameraZ = (this.height / 2) / Math.tan(fovRad);

    this.scene = new THREE.Scene();
    this.scene.name = "Novel2MotionScene";

    // Setup Camera
    if (this.cameraMode === "perspective") {
      const aspect = this.width / this.height;
      const persCamera = new THREE.PerspectiveCamera(this.fov, aspect, near, far);
      persCamera.position.set(0, 0, this.cameraZ);
      persCamera.lookAt(0, 0, 0);
      persCamera.updateProjectionMatrix();
      this.camera = persCamera;
    } else {
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const orthoCamera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, near, far);
      orthoCamera.position.set(0, 0, 1000);
      orthoCamera.lookAt(0, 0, 0);
      orthoCamera.updateProjectionMatrix();
      this.camera = orthoCamera;
    }

    // Setup 2.5D Layer Manager
    this.layers = new StageLayerManager();
    this.scene.add(this.layers.root);

    // Setup 5-slot layout engine
    this.layout = new StageLayoutEngine({
      viewportWidth: this.width,
      viewportHeight: this.height,
      baselineYRatio: options.baselineYRatio,
      flightAltitudeOffset: options.flightAltitudeOffset
    });

    // Default lighting for MeshStandard / MeshLambert materials
    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    ambientLight.name = "StageAmbientLight";
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.name = "StageKeyLight";
    dirLight.position.set(200, 400, 500);
    this.scene.add(dirLight);
  }

  /**
   * Add a character actor into the stage Actor layer
   */
  addActor(
    id: string,
    object: THREE.Object3D,
    slot: string = "center",
    facing: "left" | "right" = "right",
    isFlying = true
  ): void {
    // Remove previous instance if already present
    if (this.actors.has(id)) {
      this.removeActor(id);
    }

    const resolvedSlot = this.layout.resolveSlot(slot);
    const targetPos = this.layout.getSlotWorldPosition(resolvedSlot, isFlying, undefined, 0);

    object.position.copy(targetPos);
    this.applyFacing(object, facing);

    this.layers.addToLayer("actors", object);

    this.actors.set(id, {
      id,
      object,
      slot: resolvedSlot,
      facing,
      isFlying
    });
  }

  /**
   * Remove actor by ID
   */
  removeActor(id: string): boolean {
    const record = this.actors.get(id);
    if (!record) return false;

    this.layers.removeFromLayer("actors", record.object);
    this.actors.delete(id);
    return true;
  }

  /**
   * Get actor record by ID
   */
  getActor(id: string): THREE.Object3D | undefined {
    return this.actors.get(id)?.object;
  }

  /**
   * Get full actor placement
   */
  getActorPlacement(id: string): ActorPlacement | undefined {
    return this.actors.get(id);
  }

  /**
   * Move an actor to a specified slot
   */
  setActorSlot(id: string, slot: string, isFlying?: boolean): void {
    const record = this.actors.get(id);
    if (!record) return;

    const resolvedSlot = this.layout.resolveSlot(slot);
    const fly = isFlying ?? record.isFlying;
    const targetPos = this.layout.getSlotWorldPosition(resolvedSlot, fly, undefined, 0);

    record.object.position.copy(targetPos);
    record.slot = resolvedSlot;
    record.isFlying = fly;
  }

  /**
   * Set facing direction ("left" | "right")
   */
  setActorFacing(id: string, facing: "left" | "right"): void {
    const record = this.actors.get(id);
    if (!record) return;

    this.applyFacing(record.object, facing);
    record.facing = facing;
  }

  /**
   * Orient object along X axis for 2D sprite facing
   */
  private applyFacing(object: THREE.Object3D, facing: "left" | "right"): void {
    const defaultFacing = (object.userData.defaultFacing as "left" | "right") || "right";
    const currentScaleX = Math.abs(object.scale.x || 1.0);
    const shouldFlip = facing !== defaultFacing;
    object.scale.x = shouldFlip ? -currentScaleX : currentScaleX;
  }

  /**
   * Add background visual mesh to far_sky or mid_ground layer
   */
  addBackground(mesh: THREE.Object3D, layer: "far_sky" | "mid_ground" = "far_sky"): void {
    this.layers.addToLayer(layer, mesh);
  }

  /**
   * Add visual effect to VFX layer
   */
  addVFX(vfx: THREE.Object3D): void {
    this.layers.addToLayer("vfx", vfx);
  }

  /**
   * Add subtitle or overlay sticker to subtitles layer
   */
  addSubtitle(subtitleMesh: THREE.Object3D): void {
    this.layers.addToLayer("subtitles", subtitleMesh);
  }

  /**
   * Get visible width & height at depth Z in world units
   */
  getVisibleBoundsAtZ(z: number): { width: number; height: number } {
    if (this.cameraMode === "orthographic") {
      const zoom = (this.camera as THREE.OrthographicCamera).zoom;
      return { width: this.width / zoom, height: this.height / zoom };
    }

    const distance = Math.abs(this.camera.position.z - z);
    const fovRad = (this.fov / 2) * (Math.PI / 180);
    const visibleHeight = 2 * distance * Math.tan(fovRad);
    const visibleWidth = visibleHeight * (this.width / this.height);

    return { width: visibleWidth, height: visibleHeight };
  }

  /**
   * Clean up stage resources
   */
  dispose(): void {
    this.layers.clearAll();
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      if ("dispose" in child && typeof (child as any).dispose === "function") {
        (child as any).dispose();
      }
    }
    this.actors.clear();
  }
}
