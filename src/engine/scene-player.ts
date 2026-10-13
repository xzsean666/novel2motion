import type { TimelineEvent, AttackEvent } from "../core/models/dsl.js";
import { ThreeStage } from "./stage/three-stage.js";
import { PuppetCharacter } from "./puppet/puppet-character.js";
import type { PuppetActionType } from "./puppet/action-controller.js";
import { CameraController } from "./camera/camera-controller.js";
import { VFXManager } from "./vfx/screen-fx.js";

export interface TimedSceneEvent {
  ev: TimelineEvent;
  start: number;
  end: number;
  dur: number;
  voiceEnd?: number;
}

/** Camera and sound cues accompany the preceding story beat instead of adding silence. */
export class SceneEventScheduler {
  durationMs = 0;
  private beatStart = 0;
  private lastAttack: AttackEvent | undefined;

  startFor(ev: TimelineEvent): number {
    if (ev.type === "camera" || ev.type === "sfx") return this.beatStart;
    if (ev.type === "hit" && this.lastAttack?.targetId === ev.characterId) return this.beatStart;
    return this.durationMs;
  }

  append(ev: TimelineEvent, durationMs: number, voiceDurationMs?: number): TimedSceneEvent | undefined {
    const start = this.startFor(ev);
    if (ev.type === "hit" && this.lastAttack?.targetId === ev.characterId) return undefined;
    if (ev.type !== "camera" && ev.type !== "sfx") {
      this.beatStart = start;
      this.durationMs = start + durationMs;
      this.lastAttack = ev.type === "attack" ? ev : undefined;
    }
    return { ev, start, end: start + durationMs, dur: durationMs,
      voiceEnd: voiceDurationMs === undefined ? undefined : start + voiceDurationMs };
  }
}

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const ease = (n: number): number => { const t = clamp(n); return t * t * (3 - 2 * t); };

export class ScenePlayer {
  private active: TimedSceneEvent | undefined;
  private readonly entered = new Set<TimedSceneEvent>();
  private readonly impacted = new Set<TimedSceneEvent>();

  constructor(private readonly stage: ThreeStage,
    private readonly puppets: Map<string, PuppetCharacter>,
    private readonly camera: CameraController,
    private readonly vfx: VFXManager,
    private readonly events: TimedSceneEvent[],
    private readonly names: Map<string, string> = new Map()) {}

  update(timeMs: number, dt: number): void {
    const stage = this.stage;
    stage.userData.timeMs = timeMs;
    stage.userData.activeSubtitle = undefined;
    stage.userData.actionLines = undefined;
    stage.userData.thunderArc = undefined;
    stage.userData.swordStream = undefined;
    stage.userData.slashWave = undefined;
    let index = 0;
    for (const puppet of this.puppets.values()) {
      const isSwordCultivator = puppet.id.includes("han") || puppet.id.includes("hero_m");
      Object.assign(puppet.root.userData, {
        isSpeaking: false,
        speakerFocus: false,
        hitFlash: false,
        jitterX: 0,
        jitterY: 0,
        motionOffsetX: 0,
        motionOffsetY: 0,
        knockbackX: 0,
        rotationZ: Math.sin(timeMs * 0.002 + index * 1.5) * 0.035, // Natural wind tilt (~2 deg)
        motionScale: 1,
        auraPulse: 1.0,
        dashTrail: false,
        proceduralSword: isSwordCultivator,
        floatOffsetY: Math.sin(timeMs * 0.0022 + index++ * 1.8) * Math.min(20, stage.height * 0.015) // Lively floating bobbing
      });
    }

    const active = this.events.find(t => t.ev.type !== "camera" && t.ev.type !== "sfx"
      && timeMs >= t.start && timeMs < t.end);
    if (active !== this.active) {
      this.active = active;
      for (const p of this.puppets.values()) {
        p.playAction("idle"); p.root.userData.currentExpression = "normal";
      }
      this.camera.reset(450);
      if (active) this.enter(active);
    }

    // Explicit camera cues run once, after the beat's default framing.
    for (const t of this.events) {
      if (t.ev.type !== "camera" || t.start > timeMs || this.entered.has(t)) continue;
      this.entered.add(t);
      const ev = t.ev;
      if (ev.motion === "shake") continue; // Hit timing owns combat shake.
      if (ev.motion === "reset") this.camera.reset(ev.durationMs);
      else {
        const actor = ev.targetCharacterId ? this.puppets.get(ev.targetCharacterId)?.root : undefined;
        if (actor) this.frameSpeaker(actor.position.x, actor.position.y, ev.zoomFactor, ev.durationMs);
        else if (ev.targetSlot) this.camera.focusOnSlot(ev.targetSlot, ev.zoomFactor, ev.durationMs);
        else this.camera.zoomTo(ev.zoomFactor, ev.durationMs);
      }
    }

    if (active) {
      const ev = active.ev;
      const elapsed = timeMs - active.start;
      if (ev.type === "dialogue" || ev.type === "narration") {
        const popScale = elapsed < 160 ? 1.0 + (1 - elapsed / 160) * 0.06 : 1.0;
        stage.userData.activeSubtitle = { text: ev.text,
          style: ev.type === "dialogue" ? ev.subtitleStyle : "narration_white",
          speakerName: ev.type === "dialogue" ? this.names.get(ev.speakerId) ?? ev.speakerId : "",
          popScale };
        if (ev.type === "dialogue") {
          const p = this.puppets.get(ev.speakerId);
          if (p) {
            p.root.userData.isSpeaking = timeMs < (active.voiceEnd ?? active.end - 180);
            p.root.userData.speakerFocus = p.root.userData.isSpeaking;
          }
        }
      } else if (ev.type === "attack") {
        this.attack(active, elapsed);
      } else if (ev.type === "hit") {
        const p = this.puppets.get(ev.characterId);
        if (p) p.root.userData.hitFlash = elapsed < 90;
      }
    }
    for (const p of this.puppets.values()) p.update(dt);
    this.camera.update(dt);
    this.vfx.update(dt);
  }

  private frameSpeaker(x: number, y: number, zoom: number, duration: number): void {
    const h = this.stage.height;
    this.camera.panTo(x * 0.70, y + h * 0.08, duration);
    this.camera.zoomTo(Math.min(zoom, this.stage.width > h ? 1.65 : 1.45), duration);
  }

  private enter(t: TimedSceneEvent): void {
    const ev = t.ev;
    if (ev.type === "dialogue") {
      const p = this.puppets.get(ev.speakerId);
      if (p) {
        const action: PuppetActionType = ev.memeFace === "angry" ? "talking_intense" : "talking";
        p.playAction(action);
        p.root.userData.currentExpression = ev.memeFace;
        this.frameSpeaker(p.root.position.x, p.root.position.y, 1.12, 650);
      }
    } else if (ev.type === "attack") {
      const p = this.puppets.get(ev.attackerId);
      const action: PuppetActionType =
        ev.skillType === "thunder_strike"
          ? "cast_spell"
          : ev.skillType === "shield_barrier"
          ? "defend_block"
          : ev.skillType === "sword_barrage"
          ? "sword_barrage"
          : "attack_slash";
      if (p) { p.playAction(action, t.dur); p.root.userData.currentExpression = "battle"; }
    } else if (ev.type === "hit") {
      const p = this.puppets.get(ev.characterId);
      if (p) {
        const action: PuppetActionType = ev.shockFace === "shocked" ? "shocked" : "hurt_flinch";
        p.playAction(action, t.dur);
        p.root.userData.currentExpression = ev.shockFace;
      }
      this.vfx.triggerHit(false); this.camera.triggerShake("light");
    }
  }

  private attack(t: TimedSceneEvent, elapsed: number): void {
    const ev = t.ev as AttackEvent;
    const attacker = this.puppets.get(ev.attackerId);
    const target = ev.targetId ? this.puppets.get(ev.targetId) : undefined;
    const direction = target && attacker ? Math.sign(target.root.position.x - attacker.root.position.x)
      : attacker?.root.userData.facing === "left" ? -1 : 1;
    const h = this.stage.height;
    const progress = elapsed / t.dur;
    if (ev.skillType === "shield_barrier") {
      if (attacker) attacker.root.userData.auraPulse = 1 + Math.sin(progress * Math.PI) * 1.1;
      return;
    }
    const impactTime = t.dur * 0.58;
    const afterHit = elapsed - impactTime;
    if (attacker) {
      const separation = target ? Math.abs(target.root.position.x - attacker.root.position.x) : h * 0.4;
      const travel = ev.skillType === "dash_slash" || ev.skillType === "palm_strike"
        ? Math.max(h * 0.1, separation - h * 0.3) : h * 0.08;
      const lunge = progress < 0.3 ? -ease(progress / 0.3) * h * 0.02
        : progress < 0.58 ? -h * 0.02 + ease((progress - 0.3) / 0.28) * (travel + h * 0.02)
        : travel * (1 - ease((progress - 0.58) / 0.42));
      attacker.root.userData.motionOffsetX = ev.skillType === "thunder_strike" ? 0 : lunge * direction;
      attacker.root.userData.auraPulse = 1 + Math.sin(progress * Math.PI) * 0.6;
      attacker.root.userData.dashTrail = progress > 0.42 && progress < 0.58;
    }
    if (elapsed >= impactTime && !this.impacted.has(t)) {
      this.impacted.add(t);
      this.vfx.triggerHit(ev.skillType === "thunder_strike");
      this.camera.triggerShake(ev.skillType === "thunder_strike" ? "heavy" : "light");
      if (target) { target.playAction("hurt_flinch", Math.max(200, t.end - t.start - impactTime));
        target.root.userData.currentExpression = "hurt"; }
    }
    if (target && afterHit >= 0) {
      target.root.userData.knockbackX = direction * h * 0.065 * Math.sin(clamp(afterHit / (t.dur - impactTime)) * Math.PI);
      target.root.userData.hitFlash = afterHit < 85;
    }
    const origin = attacker?.root.position;
    const destination = target?.root.position;
    const ox = origin?.x ?? -h * 0.2, oy = (origin?.y ?? 0) + h * 0.26;
    const tx = destination?.x ?? h * 0.2, ty = (destination?.y ?? 0) + h * 0.28;
    if (ev.skillType === "thunder_strike" && afterHit >= -80 && afterHit < 220) {
      this.stage.userData.thunderArc = { startX: tx - h * 0.1, startY: h * 0.55, targetX: tx, targetY: ty };
    } else if (ev.skillType === "sword_barrage" && progress >= 0.3 && progress < 0.72) {
      this.stage.userData.swordStream = { active: true, count: 12, originX: ox, originY: oy,
        targetX: tx, targetY: ty, elapsedMs: elapsed - t.dur * 0.3, travelMs: t.dur * 0.28 };
    } else if (ev.skillType === "dash_slash" && progress >= 0.26 && progress < 0.62) {
      this.stage.userData.slashWave = {
        active: true,
        originX: ox,
        originY: oy,
        targetX: tx,
        targetY: ty,
        progress: (progress - 0.26) / 0.36,
        direction,
        color: attacker?.root.userData.auraColor || "#00ffaa"
      };
    }
  }
}
