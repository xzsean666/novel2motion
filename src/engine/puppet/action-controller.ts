import { applyEasing } from "../../runtime/timeline-worker.js";
import { MotionTemplateRegistry } from "./action-template.js";

export type PuppetActionType =
  | "cruise"
  | "idle"
  | "talking"
  | "talking_intense"
  | "walk_advance"
  | "attack_slash"
  | "sword_barrage"
  | "cast_spell"
  | "defend_block"
  | "hurt_flinch"
  | "taunt_smug"
  | "shocked"
  | "bow_respect"
  | "entrance";

export interface ActionState {
  currentAction: PuppetActionType;
  baseAction: PuppetActionType; // Action to return to when one-shot completes
  elapsedMs: number;
  durationMs: number;
  isOneShot: boolean;
  progress: number; // 0..1
}

export interface SlashArcInfo {
  active: boolean;
  progress: number;
  arcAngle: number; // In radians
  arcRadius: number;
}

export interface ActionPose {
  bodyOffsetY: number;
  bodyRotationZ: number; // In radians
  bodyScaleX: number;
  bodyScaleY: number;

  headOffsetY: number;
  headRotationZ: number;

  armsOffsetY: number;
  armsRotationZ: number;

  weaponOffsetY: number;
  weaponRotationZ: number;
  weaponOffsetX: number;

  auraScale: number;
  auraOpacity: number;

  // Rich kinematic dynamics
  slashArc?: SlashArcInfo;
  headNodY?: number;
  gestureArmRotZ?: number;
  robeFlutter?: number;
}

/**
 * ActionController handles puppet motion states, transitions, and pose math
 */
export class ActionController {
  private lastPose: ActionPose | undefined;
  private transitionPose: ActionPose | undefined;
  private transitionElapsed = 0;
  private state: ActionState = {
    currentAction: "cruise",
    baseAction: "cruise",
    elapsedMs: 0,
    durationMs: 3000,
    isOneShot: false,
    progress: 0
  };

  private readonly oneShotDurations: Record<string, number> = {
    attack_slash: 650,
    sword_barrage: 850,
    cast_spell: 800,
    defend_block: 900,
    hurt_flinch: 450,
    taunt_smug: 1200,
    shocked: 900,
    bow_respect: 1400,
    entrance: 750
  };

  /**
   * Play an action (can be looping or one-shot)
   */
  playAction(action: PuppetActionType, durationMs?: number): void {
    this.transitionPose = this.lastPose;
    this.transitionElapsed = 0;

    const template = MotionTemplateRegistry.get(action);
    const isOneShot = template
      ? template.isOneShot
      : action === "attack_slash" ||
        action === "sword_barrage" ||
        action === "cast_spell" ||
        action === "defend_block" ||
        action === "hurt_flinch" ||
        action === "taunt_smug" ||
        action === "shocked" ||
        action === "bow_respect" ||
        action === "entrance";

    const defaultDur = template ? template.defaultDurationMs : (this.oneShotDurations[action] ?? 3000);
    const dur = durationMs ?? defaultDur;

    this.state = {
      currentAction: action,
      baseAction: isOneShot ? this.state.baseAction : action,
      elapsedMs: 0,
      durationMs: dur,
      isOneShot,
      progress: 0
    };
  }

  getCurrentAction(): PuppetActionType {
    return this.state.currentAction;
  }

  /**
   * Advance action timeline and compute pose parameters
   */
  update(deltaTimeMs: number): ActionPose {
    this.state.elapsedMs += deltaTimeMs;

    if (this.state.isOneShot) {
      this.state.progress = Math.min(1.0, this.state.elapsedMs / this.state.durationMs);
      if (this.state.progress >= 1.0) {
        // Return to base action
        this.playAction(this.state.baseAction);
      }
    } else {
      // Looping
      const cycle = this.state.elapsedMs % this.state.durationMs;
      this.state.progress = cycle / this.state.durationMs;
    }

    const pose = this.calculatePose(this.state.currentAction, this.state.progress, this.state.elapsedMs);
    this.transitionElapsed += deltaTimeMs;
    if (this.transitionPose && this.transitionElapsed < 180) {
      const t = applyEasing(this.transitionElapsed / 180, "easeInOut");
      const keys = ["bodyOffsetY", "bodyRotationZ", "bodyScaleX", "bodyScaleY",
        "headOffsetY", "headRotationZ", "armsOffsetY", "armsRotationZ",
        "weaponOffsetY", "weaponRotationZ", "weaponOffsetX", "auraScale", "auraOpacity"] as const;
      for (const key of keys) pose[key] = this.transitionPose[key] + (pose[key] - this.transitionPose[key]) * t;
    }
    this.lastPose = pose;
    return pose;
  }

  private calculatePose(action: PuppetActionType, progress: number, totalTimeMs: number): ActionPose {
    const template = MotionTemplateRegistry.get(action);
    if (template) {
      return template.computePose(progress, totalTimeMs);
    }

    switch (action) {
      case "cruise":
        return this.computeCruisePose(progress, totalTimeMs);
      case "talking":
        return this.computeTalkingPose(progress, totalTimeMs);
      case "attack_slash":
        return this.computeAttackSlashPose(progress);
      case "sword_barrage":
        return this.computeSwordBarragePose(progress);
      case "hurt_flinch":
        return this.computeHurtFlinchPose(progress);
      case "cast_spell":
        return this.computeCastSpellPose(progress);
      case "taunt_smug":
        return this.computeTauntSmugPose(progress, totalTimeMs);
      case "entrance":
        return this.computeEntrancePose(progress);
      case "idle":
      default:
        return this.computeIdlePose(progress, totalTimeMs);
    }
  }

  /**
   * Talking Pose: Forward communicative lean, head nodding to speech cadence, hand gesture
   */
  private computeTalkingPose(progress: number, totalTimeMs: number): ActionPose {
    const cycle = totalTimeMs % 1200;
    const t = cycle / 1200;
    // Rhythmic head nodding with speech stress beats (2 nods per cycle)
    const headNod = Math.sin(t * Math.PI * 2) * 0.045;
    const nodY = Math.sin(t * Math.PI * 2) * 2;

    // Hand gesture: right arm lifts slightly in emphatic rhetorical gesture
    const gestureArm = -0.14 + Math.sin(t * Math.PI * 2) * 0.18;

    // Body slightly bobbing and leaning forward (~0.16 rad)
    const bodyBob = Math.sin(t * Math.PI * 2) * 5;

    return {
      bodyOffsetY: bodyBob,
      bodyRotationZ: -0.035 + Math.sin(t * Math.PI * 2) * 0.015,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: nodY,
      headRotationZ: 0.08 + headNod, // Head nods up & down on syllables

      armsOffsetY: bodyBob + 6,
      armsRotationZ: gestureArm, // Expressive hand gestures

      weaponOffsetY: -180 + bodyBob * 0.5,
      weaponRotationZ: -0.12,
      weaponOffsetX: 10,

      auraScale: 1.15 + Math.sin(t * Math.PI * 2) * 0.1,
      auraOpacity: 0.75,

      headNodY: nodY,
      gestureArmRotZ: gestureArm,
      robeFlutter: Math.sin(totalTimeMs * 0.005) * 0.1
    };
  }

  /**
   * Sword Barrage Stance: Rapid mudra hand-seal flipping -> Arms thrust forward to summon swords
   */
  private computeSwordBarragePose(progress: number): ActionPose {
    let armRot = 0;
    let bodyRot = -0.1;
    let auraS = 1.0;

    if (progress < 0.4) {
      // Rapid mudra chanting: hands oscillate in front of chest
      const mudraPhase = progress / 0.4;
      armRot = 0.5 + Math.sin(mudraPhase * Math.PI * 6) * 0.25;
      bodyRot = -0.05;
      auraS = 1.2 + mudraPhase * 0.4;
    } else if (progress < 0.7) {
      // Commands swords forward: arms thrust outward
      const thrustPhase = (progress - 0.4) / 0.3;
      armRot = 0.8 - thrustPhase * 1.2;
      bodyRot = -0.35;
      auraS = 1.8;
    } else {
      // Powerful follow-through stance
      const recPhase = (progress - 0.7) / 0.3;
      armRot = -0.4 + recPhase * 0.2;
      bodyRot = -0.25 + recPhase * 0.15;
      auraS = 1.8 - recPhase * 0.5;
    }

    return {
      bodyOffsetY: Math.sin(progress * Math.PI) * 12,
      bodyRotationZ: bodyRot,
      bodyScaleX: 1.05,
      bodyScaleY: 1.0,

      headOffsetY: 0,
      headRotationZ: 0.1,

      armsOffsetY: 15,
      armsRotationZ: armRot,

      weaponOffsetY: -175,
      weaponRotationZ: bodyRot,
      weaponOffsetX: 20,

      auraScale: auraS,
      auraOpacity: 0.95
    };
  }

  /**
   * Taunt / Smug Pose: Self-satisfied swagger, arm on hip, chin lifted
   */
  private computeTauntSmugPose(progress: number, totalTimeMs: number): ActionPose {
    const swagger = Math.sin(totalTimeMs * 0.006) * 0.08;
    const bob = Math.sin(totalTimeMs * 0.008) * 8;

    return {
      bodyOffsetY: bob,
      bodyRotationZ: 0.1 + swagger, // Leaning back with swagger
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: bob * 0.8,
      headRotationZ: -0.15, // Chin tilted proudly upward

      armsOffsetY: bob,
      armsRotationZ: 0.45, // Hand on hip / robe flipped

      weaponOffsetY: -180 + bob * 0.5,
      weaponRotationZ: 0.08,
      weaponOffsetX: -5,

      auraScale: 1.2,
      auraOpacity: 0.7
    };
  }

  /**
   * Entrance Pose: High-speed swoop in from sky with spring deceleration
   */
  private computeEntrancePose(progress: number): ActionPose {
    const ease = applyEasing(progress, "spring");
    const lean = 0.48 * (1 - progress);

    return {
      bodyOffsetY: (1 - progress) * -60,
      bodyRotationZ: -0.42 * (1 - progress),
      bodyScaleX: 1.1 - 0.1 * ease,
      bodyScaleY: 0.95 + 0.05 * ease,

      headOffsetY: 0,
      headRotationZ: 0.12,

      armsOffsetY: -10 * (1 - progress),
      armsRotationZ: -0.35,

      weaponOffsetY: -180,
      weaponRotationZ: -lean,
      weaponOffsetX: 30 * (1 - progress),

      auraScale: 1.4,
      auraOpacity: 0.85
    };
  }

  /**
   * Cruise Pose: 5.5-head tall adult cultivator leaning ~30° forward, riding flying sword, sinusoidal float
   */
  private computeCruisePose(progress: number, totalTimeMs: number): ActionPose {
    const phase = progress * Math.PI * 2;
    // Sinusoidal vertical bobbing (amplitude 14px)
    const bobY = Math.sin(phase) * 14;
    // Flight pitch oscillation (28 deg ~ 0.49 rad forward lean +/- 0.05 rad)
    const basePitch = 0.48; // ~27.5 degrees forward lean
    const pitchWobble = Math.sin(phase + 0.5) * 0.04;

    return {
      bodyOffsetY: bobY,
      bodyRotationZ: -(basePitch + pitchWobble),
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: bobY * 0.9,
      headRotationZ: 0.08, // Head looks forward toward horizon

      armsOffsetY: bobY,
      armsRotationZ: -0.25, // Robe sleeves fluttering backward

      weaponOffsetY: bobY - 180, // Sword under feet
      weaponRotationZ: -(basePitch + pitchWobble * 0.8), // Sword aligned with flight angle
      weaponOffsetX: 25,

      auraScale: 1.0 + Math.sin(phase * 2) * 0.08,
      auraOpacity: 0.6 + Math.sin(phase * 2) * 0.2
    };
  }

  /**
   * Attack Slash: Lunges forward, sword points directly forward, arm slashes down with high-energy Slash Arc
   */
  private computeAttackSlashPose(progress: number): ActionPose {
    // 0.0..0.3: Anticipation (pull back)
    // 0.3..0.6: Lunge & Slash (fast forward thrust & crescent slash arc)
    // 0.6..1.0: Recovery (follow through)
    let bodyOffset = 0;
    let armRot = 0;
    let weaponRot = -0.5;
    let weaponOffsetX = 0;
    let slashArcInfo: SlashArcInfo | undefined;

    if (progress < 0.3) {
      const t = applyEasing(progress / 0.3, "easeOut");
      bodyOffset = -25 * t; // Pull back
      armRot = 0.6 * t; // Raise arm
      weaponRot = 0.2 * t;
      weaponOffsetX = -20 * t;
    } else if (progress < 0.6) {
      const t = applyEasing((progress - 0.3) / 0.3, "easeIn");
      bodyOffset = -25 + 90 * t; // Lunge forward
      armRot = 0.6 - 1.4 * t; // Slash down
      weaponRot = -0.1 - 0.7 * t; // Sword points forward
      weaponOffsetX = -20 + 85 * t;

      // Active sword slash arc during 0.3..0.6
      slashArcInfo = {
        active: true,
        progress: t,
        arcAngle: -0.8 + t * 1.6,
        arcRadius: 180
      };
    } else {
      const t = applyEasing((progress - 0.6) / 0.4, "easeOut");
      bodyOffset = 65 - 65 * t; // Return
      armRot = -0.8 + 0.8 * t;
      weaponRot = -0.8 + 0.3 * t;
      weaponOffsetX = 65 - 65 * t;
    }

    return {
      bodyOffsetY: 0,
      bodyRotationZ: progress < 0.3 ? 0.1 * (progress / 0.3)
        : progress < 0.6 ? 0.1 - 0.4 * ((progress - 0.3) / 0.3)
        : -0.3 * (1 - (progress - 0.6) / 0.4),
      bodyScaleX: 1.05,
      bodyScaleY: 0.98,

      headOffsetY: 0,
      headRotationZ: 0.15,

      armsOffsetY: 10,
      armsRotationZ: armRot,

      weaponOffsetY: -170,
      weaponRotationZ: weaponRot,
      weaponOffsetX: weaponOffsetX,

      auraScale: 1.3,
      auraOpacity: 0.9,
      slashArc: slashArcInfo
    };
  }

  /**
   * Hurt Flinch: Knocked back, wobbly pitch, compression deformation
   */
  private computeHurtFlinchPose(progress: number): ActionPose {
    const t = applyEasing(progress, "spring");
    // Knocked backward (+rotation leans back)
    const flinchRot = 0.45 * (1 - progress);
    const flinchX = -45 * (1 - progress);

    return {
      bodyOffsetY: 15 * (1 - progress),
      bodyRotationZ: flinchRot,
      bodyScaleX: 0.92 + 0.08 * t,
      bodyScaleY: 1.08 - 0.08 * t,

      headOffsetY: 20 * (1 - progress),
      headRotationZ: 0.35 * (1 - progress),

      armsOffsetY: 10,
      armsRotationZ: 0.5 * (1 - progress),

      weaponOffsetY: -190 - 30 * (1 - progress),
      weaponRotationZ: 0.2 * (1 - progress),
      weaponOffsetX: flinchX,

      auraScale: 0.7,
      auraOpacity: 0.3
    };
  }

  /**
   * Cast Spell: Levitate slightly higher, raise hands, glowing qi barrier
   */
  private computeCastSpellPose(progress: number): ActionPose {
    const t = Math.sin(progress * Math.PI);

    return {
      bodyOffsetY: 35 * t,
      bodyRotationZ: -0.15, // Upright dignified casting stance
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: 35 * t,
      headRotationZ: 0.0,

      armsOffsetY: 35 * t + 20 * t,
      armsRotationZ: 0.8 * t, // Raise arms to sky

      weaponOffsetY: -190 + 20 * t,
      weaponRotationZ: -0.2,
      weaponOffsetX: 0,

      auraScale: 1.0 + 0.5 * t,
      auraOpacity: 0.5 + 0.5 * t
    };
  }

  /**
   * Idle Breathing Pose (Standing / hovering gently)
   */
  private computeIdlePose(progress: number, totalTimeMs: number): ActionPose {
    const phase = progress * Math.PI * 2;
    const breatheY = Math.sin(phase) * 2;

    return {
      bodyOffsetY: breatheY,
      bodyRotationZ: Math.sin(phase) * 0.012,
      bodyScaleX: 1.0 + Math.sin(phase) * 0.003,
      bodyScaleY: 1.0 - Math.sin(phase) * 0.003,

      headOffsetY: breatheY * 0.8,
      headRotationZ: 0.02,

      armsOffsetY: breatheY,
      armsRotationZ: -0.05,

      weaponOffsetY: -180 + breatheY * 0.5,
      weaponRotationZ: -0.05,
      weaponOffsetX: 0,

      auraScale: 1.0 + Math.sin(phase) * 0.05,
      auraOpacity: 0.5
    };
  }
}
