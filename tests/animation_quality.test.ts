import { describe, it, expect, vi } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as THREE from "three";
import { SpriteRig } from "../src/engine/puppet/sprite-rig.js";
import { ActionController } from "../src/engine/puppet/action-controller.js";
import { PuppetCharacter } from "../src/engine/puppet/puppet-character.js";
import { ThreeStage } from "../src/engine/stage/three-stage.js";
import { CameraController } from "../src/engine/camera/camera-controller.js";
import { VFXManager } from "../src/engine/vfx/screen-fx.js";
import { ScenePlayer, SceneEventScheduler } from "../src/engine/scene-player.js";
import { SpriteMeshRasterizer } from "../src/renderer/sprite-mesh-rasterizer.js";
import { HeadlessRenderer } from "../src/renderer/headless-renderer.js";
import { TimelineEventSchema } from "../src/core/models/dsl.js";

describe("Animation output quality", () => {
  it("keeps the source illustration upright in canvas coordinates", async () => {
    const source = createCanvas(80, 120); const paint = source.getContext("2d");
    paint.fillStyle = "#ff0000"; paint.fillRect(0, 0, 80, 60);
    paint.fillStyle = "#00ff00"; paint.fillRect(0, 60, 80, 60);
    const image = await loadImage(source.toBuffer("image/png"));
    const raster = new SpriteMeshRasterizer();
    const canvas = createCanvas(100, 140); const ctx = canvas.getContext("2d");
    ctx.translate(50, 130);
    raster.render(ctx, image, "meme_rooster", undefined, 1000, false, "normal", 80, 120);
    expect(Array.from(ctx.getImageData(50, 20, 1, 1).data)).toEqual([255, 0, 0, 255]);
    expect(Array.from(ctx.getImageData(50, 120, 1, 1).data)).toEqual([0, 255, 0, 255]);
    raster.dispose();
  });
  it("moves sleeve vertices independently while keeping the feet fixed", () => {
    const rig = new SpriteRig("han_tianzun", 896 / 1200);
    rig.update(undefined, 0);
    const before = rig.points.map(p => p.clone());
    const ctrl = new ActionController(); ctrl.playAction("cast_spell", 1000);
    rig.update(ctrl.update(500), 0);
    const sleeveId = rig.sourcePoints.findIndex(p => p.x > 0.8 && p.y > 0.32 && p.y < 0.4);
    expect(rig.points[sleeveId].distanceTo(before[sleeveId])).toBeGreaterThan(0.02);
    rig.sourcePoints.forEach((p, i) => {
      if (p.y > 0.95) expect(rig.points[i].distanceTo(before[i])).toBeLessThan(0.00001);
    });
    const weights = rig.mesh.geometry.getAttribute("skinWeight");
    for (let i = 0; i < weights.count; i++) {
      expect(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)).toBeCloseTo(1, 5);
    }
    rig.dispose();
  });

  it("changes rendered sleeve pixels with only the arm pose changed", async () => {
    const image = await loadImage("assets/characters/han_tianzun/normal.png");
    const raster = new SpriteMeshRasterizer();
    const canvas = createCanvas(600, 600); const ctx = canvas.getContext("2d");
    const ctrl = new ActionController(); ctrl.playAction("idle");
    const pose = ctrl.update(0);
    const render = (arm: number) => {
      ctx.clearRect(0, 0, 600, 600); ctx.save(); ctx.translate(300, 560);
      raster.render(ctx, image, "han_tianzun", { ...pose, armsRotationZ: arm }, 800, false, "normal", 380, 510);
      ctx.restore(); return ctx.getImageData(0, 0, 600, 600).data.slice();
    };
    const a = render(0), b = render(0.7);
    let changed = 0;
    for (let y = 160; y < 340; y++) for (let x = 100; x < 500; x++) {
      const i = (y * 600 + x) * 4;
      if (Math.abs(a[i + 3] - b[i + 3]) > 30 || Math.abs(a[i] - b[i]) > 30) changed++;
    }
    expect(changed).toBeGreaterThan(700);
    raster.dispose();
  });

  it("overlays camera and sound cues without adding silence or a second paired hit", () => {
    const scheduler = new SceneEventScheduler();
    const attack = TimelineEventSchema.parse({ type: "attack", attackerId: "han", targetId: "evil", skillType: "dash_slash" });
    scheduler.append(attack, 1200);
    const sound = TimelineEventSchema.parse({ type: "sfx", soundId: "sfx_sword_slash" });
    expect(scheduler.append(sound, 0)?.start).toBe(0);
    const camera = TimelineEventSchema.parse({ type: "camera", motion: "shake" });
    expect(scheduler.append(camera, 600)?.start).toBe(0);
    const hit = TimelineEventSchema.parse({ type: "hit", characterId: "evil" });
    expect(scheduler.append(hit, 800)).toBeUndefined();
    expect(scheduler.durationMs).toBe(1200);
    const talk = TimelineEventSchema.parse({ type: "dialogue", speakerId: "han", text: "结束" });
    expect(scheduler.append(talk, 2000)?.start).toBe(1200);
  });

  it.each(["thunder_strike", "sword_barrage", "dash_slash", "palm_strike"])(
    "%s has one impact, no premature damage, and clears effects before dialogue", skillType => {
      const stage = new ThreeStage({ viewportWidth: 1280, viewportHeight: 720 });
      const han = new PuppetCharacter({ id: "han", initialAction: "idle" });
      const evil = new PuppetCharacter({ id: "evil", initialAction: "idle" });
      stage.addActor("han", han.root, "mid_left"); stage.addActor("evil", evil.root, "mid_right", "left");
      const camera = new CameraController({ camera: stage.camera, layoutEngine: stage.layout, idleBreathing: false });
      const vfx = new VFXManager();
      const impact = vi.spyOn(vfx, "triggerHit");
      const attack = TimelineEventSchema.parse({ type: "attack", attackerId: "han", targetId: "evil", skillType, durationMs: 1200 });
      const dialogue = TimelineEventSchema.parse({ type: "dialogue", speakerId: "han", text: "道友，承让。" });
      const player = new ScenePlayer(stage, new Map([["han", han], ["evil", evil]]), camera, vfx,
        [{ ev: attack, start: 0, end: 1200, dur: 1200 }, { ev: dialogue, start: 1200, end: 3000, dur: 1800, voiceEnd: 2700 }]);
      for (let time = 0; time < 600; time += 40) player.update(time, 40);
      expect(impact).not.toHaveBeenCalled();
      expect(evil.root.userData.currentExpression).toBe("normal");
      for (let time = 600; time < 1200; time += 40) player.update(time, 40);
      expect(impact).toHaveBeenCalledTimes(1);
      player.update(1200, 40);
      expect(stage.userData.swordStream).toBeUndefined();
      expect(stage.userData.thunderArc).toBeUndefined();
      expect(evil.root.userData.knockbackX).toBe(0);
      expect(han.root.userData.isSpeaking).toBe(true);
      player.update(2750, 1550);
      expect(han.root.userData.isSpeaking).toBe(false);
      expect(camera.getZoom()).toBeCloseTo(1.12, 3);
      expect(impact).toHaveBeenCalledTimes(1);
      han.dispose(); evil.dispose(); stage.dispose(); vfx.dispose();
    });

  it("projects orthographic zoom and camera roll into the offline frame", () => {
    const stage = new ThreeStage({ viewportWidth: 640, viewportHeight: 480, cameraMode: "orthographic" });
    const renderer = new HeadlessRenderer({ width: 640, height: 480 });
    const camera = stage.camera as THREE.OrthographicCamera;
    camera.zoom = 2; camera.updateProjectionMatrix();
    expect(renderer.projectWorldToScreen(stage, 100, 0).x).toBeCloseTo(520, 4);
    camera.rotation.z = Math.PI / 2;
    const rotated = renderer.projectWorldToScreen(stage, 100, 0);
    expect(rotated.x).toBeCloseTo(320, 4);
    expect(rotated.y).toBeCloseTo(440, 4);
    renderer.dispose(); stage.dispose();
  });
});
