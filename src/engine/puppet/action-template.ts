import { applyEasing } from "../../runtime/timeline-worker.js";
import type { ActionPose, SlashArcInfo } from "./action-controller.js";

export type MotionCategory = "base" | "dialogue" | "combat" | "emotion";

export interface MotionTemplate {
  id: string;
  name: string;
  category: MotionCategory;
  defaultDurationMs: number;
  isOneShot: boolean;
  computePose: (progress: number, totalTimeMs: number) => ActionPose;
}

/**
 * Universal Motion Template Registry:
 * Decouples actions from specific characters or dramas,
 * enabling any 2D/2.5D character model (xianxia, urban, or shared)
 * to execute a standardized repertoire of rich, fluid animations.
 */
export class MotionTemplateRegistry {
  private static readonly templates = new Map<string, MotionTemplate>();

  static register(template: MotionTemplate): void {
    this.templates.set(template.id, template);
  }

  static get(id: string): MotionTemplate | undefined {
    return this.templates.get(id);
  }

  static has(id: string): boolean {
    return this.templates.has(id);
  }

  static listAll(): MotionTemplate[] {
    return Array.from(this.templates.values());
  }

  static listByCategory(cat: MotionCategory): MotionTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.category === cat);
  }
}

// -----------------------------------------------------------------------------
// Universal Action Definitions
// -----------------------------------------------------------------------------

/** 1. Idle: Natural breathing, subtle body rise & fall, gentle robe drift */
const idleTemplate: MotionTemplate = {
  id: "idle",
  name: "静立呼吸 (Idle Breathing)",
  category: "base",
  defaultDurationMs: 3200,
  isOneShot: false,
  computePose: (progress: number, totalTimeMs: number) => {
    const cycle = (totalTimeMs % 3200) / 3200;
    const phase = cycle * Math.PI * 2;
    const breatheY = Math.sin(phase) * 3.5;
    const breathScale = Math.sin(phase) * 0.008;

    return {
      bodyOffsetY: breatheY,
      bodyRotationZ: Math.sin(phase * 0.5) * 0.012,
      bodyScaleX: 1.0 + breathScale,
      bodyScaleY: 1.0 - breathScale,

      headOffsetY: breatheY * 0.85,
      headRotationZ: Math.sin(phase * 0.5 + 0.3) * 0.015,

      armsOffsetY: breatheY * 0.9,
      armsRotationZ: -0.04 + Math.sin(phase) * 0.02,

      weaponOffsetY: -180 + breatheY * 0.5,
      weaponRotationZ: -0.04,
      weaponOffsetX: 0,

      auraScale: 1.0 + Math.sin(phase) * 0.06,
      auraOpacity: 0.55,
      robeFlutter: Math.sin(totalTimeMs * 0.003) * 0.05
    };
  }
};

/** 2. Hover Fly / Cruise: Forward aerodynamic flight pitch, flying sword / cloud float */
const hoverFlyTemplate: MotionTemplate = {
  id: "cruise",
  name: "御空飞行 (Hover Flight)",
  category: "base",
  defaultDurationMs: 2800,
  isOneShot: false,
  computePose: (progress: number, totalTimeMs: number) => {
    const phase = progress * Math.PI * 2;
    const bobY = Math.sin(phase) * 12;
    const basePitch = 0.45;
    const pitchWobble = Math.sin(phase + 0.4) * 0.035;

    return {
      bodyOffsetY: bobY,
      bodyRotationZ: -(basePitch + pitchWobble),
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: bobY * 0.9,
      headRotationZ: 0.07,

      armsOffsetY: bobY,
      armsRotationZ: -0.22,

      weaponOffsetY: bobY - 180,
      weaponRotationZ: -(basePitch + pitchWobble * 0.75),
      weaponOffsetX: 24,

      auraScale: 1.05 + Math.sin(phase * 2) * 0.08,
      auraOpacity: 0.65 + Math.sin(phase * 2) * 0.18,
      robeFlutter: Math.sin(totalTimeMs * 0.007) * 0.18
    };
  }
};

/** 3. Walk / Advance: Ground or mid-air deliberate approach stride */
const walkAdvanceTemplate: MotionTemplate = {
  id: "walk_advance",
  name: "步步紧逼 (Walk Advance)",
  category: "base",
  defaultDurationMs: 1600,
  isOneShot: false,
  computePose: (progress: number, totalTimeMs: number) => {
    const phase = progress * Math.PI * 2;
    // Step cadence (double frequency for 2 steps per cycle)
    const stepBob = Math.abs(Math.sin(phase)) * 8;
    const swayZ = Math.sin(phase) * 0.025;
    const armSwing = Math.sin(phase) * 0.28;

    return {
      bodyOffsetY: -stepBob,
      bodyRotationZ: -0.04 + swayZ,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: -stepBob * 0.8,
      headRotationZ: 0.03 - swayZ * 0.5,

      armsOffsetY: -stepBob,
      armsRotationZ: armSwing,

      weaponOffsetY: -175 - stepBob * 0.4,
      weaponRotationZ: -0.05,
      weaponOffsetX: 12,

      auraScale: 1.1,
      auraOpacity: 0.6,
      robeFlutter: Math.sin(phase) * 0.12
    };
  }
};

/** 4. Talking (Dialogue): Natural conversational communicative gesture & syllable nodding */
const talkingTemplate: MotionTemplate = {
  id: "talking",
  name: "自然交谈 (Conversational Dialogue)",
  category: "dialogue",
  defaultDurationMs: 2400,
  isOneShot: false,
  computePose: (progress: number, totalTimeMs: number) => {
    const cycle = totalTimeMs % 1200;
    const t = cycle / 1200;
    // Rhythmic head nodding with speech stress beats (2 nods per cycle)
    const headNod = Math.sin(t * Math.PI * 2) * 0.038;
    const nodY = Math.sin(t * Math.PI * 2) * 2.2;

    // Hand gesture: right arm lifts slightly in emphatic rhetorical gesture
    const gestureArm = -0.12 + Math.sin(t * Math.PI * 2) * 0.16;
    const bodyBob = Math.sin(t * Math.PI * 2) * 3.5;

    return {
      bodyOffsetY: bodyBob,
      bodyRotationZ: -0.025 + Math.sin(t * Math.PI * 2) * 0.012,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: nodY,
      headRotationZ: 0.06 + headNod,

      armsOffsetY: bodyBob + 4,
      armsRotationZ: gestureArm,

      weaponOffsetY: -180 + bodyBob * 0.5,
      weaponRotationZ: -0.1,
      weaponOffsetX: 10,

      auraScale: 1.12 + Math.sin(t * Math.PI * 2) * 0.08,
      auraOpacity: 0.72,

      headNodY: nodY,
      gestureArmRotZ: gestureArm,
      robeFlutter: Math.sin(totalTimeMs * 0.004) * 0.08
    };
  }
};

/** 5. Talking Intense: Passionate debate / stern declaration with firm gesture */
const talkingIntenseTemplate: MotionTemplate = {
  id: "talking_intense",
  name: "激昂宣示 (Intense Dialogue)",
  category: "dialogue",
  defaultDurationMs: 2000,
  isOneShot: false,
  computePose: (progress: number, totalTimeMs: number) => {
    const cycle = totalTimeMs % 900;
    const t = cycle / 900;
    const headNod = Math.sin(t * Math.PI * 2) * 0.06;
    const nodY = Math.sin(t * Math.PI * 2) * 3.8;
    const gestureArm = 0.25 + Math.sin(t * Math.PI * 2) * 0.28;
    const forwardLean = -0.08;

    return {
      bodyOffsetY: Math.sin(t * Math.PI * 2) * 4,
      bodyRotationZ: forwardLean + Math.sin(t * Math.PI * 2) * 0.02,
      bodyScaleX: 1.02,
      bodyScaleY: 1.0,

      headOffsetY: nodY,
      headRotationZ: 0.08 + headNod,

      armsOffsetY: 8,
      armsRotationZ: gestureArm,

      weaponOffsetY: -175,
      weaponRotationZ: -0.15,
      weaponOffsetX: 18,

      auraScale: 1.35 + Math.sin(t * Math.PI * 2) * 0.15,
      auraOpacity: 0.88,

      headNodY: nodY,
      gestureArmRotZ: gestureArm,
      robeFlutter: Math.sin(totalTimeMs * 0.008) * 0.15
    };
  }
};

/** 6. Attack Slash: Fast kinetic dash, anticipation recoil, crescent slash arc */
const attackSlashTemplate: MotionTemplate = {
  id: "attack_slash",
  name: "瞬影斩击 (Attack Slash)",
  category: "combat",
  defaultDurationMs: 650,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    let bodyOffset = 0;
    let armRot = 0;
    let weaponRot = -0.5;
    let weaponOffsetX = 0;
    let slashArcInfo: SlashArcInfo | undefined;

    if (progress < 0.3) {
      const t = applyEasing(progress / 0.3, "easeOut");
      bodyOffset = -25 * t;
      armRot = 0.6 * t;
      weaponRot = 0.2 * t;
      weaponOffsetX = -20 * t;
    } else if (progress < 0.6) {
      const t = applyEasing((progress - 0.3) / 0.3, "easeIn");
      bodyOffset = -25 + 90 * t;
      armRot = 0.6 - 1.4 * t;
      weaponRot = -0.1 - 0.7 * t;
      weaponOffsetX = -20 + 85 * t;

      slashArcInfo = {
        active: true,
        progress: t,
        arcAngle: -0.8 + t * 1.6,
        arcRadius: 180
      };
    } else {
      const t = applyEasing((progress - 0.6) / 0.4, "easeOut");
      bodyOffset = 65 - 65 * t;
      armRot = -0.8 + 0.8 * t;
      weaponRot = -0.8 + 0.3 * t;
      weaponOffsetX = 65 - 65 * t;
    }

    return {
      bodyOffsetY: 0,
      bodyRotationZ:
        progress < 0.3
          ? 0.1 * (progress / 0.3)
          : progress < 0.6
          ? 0.1 - 0.4 * ((progress - 0.3) / 0.3)
          : -0.3 * (1 - (progress - 0.6) / 0.4),
      bodyScaleX: 1.05,
      bodyScaleY: 0.98,

      headOffsetY: 0,
      headRotationZ: 0.15,

      armsOffsetY: 10,
      armsRotationZ: armRot,

      weaponOffsetY: -170,
      weaponRotationZ: weaponRot,
      weaponOffsetX,

      auraScale: 1.35,
      auraOpacity: 0.92,
      slashArc: slashArcInfo
    };
  }
};

/** 7. Sword Barrage / Multi-Strike: Mudra chanting seals then outward summoning thrust */
const swordBarrageTemplate: MotionTemplate = {
  id: "sword_barrage",
  name: "万剑齐发 (Sword Barrage)",
  category: "combat",
  defaultDurationMs: 850,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    let armRot = 0;
    let bodyRot = -0.1;
    let auraS = 1.0;

    if (progress < 0.4) {
      const mudraPhase = progress / 0.4;
      armRot = 0.5 + Math.sin(mudraPhase * Math.PI * 6) * 0.25;
      bodyRot = -0.05;
      auraS = 1.2 + mudraPhase * 0.4;
    } else if (progress < 0.7) {
      const thrustPhase = (progress - 0.4) / 0.3;
      armRot = 0.8 - thrustPhase * 1.2;
      bodyRot = -0.35;
      auraS = 1.8;
    } else {
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
};

/** 8. Cast Spell / Aura Surge: Levitation rise, dual arm invocation to skies */
const castSpellTemplate: MotionTemplate = {
  id: "cast_spell",
  name: "引诀施法 (Cast Spell)",
  category: "combat",
  defaultDurationMs: 800,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const t = Math.sin(progress * Math.PI);

    return {
      bodyOffsetY: 35 * t,
      bodyRotationZ: -0.14,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: 35 * t,
      headRotationZ: 0.0,

      armsOffsetY: 35 * t + 20 * t,
      armsRotationZ: 0.8 * t,

      weaponOffsetY: -190 + 20 * t,
      weaponRotationZ: -0.2,
      weaponOffsetX: 0,

      auraScale: 1.0 + 0.55 * t,
      auraOpacity: 0.5 + 0.5 * t
    };
  }
};

/** 9. Defend / Guard Block: Firm defensive stance, warding barrier pose */
const defendBlockTemplate: MotionTemplate = {
  id: "defend_block",
  name: "持兵御敌 (Defend Block)",
  category: "combat",
  defaultDurationMs: 900,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const t = Math.sin(progress * Math.PI);

    return {
      bodyOffsetY: -10 * t,
      bodyRotationZ: 0.15 * t,
      bodyScaleX: 1.08,
      bodyScaleY: 0.96,

      headOffsetY: -8 * t,
      headRotationZ: -0.05,

      armsOffsetY: 20 * t,
      armsRotationZ: 0.75 * t,

      weaponOffsetY: -160,
      weaponRotationZ: 0.6 * t,
      weaponOffsetX: -15,

      auraScale: 1.5 * t + 1.0,
      auraOpacity: 0.9 * t + 0.2
    };
  }
};

/** 10. Hurt Flinch: Kinetic recoil, spring recovery */
const hurtFlinchTemplate: MotionTemplate = {
  id: "hurt_flinch",
  name: "受创震退 (Hurt Flinch)",
  category: "combat",
  defaultDurationMs: 450,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const t = applyEasing(progress, "spring");
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
};

/** 11. Taunt / Smug: Confident chin lift, arms on hip swagger */
const tauntSmugTemplate: MotionTemplate = {
  id: "taunt_smug",
  name: "从容轻蔑 (Taunt Smug)",
  category: "emotion",
  defaultDurationMs: 1200,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const swagger = Math.sin(totalTimeMs * 0.006) * 0.08;
    const bob = Math.sin(totalTimeMs * 0.008) * 8;

    return {
      bodyOffsetY: bob,
      bodyRotationZ: 0.1 + swagger,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: bob * 0.8,
      headRotationZ: -0.15,

      armsOffsetY: bob,
      armsRotationZ: 0.45,

      weaponOffsetY: -180 + bob * 0.5,
      weaponRotationZ: 0.08,
      weaponOffsetX: -5,

      auraScale: 1.2,
      auraOpacity: 0.7
    };
  }
};

/** 12. Shocked / Step Back: Astonished recoil & defensive readiness */
const shockedTemplate: MotionTemplate = {
  id: "shocked",
  name: "惊骇戒备 (Shocked Recoil)",
  category: "emotion",
  defaultDurationMs: 900,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const ease = applyEasing(progress, "easeOut");
    const recoil = Math.sin(progress * Math.PI) * 18;

    return {
      bodyOffsetY: recoil * 0.6,
      bodyRotationZ: 0.18 * (1 - progress * 0.5),
      bodyScaleX: 0.96,
      bodyScaleY: 1.03,

      headOffsetY: recoil * 0.8,
      headRotationZ: 0.22 * (1 - progress * 0.5),

      armsOffsetY: -10 * (1 - ease),
      armsRotationZ: 0.35 * (1 - ease),

      weaponOffsetY: -185,
      weaponRotationZ: 0.15,
      weaponOffsetX: -20 * (1 - progress),

      auraScale: 0.85,
      auraOpacity: 0.4
    };
  }
};

/** 13. Bow Respect: Traditional martial/xianxia cupped fist salute */
const bowRespectTemplate: MotionTemplate = {
  id: "bow_respect",
  name: "抱拳行礼 (Salute Bow)",
  category: "emotion",
  defaultDurationMs: 1400,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
    const bowCurve = Math.sin(progress * Math.PI);

    return {
      bodyOffsetY: -6 * bowCurve,
      bodyRotationZ: -0.16 * bowCurve,
      bodyScaleX: 1.0,
      bodyScaleY: 1.0,

      headOffsetY: -12 * bowCurve,
      headRotationZ: -0.22 * bowCurve,

      armsOffsetY: 12 * bowCurve,
      armsRotationZ: 0.55 * bowCurve,

      weaponOffsetY: -175,
      weaponRotationZ: -0.12 * bowCurve,
      weaponOffsetX: 5,

      auraScale: 1.05,
      auraOpacity: 0.65
    };
  }
};

/** 14. Entrance: Swoop in with spring deceleration */
const entranceTemplate: MotionTemplate = {
  id: "entrance",
  name: "极速破空登场 (Entrance Swoop)",
  category: "base",
  defaultDurationMs: 750,
  isOneShot: true,
  computePose: (progress: number, totalTimeMs: number) => {
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
};

// Auto-register built-in motion templates
[
  idleTemplate,
  hoverFlyTemplate,
  walkAdvanceTemplate,
  talkingTemplate,
  talkingIntenseTemplate,
  attackSlashTemplate,
  swordBarrageTemplate,
  castSpellTemplate,
  defendBlockTemplate,
  hurtFlinchTemplate,
  tauntSmugTemplate,
  shockedTemplate,
  bowRespectTemplate,
  entranceTemplate
].forEach((t) => MotionTemplateRegistry.register(t));
