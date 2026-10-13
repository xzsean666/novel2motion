import * as THREE from "three";
import {
  ModularAvatarSpecSchema,
  type ModularAvatarSpec
} from "../../core/models/modular-character.js";
import {
  AvatarCommandTimelineSchema,
  type AvatarCommand,
  type AvatarCommandTimeline
} from "../../core/models/avatar-command.js";
import { GameCharacter3D } from "./game-character-3d.js";
import type { GameCharacter3DConfig } from "./types.js";
import type { Emotion3D, Pose3D, Viseme3D } from "./types.js";

export interface UniversalAvatar3DOptions {
  spec: ModularAvatarSpec | Record<string, unknown>;
  timeline?: AvatarCommandTimeline | Record<string, unknown>;
  facing?: "left" | "right";
  resolveProp?: (assetId: string) => THREE.Object3D;
}

type ActiveCommand = AvatarCommand & { end: number };
type PoseSnapshot = Array<{ node: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function mapFaceShape(spec: ModularAvatarSpec): GameCharacter3DConfig["faceShape"] {
  if (spec.archetype === "male_muscular") return "male_muscular";
  if (spec.archetype === "male_youth") return "male_shonen";
  if (spec.face.shape === "square_strong") return "male_muscular";
  if (spec.face.shape === "round_soft" || spec.face.shape === "chibi_round") {
    return spec.gender === "female" ? "female_maiden" : "male_shonen";
  }
  if (spec.gender === "female") return spec.archetype === "female_youth" ? "female_maiden" : "female_fairy";
  return "male_heroic";
}

function mapHair(spec: ModularAvatarSpec): GameCharacter3DConfig["hairStyle"] {
  if (spec.hair.backStyle === "high_ponytail") return "high_ponytail";
  if (spec.hair.backStyle === "twin_tails") return "celestial_buns";
  if (spec.archetype === "male_muscular") return "barbarian_wild";
  if (spec.hair.backStyle === "short_spiky") return "barbarian_wild";
  if (spec.hair.backStyle === "waist_flowing") return "flowing_long";
  return "daoist_topknot";
}

function mapOutfit(spec: ModularAvatarSpec): GameCharacter3DConfig["outfit"] {
  const outer = spec.costume.outer.assetId.toLowerCase();
  if (spec.archetype === "male_muscular" || outer.includes("beast")) return "barbarian_armor";
  if (spec.archetype === "male_youth" || outer.includes("flame") || outer.includes("red")) return "shonen_battlegarb";
  if (spec.gender === "female") return "fairy_silks";
  return "xianxia_robe";
}

function mapWeapon(spec: ModularAvatarSpec): GameCharacter3DConfig["weapon"] {
  const id = spec.sockets.hand_r?.propId.toLowerCase() ?? "";
  if (!id) return "none";
  if (id.includes("ice")) return "sword_ice";
  if (id.includes("spear") || id.includes("cleaver") || id.includes("blade")) return "totem_cleaver";
  if (id.includes("flame") || id.includes("fire")) return "sword_flame";
  return "sword_cyan";
}

function mapEmotion(value: string): Emotion3D {
  if (value === "battle" || value === "angry") return value;
  if (value === "happy" || value === "shocked" || value === "smug" || value === "hurt") return value;
  return "neutral";
}

function mapViseme(value: string): Viseme3D {
  return ["silence", "a", "i", "u", "e", "o", "m"].includes(value) ? value as Viseme3D : "silence";
}

function mapPose(clip: string): Pose3D {
  if (clip === "attack" || clip === "slash_strike" || clip === "draw_weapon") return "slash_strike";
  if (clip === "cast" || clip === "gesture_seal") return "cast_spell";
  if (clip === "fly" || clip === "hover_flight") return "sword_flight";
  if (clip === "defend") return "combat_ready";
  return "idle_stand";
}

/**
 * Three.js runtime adapter for the JSON character contract.
 * It deliberately keeps the JSON and frame state separate: the spec is stable,
 * while command playback mutates only the Object3D hierarchy.
 */
export class UniversalAvatar3D {
  readonly spec: ModularAvatarSpec;
  readonly model: GameCharacter3D;
  readonly root: THREE.Group;
  readonly timeline: AvatarCommandTimeline;

  private readonly commands: ActiveCommand[];
  private lastTimeMs = 0;
  private basePosition = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private currentAction = "idle";
  private readonly basePelvisY: number;
  private readonly resolveProp?: (assetId: string) => THREE.Object3D;
  private readonly propGroups = new Map<string, THREE.Group>();
  private readonly defaultHeadY: number;
  private currentMoveId?: string;
  private blendedFrom?: PoseSnapshot;
  private blendedTo?: PoseSnapshot;
  private blendStartMs = 0;
  private blendDurationMs = 0;

  constructor(options: UniversalAvatar3DOptions) {
    this.spec = ModularAvatarSpecSchema.parse(options.spec);
    this.resolveProp = options.resolveProp;
    this.timeline = AvatarCommandTimelineSchema.parse(options.timeline ?? {
      characterId: this.spec.id,
      commands: []
    });
    if (this.timeline.characterId !== this.spec.id) {
      throw new Error(`Avatar timeline characterId \"${this.timeline.characterId}\" does not match spec id \"${this.spec.id}\"`);
    }

    const config: GameCharacter3DConfig = {
      id: this.spec.id,
      name: this.spec.name,
      gender: this.spec.gender === "female" ? "female" : "male",
      faceShape: mapFaceShape(this.spec),
      hairStyle: mapHair(this.spec),
      outfit: mapOutfit(this.spec),
      weapon: mapWeapon(this.spec),
      heightScale: this.spec.heightScale,
      pose: "idle_stand",
      facing: options.facing ?? "right",
      emotion: mapEmotion(this.spec.face.expressions.defaultExpression),
      viseme: mapViseme(this.spec.face.mouth.currentViseme),
      visemeOpenness: this.spec.face.mouth.visemeOpenness,
      colors: {
        skinTone: this.spec.face.skinTone,
        hairColor: this.spec.hair.baseColor,
        primaryCostume: this.spec.costume.outer.primaryColor,
        accentCostume: this.spec.costume.outer.accentColor,
        weaponGlow: this.spec.sockets.aura.color
      }
    };

    this.model = new GameCharacter3D(config);
    this.root = this.model.root;
    this.root.name = `UniversalAvatar3D_${this.spec.id}`;
    this.root.userData.avatarSpec = this.spec;
    this.commands = this.timeline.commands
      .map((command) => ({ ...command, end: command.at + Math.max(command.duration, 1) }))
      .sort((a, b) => a.at - b.at);
    this.basePelvisY = this.model.pelvisNode.position.y;
    this.defaultHeadY = this.model.headNode.rotation.y;
    if (!this.resolveProp && this.timeline.commands.some((command) => command.type === "attach")) {
      throw new Error("Avatar timeline contains attach commands but no resolveProp callback was provided");
    }
    this.targetPosition.copy(this.root.position);
  }

  setFacing(facing: "left" | "right"): void {
    this.model.setFacing(facing);
  }

  update(timeMs: number, dtMs = 1000 / 60): void {
    const dt = Math.max(0, Math.min(100, dtMs));
    this.lastTimeMs = timeMs;

    const active = this.commands.filter((command) => timeMs >= command.at && timeMs < command.end);
    const play = [...active].reverse().find((command) => command.type === "play");
    const expression = [...active].reverse().find((command) => command.type === "expression");
    const speak = [...active].reverse().find((command) => command.type === "speak");
    const move = [...active].reverse().find((command) => command.type === "moveTo");
    const lookAt = [...active].reverse().find((command) => command.type === "lookAt");
    const attachments = this.commands.filter((command) => command.type === "attach" && timeMs >= command.at);

    if (play && play.type === "play") {
      if (play.clip !== this.currentAction) {
        this.blendedFrom = this.capturePose();
        this.currentAction = play.clip;
        this.model.setPose(mapPose(play.clip));
        this.blendedTo = this.capturePose();
        this.blendStartMs = timeMs;
        this.blendDurationMs = play.blendIn;
      }
    } else if (this.currentAction !== "idle") {
      this.blendedFrom = this.capturePose();
      this.currentAction = "idle";
      this.model.setPose("idle_stand");
      this.blendedTo = this.capturePose();
      this.blendStartMs = timeMs;
      this.blendDurationMs = 180;
    }
    this.applyPoseBlend(timeMs);

    if (expression && expression.type === "expression") {
      this.model.setEmotion(mapEmotion(expression.name), expression.weight);
    } else {
      this.model.setEmotion(mapEmotion(this.spec.face.expressions.defaultExpression));
    }

    if (speak && speak.type === "speak") {
      const phase = (timeMs - speak.at) / Math.max(1, speak.duration);
      const sequence: Viseme3D[] = ["a", "i", "o", "e", "u", "m"];
      const viseme = sequence[Math.floor(clamp01(phase) * sequence.length) % sequence.length];
      this.model.setViseme(viseme, 0.45 + 0.35 * Math.sin(timeMs * 0.025));
    } else {
      this.model.setViseme("silence", 0);
    }

    if (move && move.type === "moveTo") {
      if (move.id !== this.currentMoveId) {
        this.currentMoveId = move.id;
        this.basePosition.copy(this.root.position);
      }
      const raw = clamp01((timeMs - move.at) / Math.max(1, move.duration));
      const t = move.easing === "linear" ? raw : move.easing === "easeOutCubic"
        ? 1 - Math.pow(1 - raw, 3)
        : smoothstep(raw);
      this.targetPosition.set(move.to.x, move.to.y, move.to.z);
      this.root.position.lerpVectors(this.basePosition, this.targetPosition, t);
    } else {
      this.currentMoveId = undefined;
      this.basePosition.copy(this.root.position);
    }

    if (lookAt && lookAt.type === "lookAt") this.applyLookAt(lookAt.target, lookAt.weight);
    else this.model.headNode.rotation.y = this.defaultHeadY;

    this.applyAttachments(attachments);

    const phase = timeMs * 0.003;
    const breathe = Math.sin(phase) * 0.018;
    const actionPulse = this.currentAction === "attack" || this.currentAction === "slash_strike"
      ? Math.sin(clamp01((timeMs - (play?.at ?? 0)) / Math.max(1, play?.duration ?? 1)) * Math.PI)
      : 0;

    this.model.pelvisNode.position.y = this.basePelvisY + breathe * 0.08;
    this.model.chestNode.rotation.z = Math.sin(phase * 0.7) * 0.025 - actionPulse * 0.16;
    this.model.headNode.rotation.z = Math.sin(phase * 0.9) * 0.018 + actionPulse * 0.08;
    this.model.armRNode.rotation.z = actionPulse * -0.75;
    this.model.forearmRNode.rotation.z = actionPulse * -0.42;
    this.model.hairNode.rotation.z = Math.sin(phase * 1.4) * 0.035 + actionPulse * 0.08;
    this.model.costumeNode.rotation.z = Math.sin(phase * 1.2) * 0.018 - actionPulse * 0.04;
    this.root.userData.timeMs = timeMs;
    this.root.userData.deltaMs = dt;
    this.root.updateMatrixWorld(true);
  }

  exportSpec(): ModularAvatarSpec {
    return JSON.parse(JSON.stringify(this.spec));
  }

  toJSONString(pretty = true): string {
    return JSON.stringify(this.spec, null, pretty ? 2 : 0);
  }

  private capturePose(): PoseSnapshot {
    const nodes = [this.model.pelvisNode, this.model.spineNode, this.model.chestNode,
      this.model.neckNode, this.model.headNode, this.model.armLNode, this.model.forearmLNode,
      this.model.handLNode, this.model.armRNode, this.model.forearmRNode, this.model.handRNode,
      this.model.thighLNode, this.model.calfLNode, this.model.footLNode,
      this.model.thighRNode, this.model.calfRNode, this.model.footRNode];
    return nodes.map((node) => ({
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone()
    }));
  }

  private applyPoseBlend(timeMs: number): void {
    if (!this.blendedFrom || !this.blendedTo || this.blendDurationMs <= 0) return;
    const t = smoothstep((timeMs - this.blendStartMs) / this.blendDurationMs);
    for (let i = 0; i < this.blendedTo.length; i++) {
      const from = this.blendedFrom[i];
      const to = this.blendedTo[i];
      to.node.position.lerpVectors(from.position, to.position, t);
      to.node.quaternion.copy(from.quaternion).slerp(to.quaternion, t);
      to.node.scale.lerpVectors(from.scale, to.scale, t);
    }
    if (t >= 1) {
      this.blendedFrom = undefined;
      this.blendedTo = undefined;
    }
  }

  private applyLookAt(targetId: string, weight: number): void {
    const target = this.root.parent?.children.find((child) =>
      child.name === `UniversalAvatar3D_${targetId}` || child.name === `GameChar3D_${targetId}`
    );
    if (!target) return;
    const worldTarget = target.getWorldPosition(new THREE.Vector3());
    const localTarget = this.root.worldToLocal(worldTarget);
    const angle = Math.atan2(localTarget.x, Math.max(0.01, localTarget.z));
    this.model.headNode.rotation.y = this.defaultHeadY + Math.max(-0.45, Math.min(0.45, angle)) * weight;
  }

  private applyAttachments(commands: AvatarCommand[]): void {
    for (const command of commands) {
      if (command.type !== "attach") continue;
      const current = this.propGroups.get(command.socket);
      if (current?.userData.assetId === command.assetId) {
        current.visible = command.visible;
        continue;
      }
      if (current) current.parent?.remove(current);

      const socket = this.resolveSocket(command.socket);
      const group = new THREE.Group();
      group.name = `AvatarProp_${command.assetId}`;
      group.userData.assetId = command.assetId;
      group.visible = command.visible;
      group.add(this.resolveProp!(command.assetId));
      socket.add(group);
      this.propGroups.set(command.socket, group);
    }
  }

  private resolveSocket(socketName: string): THREE.Object3D {
    const sockets: Record<string, THREE.Object3D> = {
      socket_head_top: this.model.hairNode,
      socket_face: this.model.faceNode,
      socket_hand_l: this.model.handLNode,
      socket_hand_r: this.model.handRNode,
      socket_back: this.model.pelvisNode,
      socket_waist_l: this.model.pelvisNode,
      socket_waist_r: this.model.pelvisNode,
      socket_ground: this.model.mountNode
    };
    return sockets[socketName];
  }
}
