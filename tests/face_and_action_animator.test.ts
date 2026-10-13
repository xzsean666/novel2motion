import { describe, it, expect } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import * as THREE from "three";
import {
  FaceAnimator,
  getFaceRoi,
  CHARACTER_FACE_ROIS
} from "../src/engine/puppet/face-animator.js";
import { ActionController } from "../src/engine/puppet/action-controller.js";
import { PuppetCharacter } from "../src/engine/puppet/puppet-character.js";
import { ThreeStage } from "../src/engine/stage/three-stage.js";
import { HeadlessRenderer } from "../src/renderer/headless-renderer.js";

describe("FaceAnimator & Speaking Mouth Flap (TASK-126)", () => {
  it("should provide calibrated face & mouth ROIs for main characters", () => {
    const han = getFaceRoi("han_tianzun");
    expect(han.mouthY).toBeLessThan(0);
    expect(han.eyesY).toBeLessThan(han.mouthY);
    expect(han.mouthWidth).toBeGreaterThan(20);

    const evil = getFaceRoi("evil_lord");
    expect(evil.eyeSpan).toBeGreaterThan(30);

    const def = getFaceRoi("unknown_character");
    expect(def).toEqual(CHARACTER_FACE_ROIS.default);
  });

  it("should render talking mouth flapping during dialogue speech and quiet mouth when idle", () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext("2d");

    // 1. Render speaking mouth
    expect(() => {
      FaceAnimator.renderFace(ctx, {
        timeMs: 130, // Mid-speech open phase
        isSpeaking: true,
        expression: "normal",
        targetH: 720,
        targetW: 400,
        scale: 0.5,
        characterId: "han_tianzun"
      });
    }).not.toThrow();

    // 2. Render resting non-speaking mouth
    expect(() => {
      FaceAnimator.renderFace(ctx, {
        timeMs: 130,
        isSpeaking: false,
        expression: "normal",
        targetH: 720,
        targetW: 400,
        scale: 0.5,
        characterId: "han_tianzun"
      });
    }).not.toThrow();
  });

  it("should render on-face emotions directly on face (angry, shocked, hurt, happy)", () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext("2d");

    const exprList = ["angry", "shocked", "hurt", "happy", "smug"] as const;
    for (const expr of exprList) {
      expect(() => {
        FaceAnimator.renderFace(ctx, {
          timeMs: 1000,
          isSpeaking: true,
          expression: expr,
          targetH: 720,
          targetW: 400,
          scale: 0.5,
          characterId: "evil_lord"
        });
      }).not.toThrow();
    }
  });

  it("should simulate natural dynamic eye blinking cycle", () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext("2d");

    // Blinking occurs around phase < 120ms within 3400ms cycle
    expect(() => {
      FaceAnimator.renderFace(ctx, {
        timeMs: 50, // Mid-blink
        isSpeaking: false,
        expression: "normal",
        targetH: 720,
        targetW: 400,
        scale: 0.5,
        characterId: "hero_m"
      });
    }).not.toThrow();
  });
});

describe("ActionController Full-Body Motion State Machine (TASK-126)", () => {
  it("should compute rich talking pose with communicative forward lean and head nodding", () => {
    const ctrl = new ActionController();
    ctrl.playAction("talking");

    const pose = ctrl.update(200);
    expect(pose.bodyRotationZ).toBeLessThan(0); // Forward engagement lean
    expect(pose.headRotationZ).toBeDefined();
    expect(pose.armsRotationZ).toBeDefined();
    expect(pose.gestureArmRotZ).toBeDefined();
    expect(pose.headNodY).toBeDefined();
  });

  it("should compute sword slash attack pose with crescent slash arc", () => {
    const ctrl = new ActionController();
    ctrl.playAction("attack_slash");

    // Progress at 0.45 (peak strike window)
    const pose = ctrl.update(280);
    expect(pose.slashArc).toBeDefined();
    expect(pose.slashArc?.active).toBe(true);
    expect(pose.slashArc?.arcRadius).toBeGreaterThan(100);
  });

  it("should compute sword barrage, taunt smug, and entrance swooping poses", () => {
    const ctrl = new ActionController();

    ctrl.playAction("sword_barrage");
    const pose1 = ctrl.update(300);
    expect(pose1.auraScale).toBeGreaterThan(1.0);

    ctrl.playAction("taunt_smug");
    const pose2 = ctrl.update(200);
    expect(pose2.headRotationZ).toBeLessThan(0); // Chin proudly up

    ctrl.playAction("entrance");
    const pose3 = ctrl.update(100);
    expect(pose3.bodyRotationZ).toBeDefined();
  });

  it("should update PuppetCharacter root.userData.currentPose seamlessly", () => {
    const puppet = new PuppetCharacter({
      id: "test_actor",
      initialAction: "talking"
    });

    puppet.update(150);
    const pose = puppet.root.userData.currentPose;
    expect(pose).toBeDefined();
    expect(pose.bodyRotationZ).toBeDefined();
  });
});

describe("HeadlessRenderer with FaceAnimator & Action Pipeline (TASK-126)", () => {
  it("should render stage frame with speaking character and facial expressions to RGBA buffer", () => {
    const stage = new ThreeStage({ viewportWidth: 540, viewportHeight: 960 });
    const renderer = new HeadlessRenderer({ width: 540, height: 960 });

    const puppet = new PuppetCharacter({ id: "han_tianzun", facing: "right" });
    puppet.playAction("talking");
    puppet.root.userData.isSpeaking = true;
    puppet.root.userData.currentExpression = "angry";

    stage.addActor("han_tianzun", puppet.root, "center");
    stage.userData.timeMs = 350;

    const buf = renderer.renderFrame(stage);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(540 * 960 * 4);
  });
});
