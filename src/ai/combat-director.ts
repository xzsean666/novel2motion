import {
  AttackEvent,
  HitReactionEvent,
  CameraMotionEvent,
  SfxEvent,
  TimelineEvent
} from "../core/models/dsl.js";
import { StoryChunk } from "./story-chunk.js";

export interface CombatPairOptions {
  attackerId: string;
  targetId?: string;
  chunk: StoryChunk;
}

/**
 * Pairs offensive actions with defensive/hit reactions, screen shake, and sound effects.
 */
export function buildCombatSequence(options: CombatPairOptions): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { attackerId, targetId, chunk } = options;

  let skillType: AttackEvent["skillType"] = "sword_barrage";
  let sfxId = chunk.suggestedSfx ?? "sfx_sword_slash";
  let vfxIntensity = 1.0;

  if (chunk.actionKeywords.includes("thunder")) {
    skillType = "thunder_strike";
    sfxId = "sfx_thunder_blast";
    vfxIntensity = 1.5;
  } else if (chunk.actionKeywords.includes("punch")) {
    skillType = "palm_strike";
    sfxId = "sfx_punch_heavy";
  } else if (chunk.actionKeywords.includes("slash")) {
    skillType = "dash_slash";
  }

  // 1. Attack Event
  const attack: AttackEvent = {
    type: "attack",
    attackerId,
    targetId,
    skillName: skillType,
    skillType,
    vfxIntensity,
    durationMs: 1200
  };
  events.push(attack);

  // 2. Sound Effect
  const sfx: SfxEvent = {
    type: "sfx",
    soundId: sfxId,
    volume: 1.0,
    delayMs: 696
  };
  events.push(sfx);

  // 3. Camera Shake
  const shake: CameraMotionEvent = {
    type: "camera",
    motion: "shake",
    zoomFactor: 1.0,
    shakeIntensity: 8 * vfxIntensity,
    durationMs: 600
  };
  events.push(shake);

  // 4. Paired Hit Reaction on Target
  if (targetId) {
    const hit: HitReactionEvent = {
      type: "hit",
      characterId: targetId,
      reaction: "white_flash",
      shockFace: "shocked",
      durationMs: 800
    };
    events.push(hit);
  }

  return events;
}
