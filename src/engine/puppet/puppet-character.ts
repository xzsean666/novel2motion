import * as THREE from "three";
import { ActionController, type PuppetActionType, type ActionPose } from "./action-controller.js";
import { ModularAvatar } from "./avatar/modular-avatar.js";
import type { ModularAvatarSpec } from "../../core/models/modular-character.js";
import type { UniversalActionType } from "./avatar/universal-motion-library.js";

export interface PuppetCharacterOptions {
  id: string;
  name?: string;
  facing?: "left" | "right";
  initialAction?: PuppetActionType;
  flightLeanAngle?: number; // Base pitch in degrees (default: 28)
  auraColor?: number; // Aura hex color (default: 0x44ffaa for righteous cyan-green, 0x9922ff for demonic)
  avatar?: ModularAvatar;
  avatarSpec?: ModularAvatarSpec;
}

/**
 * PuppetCharacter: 2.5D Multi-layer paper doll rig in Three.js
 * Represents 5.5-head tall adult cultivators flying on swords with modular body, arm, head, and weapon meshes.
 */
export class PuppetCharacter {
  readonly id: string;
  readonly name: string;
  readonly root: THREE.Group;

  // Layer groups
  readonly auraGroup: THREE.Group;
  readonly weaponGroup: THREE.Group;
  readonly bodyGroup: THREE.Group;
  readonly armsGroup: THREE.Group;
  readonly headGroup: THREE.Group;
  readonly faceMount: THREE.Group; // Dedicated mounting point for MemeFace in TASK-114
  readonly modularAvatar?: ModularAvatar;

  // Action controller
  readonly actionController: ActionController;

  private facing: "left" | "right" = "right";
  private disposed = false;

  constructor(options: PuppetCharacterOptions) {
    this.id = options.id;
    this.name = options.name ?? options.id;
    this.facing = options.facing ?? "right";

    if (options.avatar) {
      this.modularAvatar = options.avatar;
    } else if (options.avatarSpec) {
      this.modularAvatar = new ModularAvatar({
        spec: options.avatarSpec,
        facing: this.facing,
        initialAction: options.initialAction ? mapPuppetToUniversalAction(options.initialAction) : "idle"
      });
    }

    this.root = new THREE.Group();
    this.root.name = `Puppet_${this.id}`;
    if (this.modularAvatar) {
      this.root.userData.modularAvatar = this.modularAvatar;
    }

    // Initialize layer groups with 2.5D depth offsets
    this.auraGroup = new THREE.Group();
    this.auraGroup.name = `${this.id}_Aura`;
    this.auraGroup.position.z = -5;

    this.weaponGroup = new THREE.Group();
    this.weaponGroup.name = `${this.id}_Weapon`;
    this.weaponGroup.position.z = -2;

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.name = `${this.id}_Body`;
    this.bodyGroup.position.z = 0;

    this.armsGroup = new THREE.Group();
    this.armsGroup.name = `${this.id}_Arms`;
    this.armsGroup.position.z = 2;

    this.headGroup = new THREE.Group();
    this.headGroup.name = `${this.id}_Head`;
    this.headGroup.position.z = 4;

    this.faceMount = new THREE.Group();
    this.faceMount.name = `${this.id}_FaceMount`;
    this.faceMount.position.set(0, 0, 1); // Slightly in front of head base
    this.headGroup.add(this.faceMount);

    // Assemble hierarchy
    this.root.add(this.auraGroup);
    this.root.add(this.weaponGroup);
    this.root.add(this.bodyGroup);
    this.root.add(this.armsGroup);
    this.root.add(this.headGroup);

    // Build default procedural placeholder meshes (will be replaced or overlaid with actual PNG sprites)
    this.buildDefaultMeshes(options.auraColor ?? 0x44ffaa);

    // Facing direction
    this.setFacing(this.facing);

    // Action controller
    this.actionController = new ActionController();
    if (options.initialAction) {
      this.actionController.playAction(options.initialAction);
    }
  }

  private buildDefaultMeshes(auraColorHex: number): void {
    // 1. Aura glow plane
    const auraGeo = new THREE.PlaneGeometry(360, 480);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColorHex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.name = "AuraMesh";
    this.auraGroup.add(auraMesh);

    // 2. Flying Sword (Weapon) plane: 320x60
    const swordGeo = new THREE.PlaneGeometry(320, 50);
    const swordMat = new THREE.MeshLambertMaterial({
      color: 0x33ddaa,
      side: THREE.DoubleSide
    });
    const swordMesh = new THREE.Mesh(swordGeo, swordMat);
    swordMesh.name = "FlyingSwordMesh";
    this.weaponGroup.add(swordMesh);

    // 3. Body (Adult Taoist Robe) plane: 200x320
    const bodyGeo = new THREE.PlaneGeometry(200, 320);
    const bodyMat = new THREE.MeshLambertMaterial({
      color: 0xeeffff,
      side: THREE.DoubleSide
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.name = "BodyMesh";
    this.bodyGroup.add(bodyMesh);

    // 4. Arms (Flowing Sleeves) plane: 140x90
    const armsGeo = new THREE.PlaneGeometry(140, 90);
    const armsMat = new THREE.MeshLambertMaterial({
      color: 0xddeeff,
      side: THREE.DoubleSide
    });
    const armsMesh = new THREE.Mesh(armsGeo, armsMat);
    armsMesh.name = "ArmsMesh";
    this.armsGroup.add(armsMesh);

    // 5. Head Base plane: 110x120
    const headGeo = new THREE.PlaneGeometry(110, 120);
    const headMat = new THREE.MeshLambertMaterial({
      color: 0xffe0cc,
      side: THREE.DoubleSide
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.name = "HeadMesh";
    headMesh.position.y = 190; // Placed on top of torso (5.5 heads tall proportion)
    this.headGroup.add(headMesh);
    this.faceMount.position.y = 190;
  }

  /**
   * Set horizontal facing direction ("left" | "right")
   */
  setFacing(facing: "left" | "right"): void {
    this.facing = facing;
    const absScaleX = Math.abs(this.root.scale.x || 1.0);
    this.root.scale.x = facing === "left" ? -absScaleX : absScaleX;
    if (this.modularAvatar) {
      this.modularAvatar.facing = facing;
    }
  }

  getFacing(): "left" | "right" {
    return this.facing;
  }

  /**
   * Play an action animation
   */
  playAction(action: PuppetActionType, durationMs?: number): void {
    this.actionController.playAction(action, durationMs);
    if (this.modularAvatar) {
      this.modularAvatar.playAction(mapPuppetToUniversalAction(action));
    }
  }

  getCurrentAction(): PuppetActionType {
    return this.actionController.getCurrentAction();
  }

  /**
   * Update puppet pose from ActionController
   */
  update(deltaTimeMs: number): void {
    if (this.disposed) return;

    const pose: ActionPose = this.actionController.update(deltaTimeMs);
    this.applyPose(pose);

    if (this.modularAvatar) {
      const timeMs = (this.root.userData.timeMs as number) || performance.now();
      const isSpeaking = !!this.root.userData.isSpeaking;
      const expr = (this.root.userData.currentExpression as string) || "normal";
      this.modularAvatar.setSpeechState(isSpeaking, isSpeaking ? "a" : "silence", isSpeaking ? 0.75 : 0);
      this.modularAvatar.setExpression(expr);
      this.modularAvatar.update(timeMs, deltaTimeMs / 1000);
    }
  }

  private applyPose(pose: ActionPose): void {
    // Body
    this.bodyGroup.position.y = pose.bodyOffsetY;
    this.bodyGroup.rotation.z = pose.bodyRotationZ;
    this.bodyGroup.scale.set(pose.bodyScaleX, pose.bodyScaleY, 1.0);

    // Head
    this.headGroup.position.y = pose.headOffsetY;
    this.headGroup.rotation.z = pose.headRotationZ;

    // Arms
    this.armsGroup.position.y = pose.armsOffsetY;
    this.armsGroup.rotation.z = pose.armsRotationZ;

    // Weapon
    this.weaponGroup.position.y = pose.weaponOffsetY;
    this.weaponGroup.position.x = pose.weaponOffsetX;
    this.weaponGroup.rotation.z = pose.weaponRotationZ;

    // Aura
    this.auraGroup.scale.set(pose.auraScale, pose.auraScale, 1.0);
    const auraMesh = this.auraGroup.getObjectByName("AuraMesh") as THREE.Mesh;
    if (auraMesh && auraMesh.material instanceof THREE.Material) {
      auraMesh.material.opacity = pose.auraOpacity;
    }

    // Expose active pose for headless rasterizer and shaders
    this.root.userData.currentPose = pose;
  }

  /**
   * Swap or attach Sprite texture to a specific layer mesh
   */
  setLayerMesh(layer: "body" | "weapon" | "arms" | "head", mesh: THREE.Mesh): void {
    const group = layer === "body" ? this.bodyGroup
      : layer === "weapon" ? this.weaponGroup
      : layer === "arms" ? this.armsGroup
      : this.headGroup;

    // Remove existing placeholder meshes in that group
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      if (child !== this.faceMount) {
        group.remove(child);
      }
    }
    group.add(mesh);
  }

  /**
   * Dispose all geometries and materials in this puppet
   */
  dispose(): void {
    this.disposed = true;
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
  }
}

export function mapPuppetToUniversalAction(action: PuppetActionType): UniversalActionType {
  switch (action) {
    case "cruise":
    case "entrance":
      return "hover_flight";
    case "idle":
      return "idle";
    case "talking":
      return "dialogue_calm";
    case "talking_intense":
      return "dialogue_intense";
    case "attack_slash":
    case "sword_barrage":
      return "slash_strike";
    case "cast_spell":
      return "cast_mudra";
    case "defend_block":
      return "barrier_defend";
    case "hurt_flinch":
      return "flinch_hit";
    case "taunt_smug":
      return "laugh_arrogant";
    case "shocked":
      return "shocked_retreat";
    case "bow_respect":
      return "bow_salute";
    default:
      return "idle";
  }
}
