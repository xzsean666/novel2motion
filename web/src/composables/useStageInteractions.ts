import * as THREE from "three";
import { ThreeStage } from "../../../src/engine/stage/three-stage.js";
import type { StageSlot } from "../../../src/core/models/dsl.js";

export interface SelectedActorState {
  actorId: string;
  slot: StageSlot;
  facing: "left" | "right";
  isFlying: boolean;
  scale: number;
  position: THREE.Vector3;
}

export class StageInteractions {
  private readonly stage: ThreeStage;
  private readonly raycaster = new THREE.Raycaster();
  private selectedActorId: string | null = null;
  private isDragging = false;
  private dragPlaneZ = 0;

  constructor(stage: ThreeStage) {
    this.stage = stage;
  }

  public getSelectedActorId(): string | null {
    return this.selectedActorId;
  }

  public setSelectedActorId(id: string | null): void {
    this.selectedActorId = id;
  }

  public isCurrentlyDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Raycasts into the stage actors layer from normalized device coordinates (NDC: [-1, 1])
   */
  public raycastActor(ndcX: number, ndcY: number): { actorId: string; point: THREE.Vector3 } | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.stage.camera);

    const actorsLayer = this.stage.layers.getLayer("actors");
    const intersects = this.raycaster.intersectObjects(actorsLayer.children, true);

    if (intersects.length === 0) {
      return null;
    }

    const hit = intersects[0];
    let current: THREE.Object3D | null = hit.object;

    // Traverse upwards to find root actor container
    while (current && current.parent && current.parent !== actorsLayer) {
      current = current.parent;
    }

    if (!current) return null;

    // Resolve actorId registered in ThreeStage
    for (const [id, record] of (this.stage as any).actors.entries()) {
      if (record.object === current) {
        return {
          actorId: id,
          point: hit.point
        };
      }
    }

    return null;
  }

  /**
   * Begins dragging an actor
   */
  public startDrag(actorId: string): void {
    this.selectedActorId = actorId;
    this.isDragging = true;
  }

  /**
   * Drags actor to new world position
   */
  public dragToWorld(worldX: number, worldY: number): void {
    if (!this.selectedActorId || !this.isDragging) return;

    const actorObj = this.stage.getActor(this.selectedActorId);
    if (actorObj) {
      actorObj.position.x = worldX;
      actorObj.position.y = worldY;
    }
  }

  /**
   * Calculates world coordinate on Z=0 plane given NDC coordinates
   */
  public unprojectToWorldPlane(ndcX: number, ndcY: number): THREE.Vector3 {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.stage.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.dragPlaneZ);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    return target;
  }

  /**
   * Drops current dragged actor and automatically snaps to nearest of the 5 canonical stage slots
   */
  public dropAndSnap(): SelectedActorState | null {
    if (!this.selectedActorId) return null;
    this.isDragging = false;

    const actorId = this.selectedActorId;
    const actorObj = this.stage.getActor(actorId);
    const placement = this.stage.getActorPlacement(actorId);

    if (!actorObj || !placement) return null;

    const slots: StageSlot[] = ["far_left", "mid_left", "center", "mid_right", "far_right"];
    let nearestSlot = slots[0];
    let minDistance = Infinity;

    for (const slot of slots) {
      const slotPos = this.stage.layout.getSlotWorldPosition(slot, placement.isFlying);
      const dist = Math.abs(actorObj.position.x - slotPos.x);
      if (dist < minDistance) {
        minDistance = dist;
        nearestSlot = slot;
      }
    }

    // Snap actor to resolved slot
    this.stage.setActorSlot(actorId, nearestSlot, placement.isFlying);

    return {
      actorId,
      slot: nearestSlot,
      facing: placement.facing,
      isFlying: placement.isFlying,
      scale: Math.abs(actorObj.scale.x || 1.0),
      position: actorObj.position.clone()
    };
  }

  /**
   * Flips horizontal facing direction ("left" <-> "right")
   */
  public flipFacing(actorId?: string): "left" | "right" | null {
    const id = actorId ?? this.selectedActorId;
    if (!id) return null;

    const placement = this.stage.getActorPlacement(id);
    if (!placement) return null;

    const newFacing = placement.facing === "left" ? "right" : "left";
    this.stage.setActorFacing(id, newFacing);
    return newFacing;
  }

  /**
   * Sets actor scale
   */
  public setScale(scale: number, actorId?: string): void {
    const id = actorId ?? this.selectedActorId;
    if (!id) return;

    const actorObj = this.stage.getActor(id);
    const placement = this.stage.getActorPlacement(id);
    if (!actorObj || !placement) return;

    const sign = placement.facing === "left" ? -1 : 1;
    actorObj.scale.set(sign * scale, scale, scale);
  }

  /**
   * Toggles flying sword altitude
   */
  public toggleFlying(actorId?: string): boolean | null {
    const id = actorId ?? this.selectedActorId;
    if (!id) return null;

    const placement = this.stage.getActorPlacement(id);
    if (!placement) return null;

    const newFlying = !placement.isFlying;
    this.stage.setActorSlot(id, placement.slot ?? "center", newFlying);
    return newFlying;
  }
}
