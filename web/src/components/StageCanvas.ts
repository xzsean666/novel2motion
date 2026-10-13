import { ThreeStage, type ThreeStageOptions } from "../../../src/engine/stage/three-stage.js";
import { StageInteractions, type SelectedActorState } from "../composables/useStageInteractions.js";
import { CameraController } from "../../../src/engine/camera/camera-controller.js";

export interface StageCanvasOptions extends ThreeStageOptions {
  aspectRatio?: number; // default: 9 / 16 (0.5625)
  durationMs?: number;
  onSelectActor?: (state: SelectedActorState | null) => void;
  onTimeUpdate?: (timeMs: number) => void;
}

export class StageCanvasController {
  readonly stage: ThreeStage;
  readonly interactions: StageInteractions;
  readonly cameraController: CameraController;

  private isPlaying = false;
  private currentTimeMs = 0;
  private durationMs = 5000;
  private readonly onSelectActor?: (state: SelectedActorState | null) => void;
  private readonly onTimeUpdate?: (timeMs: number) => void;

  constructor(options: StageCanvasOptions = {}) {
    this.stage = new ThreeStage({
      viewportWidth: options.viewportWidth ?? 1080,
      viewportHeight: options.viewportHeight ?? 1920,
      cameraMode: options.cameraMode ?? "perspective"
    });

    this.interactions = new StageInteractions(this.stage);
    this.cameraController = new CameraController({ camera: this.stage.camera });
    this.durationMs = options.durationMs ?? 5000;
    this.onSelectActor = options.onSelectActor;
    this.onTimeUpdate = options.onTimeUpdate;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTimeMs(): number {
    return this.currentTimeMs;
  }

  public play(): void {
    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
  }

  public seek(timeMs: number): void {
    this.currentTimeMs = Math.max(0, Math.min(timeMs, this.durationMs));
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTimeMs);
    }
  }

  /**
   * Translates viewport screen pixel coordinates to normalized device coordinates (NDC: [-1, 1])
   */
  public screenToNdc(
    screenX: number,
    screenY: number,
    viewportW: number,
    viewportH: number
  ): { x: number; y: number } {
    return {
      x: (screenX / viewportW) * 2 - 1,
      y: -(screenY / viewportH) * 2 + 1
    };
  }

  public handlePointerDown(
    screenX: number,
    screenY: number,
    viewportW: number,
    viewportH: number
  ): string | null {
    const ndc = this.screenToNdc(screenX, screenY, viewportW, viewportH);
    const hit = this.interactions.raycastActor(ndc.x, ndc.y);

    if (hit) {
      this.interactions.startDrag(hit.actorId);
      if (this.onSelectActor) {
        const p = this.stage.getActorPlacement(hit.actorId);
        const obj = this.stage.getActor(hit.actorId);
        if (p && obj) {
          this.onSelectActor({
            actorId: hit.actorId,
            slot: p.slot ?? "center",
            facing: p.facing,
            isFlying: p.isFlying,
            scale: Math.abs(obj.scale.x || 1.0),
            position: obj.position.clone()
          });
        }
      }
      return hit.actorId;
    } else {
      this.interactions.setSelectedActorId(null);
      if (this.onSelectActor) this.onSelectActor(null);
      return null;
    }
  }

  public handlePointerMove(
    screenX: number,
    screenY: number,
    viewportW: number,
    viewportH: number
  ): void {
    if (!this.interactions.isCurrentlyDragging()) return;

    const ndc = this.screenToNdc(screenX, screenY, viewportW, viewportH);
    const worldTarget = this.interactions.unprojectToWorldPlane(ndc.x, ndc.y);
    this.interactions.dragToWorld(worldTarget.x, worldTarget.y);
  }

  public handlePointerUp(): SelectedActorState | null {
    if (!this.interactions.isCurrentlyDragging()) return null;

    const snapped = this.interactions.dropAndSnap();
    if (this.onSelectActor) {
      this.onSelectActor(snapped);
    }
    return snapped;
  }

  /**
   * Advances 60fps frame loop
   */
  public tick(deltaTimeMs: number): void {
    if (this.isPlaying) {
      this.currentTimeMs += deltaTimeMs;
      if (this.currentTimeMs > this.durationMs) {
        this.currentTimeMs = 0; // Loop playback
      }
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTimeMs);
      }
    }

    // Update camera motion
    this.cameraController.update(deltaTimeMs);
  }

  public dispose(): void {
    this.stage.dispose();
  }
}
