import {
  type UniversalPose,
  type UniversalActionType,
  UniversalMotionLibrary
} from "./universal-motion-library.js";

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpAngle = (a: number, b: number, t: number): number => {
  // Shortest angular distance
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export class PoseBlendController {
  private currentAction: UniversalActionType = "idle";
  private actionElapsedMs = 0;

  // Crossfade state
  private isCrossfading = false;
  private fadeElapsedMs = 0;
  private fadeDurationMs = 200;
  private fromPose?: UniversalPose;

  playAction(action: UniversalActionType, currentPose?: UniversalPose, fadeDurationMs = 220): void {
    if (this.currentAction === action && !this.isCrossfading) {
      return;
    }

    if (currentPose && fadeDurationMs > 0) {
      this.isCrossfading = true;
      this.fadeElapsedMs = 0;
      this.fadeDurationMs = fadeDurationMs;
      this.fromPose = { ...currentPose };
    } else {
      this.isCrossfading = false;
      this.fromPose = undefined;
    }

    this.currentAction = action;
    this.actionElapsedMs = 0;
  }

  getCurrentAction(): UniversalActionType {
    return this.currentAction;
  }

  getActionElapsed(): number {
    return this.actionElapsedMs;
  }

  update(dtMs: number, totalTimeMs: number): UniversalPose {
    this.actionElapsedMs += dtMs;

    const clip = UniversalMotionLibrary.get(this.currentAction);
    const progress = clip.isLoop
      ? (this.actionElapsedMs % clip.durationMs) / clip.durationMs
      : Math.min(1.0, this.actionElapsedMs / clip.durationMs);

    const targetPose = clip.computePose(progress, totalTimeMs);

    if (!this.isCrossfading || !this.fromPose) {
      return targetPose;
    }

    this.fadeElapsedMs += dtMs;
    const rawT = Math.min(1.0, this.fadeElapsedMs / this.fadeDurationMs);
    const t = easeInOut(rawT);

    if (rawT >= 1.0) {
      this.isCrossfading = false;
      this.fromPose = undefined;
      return targetPose;
    }

    // Blend fromPose and targetPose
    const from = this.fromPose;
    return {
      pelvisOffsetY: lerp(from.pelvisOffsetY, targetPose.pelvisOffsetY, t),
      pelvisRotationZ: lerpAngle(from.pelvisRotationZ, targetPose.pelvisRotationZ, t),

      spineRotationZ: lerpAngle(from.spineRotationZ, targetPose.spineRotationZ, t),
      chestRotationZ: lerpAngle(from.chestRotationZ, targetPose.chestRotationZ, t),
      neckRotationZ: lerpAngle(from.neckRotationZ, targetPose.neckRotationZ, t),
      headRotationZ: lerpAngle(from.headRotationZ, targetPose.headRotationZ, t),

      armUpperL_RotZ: lerpAngle(from.armUpperL_RotZ, targetPose.armUpperL_RotZ, t),
      armForearmL_RotZ: lerpAngle(from.armForearmL_RotZ, targetPose.armForearmL_RotZ, t),
      handL_RotZ: lerpAngle(from.handL_RotZ, targetPose.handL_RotZ, t),

      armUpperR_RotZ: lerpAngle(from.armUpperR_RotZ, targetPose.armUpperR_RotZ, t),
      armForearmR_RotZ: lerpAngle(from.armForearmR_RotZ, targetPose.armForearmR_RotZ, t),
      handR_RotZ: lerpAngle(from.handR_RotZ, targetPose.handR_RotZ, t),

      thighL_RotZ: lerpAngle(from.thighL_RotZ, targetPose.thighL_RotZ, t),
      calfL_RotZ: lerpAngle(from.calfL_RotZ, targetPose.calfL_RotZ, t),
      footL_RotZ: lerpAngle(from.footL_RotZ, targetPose.footL_RotZ, t),

      thighR_RotZ: lerpAngle(from.thighR_RotZ, targetPose.thighR_RotZ, t),
      calfR_RotZ: lerpAngle(from.calfR_RotZ, targetPose.calfR_RotZ, t),
      footR_RotZ: lerpAngle(from.footR_RotZ, targetPose.footR_RotZ, t),

      externalWindX: lerp(from.externalWindX, targetPose.externalWindX, t),
      externalSwayFactor: lerp(from.externalSwayFactor, targetPose.externalSwayFactor, t),
      auraPulse: lerp(from.auraPulse, targetPose.auraPulse, t)
    };
  }
}
