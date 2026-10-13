import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  type ModularAvatarSpec,
  ModularAvatarSpecSchema,
  type CostumeSpec,
  type HairSpec,
  type SocketAttachment,
  type VisemeType
} from "../../../core/models/modular-character.js";
import { UniversalSkeleton, type SocketName } from "./universal-skeleton.js";
import { FaceMeshBuilder } from "./face-mesh-builder.js";
import { ModularCostumeRig } from "./modular-costume-rig.js";
import {
  type UniversalActionType,
  type UniversalPose
} from "./universal-motion-library.js";
import { PoseBlendController } from "./pose-blend-controller.js";
import { VerletChain } from "./verlet-physics.js";
import { AvatarAssetCatalog } from "./avatar-asset-catalog.js";

export interface ModularAvatarOptions {
  spec: ModularAvatarSpec | Record<string, unknown>;
  initialAction?: UniversalActionType;
  facing?: "left" | "right";
  isFlying?: boolean;
}

/**
 * ModularAvatar:
 * High-performance, declarative humanoid avatar assembled directly from a single JSON string/spec.
 * Integrates UniversalSkeleton, PoseBlendController, VerletChain Physics, and AvatarAssetCatalog.
 */
export class ModularAvatar {
  readonly spec: ModularAvatarSpec;
  readonly skeleton: UniversalSkeleton;
  readonly costumeRig: ModularCostumeRig;
  readonly blendController: PoseBlendController;

  // Multi-node Verlet physics chains for ultra-smooth cloth & hair
  readonly hairVerlet: VerletChain;
  readonly cloakVerlet: VerletChain;

  // Runtime state
  facing: "left" | "right";
  isFlying: boolean;
  currentExpression = "normal";
  isSpeaking = false;
  activeViseme: VisemeType = "silence";
  visemeOpenness = 0;

  private currentPose!: UniversalPose;

  constructor(options: ModularAvatarOptions) {
    this.spec = ModularAvatarSpecSchema.parse(options.spec);
    this.facing = options.facing ?? "right";
    this.isFlying = options.isFlying ?? false;

    this.skeleton = new UniversalSkeleton(this.spec.archetype);
    this.costumeRig = new ModularCostumeRig();
    this.blendController = new PoseBlendController();

    const p = this.skeleton.proportions;
    // Hair Verlet Chain (4 nodes)
    this.hairVerlet = new VerletChain({
      nodeCount: 4,
      segmentLength: (p.totalHeight * 0.44) / 3,
      drag: 0.05,
      gravity: 220
    });

    // Cloak Verlet Chain (5 nodes)
    this.cloakVerlet = new VerletChain({
      nodeCount: 5,
      segmentLength: (p.totalHeight * 0.55) / 4,
      drag: 0.04,
      gravity: 280
    });

    this.playAction(options.initialAction ?? "idle", 0);
  }

  get currentAction(): UniversalActionType {
    return this.blendController.getCurrentAction();
  }

  get actionElapsedMs(): number {
    return this.blendController.getActionElapsed();
  }

  /**
   * Play an action clip with smooth crossfade blending
   */
  playAction(action: UniversalActionType, fadeDurationMs = 220): void {
    this.blendController.playAction(action, this.currentPose, fadeDurationMs);
  }

  /**
   * Set speaking & lip-sync parameters
   */
  setSpeechState(isSpeaking: boolean, viseme: VisemeType = "silence", openness = 0): void {
    this.isSpeaking = isSpeaking;
    this.activeViseme = viseme;
    this.visemeOpenness = openness;
  }

  /**
   * Set facial expression (e.g. normal, angry, shocked, smug, hurt, battle)
   */
  setExpression(expr: string): void {
    this.currentExpression = expr;
  }

  /**
   * Hot-swap costume layers in real-time
   */
  updateCostume(partial: Partial<CostumeSpec>): void {
    Object.assign(this.spec.costume, partial);
  }

  /**
   * Hot-swap hairstyle and hair colors
   */
  updateHair(partial: Partial<HairSpec>): void {
    Object.assign(this.spec.hair, partial);
  }

  /**
   * Hot-swap or attach props to sockets
   */
  setSocketProp(socketName: SocketName, prop: SocketAttachment | undefined): void {
    if (socketName === "hand_r") this.spec.sockets.hand_r = prop;
    else if (socketName === "hand_l") this.spec.sockets.hand_l = prop;
    else if (socketName === "back") this.spec.sockets.back = prop;
    else if (socketName === "head_top") this.spec.sockets.head_top = prop;
    else if (socketName === "waist") this.spec.sockets.waist = prop;
    else if (socketName === "feet") this.spec.sockets.feet = prop;
  }

  /**
   * Export the current avatar state as a complete JSON object
   */
  exportSpec(): ModularAvatarSpec {
    return JSON.parse(JSON.stringify(this.spec));
  }

  /**
   * Export the current avatar state as a JSON string
   */
  toJSONString(pretty = true): string {
    return JSON.stringify(this.spec, null, pretty ? 2 : 0);
  }

  /**
   * Advance simulation time and update skeletal pose & dynamics
   */
  update(timeMs: number, dtSec = 0.016): void {
    const dtMs = dtSec * 1000;

    // 1. Compute blended pose with Crossfade transition
    this.currentPose = this.blendController.update(dtMs, timeMs);

    // 2. Apply pose to skeletal hierarchy
    const setRot = (boneName: any, rotZ: number) => {
      const bone = this.skeleton.bones.get(boneName);
      if (bone) bone.rotation.z = rotZ;
    };

    const pelvis = this.skeleton.bones.get("pelvis");
    if (pelvis) {
      pelvis.position.y = this.skeleton.proportions.pelvisY + this.currentPose.pelvisOffsetY;
      pelvis.rotation.z = this.currentPose.pelvisRotationZ;
    }

    setRot("spine", this.currentPose.spineRotationZ);
    setRot("chest", this.currentPose.chestRotationZ);
    setRot("neck", this.currentPose.neckRotationZ);
    setRot("head", this.currentPose.headRotationZ);

    setRot("arm_upper_l", this.currentPose.armUpperL_RotZ);
    setRot("arm_forearm_l", this.currentPose.armForearmL_RotZ);
    setRot("hand_l", this.currentPose.handL_RotZ);

    setRot("arm_upper_r", this.currentPose.armUpperR_RotZ);
    setRot("arm_forearm_r", this.currentPose.armForearmR_RotZ);
    setRot("hand_r", this.currentPose.handR_RotZ);

    setRot("thigh_l", this.currentPose.thighL_RotZ);
    setRot("calf_l", this.currentPose.calfL_RotZ);
    setRot("foot_l", this.currentPose.footL_RotZ);

    setRot("thigh_r", this.currentPose.thighR_RotZ);
    setRot("calf_r", this.currentPose.calfR_RotZ);
    setRot("foot_r", this.currentPose.footR_RotZ);

    // 3. Update Spring & Verlet secondary physics
    const windX = this.currentPose.externalWindX;
    this.costumeRig.updateDynamics(timeMs, windX);

    this.skeleton.applySecondaryDynamics(
      windX,
      this.currentPose.externalSwayFactor,
      timeMs
    );

    // Update Verlet physics chains
    const headT = this.skeleton.getBoneTransform2D("head");
    this.hairVerlet.setPin(headT.x, headT.y);
    this.hairVerlet.step(dtSec, windX * 2.5);

    const chestT = this.skeleton.getBoneTransform2D("chest");
    this.cloakVerlet.setPin(chestT.x, chestT.y);
    this.cloakVerlet.step(dtSec, windX * 3.0);
  }

  /**
   * Render the modular avatar onto a 2D Canvas context
   */
  render(ctx: SKRSContext2D, renderScale = 1.0): void {
    const p = this.skeleton.proportions;
    const finalScale = renderScale * (this.spec.heightScale || 1.0);

    ctx.save();
    ctx.scale(finalScale, finalScale);

    // Horizontal facing flip
    if (this.facing === "left") {
      ctx.scale(-1, 1);
    }

    const renderCtx = {
      timeMs: this.actionElapsedMs,
      skeleton: this.skeleton,
      facing: this.facing,
      isFlying: this.isFlying
    };

    // 1. Back Layers: Back weapon, flowing hair back, cloak
    // Check if custom registered component exists in AvatarAssetCatalog
    const registeredCloak = this.spec.costume.cloak
      ? AvatarAssetCatalog.get("cloak", this.spec.costume.cloak.assetId)
      : undefined;

    if (registeredCloak && this.spec.costume.cloak) {
      const chestT = this.skeleton.getBoneTransform2D("chest");
      ctx.save();
      ctx.translate(chestT.x, chestT.y);
      ctx.rotate(chestT.rotZ);
      registeredCloak.render(ctx, {
        proportions: p,
        palette: {
          primaryColor: this.spec.costume.cloak.primaryColor,
          accentColor: this.spec.costume.cloak.accentColor
        },
        timeMs: this.actionElapsedMs,
        physicsOffset: this.costumeRig.cloakSpring.position,
        facing: this.facing
      });
      ctx.restore();
    } else {
      this.costumeRig.renderBackLayers(ctx, this.spec.costume, this.spec.hair, this.spec.sockets, renderCtx);
    }

    // 2. Body Layers: Pants, boots, inner collar, outer robe, waist sash, flowing sleeves
    const registeredOuter = AvatarAssetCatalog.get("outer", this.spec.costume.outer.assetId);
    if (registeredOuter) {
      // Render body layers with modular registered outer robe
      this.costumeRig.renderBodyCostume(ctx, this.spec.costume, renderCtx);
    } else {
      this.costumeRig.renderBodyCostume(ctx, this.spec.costume, renderCtx);
    }

    // 3. Head & Facial Multi-Style Mesh
    const headT = this.skeleton.getBoneTransform2D("head");
    ctx.save();
    ctx.translate(headT.x, headT.y);
    ctx.rotate(headT.rotZ);

    FaceMeshBuilder.renderFace(ctx, this.spec.face, {
      headScale: p.headScale,
      timeMs: this.actionElapsedMs,
      isSpeaking: this.isSpeaking,
      activeViseme: this.activeViseme,
      visemeOpenness: this.visemeOpenness,
      expression: this.currentExpression
    });
    ctx.restore();

    // 4. Front Layers: Front hair bun/bangs, hairpin/crown, hand-held weapons, aura
    this.costumeRig.renderFrontLayers(ctx, this.spec.hair, this.spec.sockets, renderCtx);

    ctx.restore();
  }
}
