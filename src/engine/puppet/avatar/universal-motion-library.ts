import { UniversalSkeleton, type BoneName } from "./universal-skeleton.js";

export type UniversalActionType =
  | "idle"
  | "hover_flight"
  | "dialogue_calm"
  | "dialogue_intense"
  | "draw_sword"
  | "slash_strike"
  | "cast_mudra"
  | "barrier_defend"
  | "flinch_hit"
  | "shocked_retreat"
  | "bow_salute"
  | "laugh_arrogant";

export interface UniversalPose {
  pelvisOffsetY: number;
  pelvisRotationZ: number;

  spineRotationZ: number;
  chestRotationZ: number;
  neckRotationZ: number;
  headRotationZ: number;

  armUpperL_RotZ: number;
  armForearmL_RotZ: number;
  handL_RotZ: number;

  armUpperR_RotZ: number;
  armForearmR_RotZ: number;
  handR_RotZ: number;

  thighL_RotZ: number;
  calfL_RotZ: number;
  footL_RotZ: number;

  thighR_RotZ: number;
  calfR_RotZ: number;
  footR_RotZ: number;

  externalWindX: number;
  externalSwayFactor: number;
  auraPulse: number;
}

export interface UniversalMotionClip {
  id: UniversalActionType;
  name: string;
  durationMs: number;
  isLoop: boolean;
  computePose: (progress: number, totalTimeMs: number) => UniversalPose;
}

/**
 * Universal Motion Library:
 * Standardized motion clips mapped directly to UniversalSkeleton hierarchy,
 * shared across all character archetypes (Male, Female, Muscular, Elder, Chibi).
 */
export class UniversalMotionLibrary {
  private static readonly clips = new Map<UniversalActionType, UniversalMotionClip>();

  static {
    this.registerDefaults();
  }

  static get(type: UniversalActionType): UniversalMotionClip {
    const clip = this.clips.get(type);
    if (!clip) return this.clips.get("idle")!;
    return clip;
  }

  static register(clip: UniversalMotionClip): void {
    this.clips.set(clip.id, clip);
  }

  /**
   * Apply computed pose directly to UniversalSkeleton bones
   */
  static applyPoseToSkeleton(skel: UniversalSkeleton, pose: UniversalPose): void {
    const setRot = (boneName: BoneName, rotZ: number) => {
      const bone = skel.bones.get(boneName);
      if (bone) bone.rotation.z = rotZ;
    };

    const pelvis = skel.bones.get("pelvis");
    if (pelvis) {
      pelvis.position.y = skel.proportions.pelvisY + pose.pelvisOffsetY;
      pelvis.rotation.z = pose.pelvisRotationZ;
    }

    setRot("spine", pose.spineRotationZ);
    setRot("chest", pose.chestRotationZ);
    setRot("neck", pose.neckRotationZ);
    setRot("head", pose.headRotationZ);

    setRot("arm_upper_l", pose.armUpperL_RotZ);
    setRot("arm_forearm_l", pose.armForearmL_RotZ);
    setRot("hand_l", pose.handL_RotZ);

    setRot("arm_upper_r", pose.armUpperR_RotZ);
    setRot("arm_forearm_r", pose.armForearmR_RotZ);
    setRot("hand_r", pose.handR_RotZ);

    setRot("thigh_l", pose.thighL_RotZ);
    setRot("calf_l", pose.calfL_RotZ);
    setRot("foot_l", pose.footL_RotZ);

    setRot("thigh_r", pose.thighR_RotZ);
    setRot("calf_r", pose.calfR_RotZ);
    setRot("foot_r", pose.footR_RotZ);
  }

  private static registerDefaults(): void {
    // 1. Idle (沉静呼吸)
    this.register({
      id: "idle",
      name: "静立呼吸 (Idle Breathing)",
      durationMs: 3200,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const phase = (timeMs % 3200) / 3200 * Math.PI * 2;
        const breatheY = Math.sin(phase) * 4.5;
        const chestSway = Math.sin(phase * 0.5) * 0.015;

        return {
          pelvisOffsetY: breatheY,
          pelvisRotationZ: chestSway * 0.4,
          spineRotationZ: chestSway * 0.6,
          chestRotationZ: chestSway,
          neckRotationZ: -chestSway * 0.5,
          headRotationZ: -chestSway * 0.5,

          armUpperL_RotZ: 0.05 + Math.sin(phase) * 0.02,
          armForearmL_RotZ: -0.05,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.05 - Math.sin(phase) * 0.02,
          armForearmR_RotZ: 0.05,
          handR_RotZ: 0,

          thighL_RotZ: -0.02,
          calfL_RotZ: 0.02,
          footL_RotZ: 0,

          thighR_RotZ: 0.02,
          calfR_RotZ: -0.02,
          footR_RotZ: 0,

          externalWindX: 0,
          externalSwayFactor: 1.0,
          auraPulse: 1.0 + Math.sin(phase) * 0.08
        };
      }
    });

    // 2. Hover Flight (御剑凌虚破空)
    this.register({
      id: "hover_flight",
      name: "御剑飞行 (Hover Flight)",
      durationMs: 2400,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const phase = (timeMs % 2400) / 2400 * Math.PI * 2;
        const floatY = Math.sin(phase) * 12;
        const flightPitch = -0.42 + Math.sin(phase + 0.3) * 0.035;

        return {
          pelvisOffsetY: floatY,
          pelvisRotationZ: flightPitch * 0.6,
          spineRotationZ: flightPitch * 0.3,
          chestRotationZ: flightPitch * 0.2,
          neckRotationZ: -flightPitch * 0.8, // Look forward
          headRotationZ: -flightPitch * 0.3,

          armUpperL_RotZ: 0.35, // Trailing wind
          armForearmL_RotZ: 0.25,
          handL_RotZ: 0.1,

          armUpperR_RotZ: -0.45, // Leading sword arm
          armForearmR_RotZ: 0.35,
          handR_RotZ: 0.2,

          thighL_RotZ: 0.25,
          calfL_RotZ: -0.35,
          footL_RotZ: 0.1,

          thighR_RotZ: -0.15,
          calfR_RotZ: -0.25,
          footR_RotZ: 0.35,

          externalWindX: -120, // Strong headwind
          externalSwayFactor: 2.2,
          auraPulse: 1.35 + Math.sin(phase) * 0.15
        };
      }
    });

    // 3. Dialogue Calm (淡然论道)
    this.register({
      id: "dialogue_calm",
      name: "从容论道 (Calm Dialogue)",
      durationMs: 2800,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const phase = (timeMs % 2800) / 2800 * Math.PI * 2;
        const gesture = Math.sin(phase) * 0.12;

        return {
          pelvisOffsetY: Math.sin(phase) * 2,
          pelvisRotationZ: 0.01,
          spineRotationZ: 0.02,
          chestRotationZ: 0.03,
          neckRotationZ: Math.sin(phase * 0.5) * 0.04,
          headRotationZ: Math.sin(phase * 0.5) * 0.03,

          armUpperL_RotZ: 0.08,
          armForearmL_RotZ: -0.15,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.25 - gesture, // Gentle hand gesture
          armForearmR_RotZ: 0.45 + gesture * 0.5,
          handR_RotZ: 0.1,

          thighL_RotZ: 0,
          calfL_RotZ: 0,
          footL_RotZ: 0,
          thighR_RotZ: 0,
          calfR_RotZ: 0,
          footR_RotZ: 0,

          externalWindX: 0,
          externalSwayFactor: 1.0,
          auraPulse: 1.0
        };
      }
    });

    // 4. Dialogue Intense (激昂叱咤)
    this.register({
      id: "dialogue_intense",
      name: "激昂叱咤 (Intense Dialogue)",
      durationMs: 1800,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const phase = (timeMs % 1800) / 1800 * Math.PI * 2;
        const lean = -0.18 + Math.sin(phase) * 0.04;

        return {
          pelvisOffsetY: 0,
          pelvisRotationZ: lean * 0.5,
          spineRotationZ: lean * 0.6,
          chestRotationZ: lean * 0.8,
          neckRotationZ: -lean * 0.7,
          headRotationZ: 0.05,

          armUpperL_RotZ: 0.35,
          armForearmL_RotZ: 0.25,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.65, // Forceful point
          armForearmR_RotZ: 0.20,
          handR_RotZ: 0.15,

          thighL_RotZ: 0.15,
          calfL_RotZ: -0.10,
          footL_RotZ: 0,
          thighR_RotZ: -0.15,
          calfR_RotZ: 0.10,
          footR_RotZ: 0,

          externalWindX: -25,
          externalSwayFactor: 1.5,
          auraPulse: 1.45
        };
      }
    });

    // 5. Slash Strike (腾空挥剑斩)
    this.register({
      id: "slash_strike",
      name: "拔剑劈斩 (Slash Strike)",
      durationMs: 700,
      isLoop: false,
      computePose: (prog) => {
        // Anticipation (0..0.25) -> Slash Strike (0.25..0.6) -> Recovery (0.6..1.0)
        let armR = 0;
        let chestZ = 0;
        let wind = 0;

        if (prog < 0.25) {
          const t = prog / 0.25;
          armR = 0.8 * t; // Raise sword high back
          chestZ = 0.2 * t;
        } else if (prog < 0.6) {
          const t = (prog - 0.25) / 0.35;
          armR = 0.8 - 2.1 * t; // Huge slash arc forward
          chestZ = 0.2 - 0.45 * t;
          wind = -220;
        } else {
          const t = (prog - 0.6) / 0.4;
          armR = -1.3 + 1.2 * t;
          chestZ = -0.25 + 0.25 * t;
        }

        return {
          pelvisOffsetY: Math.sin(prog * Math.PI) * 15,
          pelvisRotationZ: chestZ * 0.5,
          spineRotationZ: chestZ * 0.6,
          chestRotationZ: chestZ,
          neckRotationZ: -chestZ * 0.8,
          headRotationZ: 0,

          armUpperL_RotZ: 0.45,
          armForearmL_RotZ: 0.35,
          handL_RotZ: 0,

          armUpperR_RotZ: armR,
          armForearmR_RotZ: -0.3,
          handR_RotZ: -0.2,

          thighL_RotZ: 0.25,
          calfL_RotZ: -0.2,
          footL_RotZ: 0,
          thighR_RotZ: -0.35,
          calfR_RotZ: 0.25,
          footR_RotZ: 0,

          externalWindX: wind,
          externalSwayFactor: 2.8,
          auraPulse: 1.8
        };
      }
    });

    // 6. Cast Mudra (双手结印捏诀)
    this.register({
      id: "cast_mudra",
      name: "双手结印 (Cast Mudra)",
      durationMs: 1600,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const pulse = Math.sin(timeMs * 0.006) * 0.08;

        return {
          pelvisOffsetY: Math.sin(timeMs * 0.003) * 6,
          pelvisRotationZ: 0,
          spineRotationZ: 0.02,
          chestRotationZ: 0.03,
          neckRotationZ: -0.05,
          headRotationZ: 0,

          // Both arms meet in front of chest (捏指作印)
          armUpperL_RotZ: -0.55 + pulse,
          armForearmL_RotZ: -0.85,
          handL_RotZ: -0.2,

          armUpperR_RotZ: -0.55 - pulse,
          armForearmR_RotZ: 0.85,
          handR_RotZ: 0.2,

          thighL_RotZ: -0.15,
          calfL_RotZ: 0.15,
          footL_RotZ: 0,
          thighR_RotZ: 0.15,
          calfR_RotZ: -0.15,
          footR_RotZ: 0,

          externalWindX: 0,
          externalSwayFactor: 1.8,
          auraPulse: 1.6 + pulse * 2.5
        };
      }
    });

    // 7. Barrier Defend (罡气护体格挡)
    this.register({
      id: "barrier_defend",
      name: "罡气护体 (Barrier Defend)",
      durationMs: 1200,
      isLoop: true,
      computePose: () => {
        return {
          pelvisOffsetY: -12, // Sturdy crouch
          pelvisRotationZ: 0.1,
          spineRotationZ: 0.12,
          chestRotationZ: 0.15,
          neckRotationZ: -0.12,
          headRotationZ: 0,

          armUpperL_RotZ: -0.65, // Push left arm forward
          armForearmL_RotZ: 0.45,
          handL_RotZ: 0.35,

          armUpperR_RotZ: 0.25, // Shield close
          armForearmR_RotZ: -0.55,
          handR_RotZ: -0.2,

          thighL_RotZ: 0.35,
          calfL_RotZ: -0.45,
          footL_RotZ: 0.1,
          thighR_RotZ: -0.35,
          calfR_RotZ: 0.45,
          footR_RotZ: -0.1,

          externalWindX: 30,
          externalSwayFactor: 1.4,
          auraPulse: 2.2
        };
      }
    });

    // 8. Flinch Hit (受击倒退)
    this.register({
      id: "flinch_hit",
      name: "受击震退 (Flinch Hit)",
      durationMs: 500,
      isLoop: false,
      computePose: (prog) => {
        const fall = Math.sin(prog * Math.PI) * 0.45;
        return {
          pelvisOffsetY: -Math.sin(prog * Math.PI) * 20,
          pelvisRotationZ: fall * 0.8,
          spineRotationZ: fall * 0.9,
          chestRotationZ: fall,
          neckRotationZ: fall * 0.8,
          headRotationZ: fall * 0.5,

          armUpperL_RotZ: 0.75 * fall,
          armForearmL_RotZ: 0.5,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.75 * fall,
          armForearmR_RotZ: -0.5,
          handR_RotZ: 0,

          thighL_RotZ: 0.4 * fall,
          calfL_RotZ: -0.3 * fall,
          footL_RotZ: 0,
          thighR_RotZ: -0.4 * fall,
          calfR_RotZ: 0.3 * fall,
          footR_RotZ: 0,

          externalWindX: 180,
          externalSwayFactor: 3.2,
          auraPulse: 0.5
        };
      }
    });

    // 9. Shocked Retreat (骇然急退)
    this.register({
      id: "shocked_retreat",
      name: "骇然急退 (Shocked Retreat)",
      durationMs: 800,
      isLoop: false,
      computePose: (prog) => {
        const recoil = (1 - prog) * 0.35;
        return {
          pelvisOffsetY: Math.sin(prog * Math.PI) * 10,
          pelvisRotationZ: recoil * 0.6,
          spineRotationZ: recoil * 0.7,
          chestRotationZ: recoil * 0.8,
          neckRotationZ: -recoil * 0.9,
          headRotationZ: -recoil * 0.5,

          armUpperL_RotZ: 0.55,
          armForearmL_RotZ: 0.35,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.55,
          armForearmR_RotZ: -0.35,
          handR_RotZ: 0,

          thighL_RotZ: 0.25,
          calfL_RotZ: -0.2,
          footL_RotZ: 0,
          thighR_RotZ: -0.25,
          calfR_RotZ: 0.2,
          footR_RotZ: 0,

          externalWindX: 80,
          externalSwayFactor: 2.0,
          auraPulse: 1.1
        };
      }
    });

    // 10. Bow Salute (拱手执礼)
    this.register({
      id: "bow_salute",
      name: "拱手作揖 (Bow Salute)",
      durationMs: 1400,
      isLoop: false,
      computePose: (prog) => {
        const bow = Math.sin(prog * Math.PI) * 0.42;
        return {
          pelvisOffsetY: -bow * 8,
          pelvisRotationZ: -bow * 0.5,
          spineRotationZ: -bow * 0.7,
          chestRotationZ: -bow * 0.9,
          neckRotationZ: -bow * 0.5,
          headRotationZ: -bow * 0.2,

          armUpperL_RotZ: -0.65 * (bow / 0.42),
          armForearmL_RotZ: -0.75,
          handL_RotZ: -0.3,

          armUpperR_RotZ: -0.65 * (bow / 0.42),
          armForearmR_RotZ: 0.75,
          handR_RotZ: 0.3,

          thighL_RotZ: 0,
          calfL_RotZ: 0,
          footL_RotZ: 0,
          thighR_RotZ: 0,
          calfR_RotZ: 0,
          footR_RotZ: 0,

          externalWindX: 0,
          externalSwayFactor: 0.8,
          auraPulse: 1.0
        };
      }
    });

    // 11. Laugh Arrogant (狂妄仰天大笑)
    this.register({
      id: "laugh_arrogant",
      name: "狂妄大笑 (Laugh Arrogant)",
      durationMs: 1500,
      isLoop: true,
      computePose: (_prog, timeMs) => {
        const laughQuake = Math.sin(timeMs * 0.02) * 0.04;
        return {
          pelvisOffsetY: laughQuake * 10,
          pelvisRotationZ: 0.12,
          spineRotationZ: 0.15,
          chestRotationZ: 0.22 + laughQuake,
          neckRotationZ: 0.35 + laughQuake * 0.5, // Head tilted back
          headRotationZ: 0.15,

          armUpperL_RotZ: 0.35,
          armForearmL_RotZ: 0.45,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.45,
          armForearmR_RotZ: 0.65,
          handR_RotZ: 0,

          thighL_RotZ: -0.1,
          calfL_RotZ: 0.1,
          footL_RotZ: 0,
          thighR_RotZ: 0.1,
          calfR_RotZ: -0.1,
          footR_RotZ: 0,

          externalWindX: 0,
          externalSwayFactor: 1.5,
          auraPulse: 1.8
        };
      }
    });

    // 12. Draw Sword (拔剑出鞘)
    this.register({
      id: "draw_sword",
      name: "拔剑出鞘 (Draw Sword)",
      durationMs: 850,
      isLoop: false,
      computePose: (prog) => {
        const draw = Math.sin(prog * Math.PI);
        return {
          pelvisOffsetY: 0,
          pelvisRotationZ: 0.05,
          spineRotationZ: 0.08,
          chestRotationZ: 0.1,
          neckRotationZ: -0.05,
          headRotationZ: 0,

          armUpperL_RotZ: 0.25, // Hand on scabbard
          armForearmL_RotZ: 0.35,
          handL_RotZ: 0,

          armUpperR_RotZ: -0.85 * draw, // Reach for scabbard and pull
          armForearmR_RotZ: 0.65 * draw,
          handR_RotZ: 0.2,

          thighL_RotZ: 0.1,
          calfL_RotZ: -0.05,
          footL_RotZ: 0,
          thighR_RotZ: -0.1,
          calfR_RotZ: 0.05,
          footR_RotZ: 0,

          externalWindX: -60 * draw,
          externalSwayFactor: 1.8,
          auraPulse: 1.5
        };
      }
    });
  }
}
