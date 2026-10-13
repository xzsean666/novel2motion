import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  LightningEffect,
  SwordTrailParticles,
  ScreenFlash,
  VFXManager,
  ThreeStage
} from "../src/engine/index.js";

describe("VFX Pipeline & Combat Visuals (TASK-115)", () => {
  describe("LightningEffect (九天玄雷)", () => {
    let lightning: LightningEffect;

    beforeEach(() => {
      lightning = new LightningEffect();
    });

    afterEach(() => {
      lightning.dispose();
    });

    it("should generate jagged procedural line geometry on strike", () => {
      expect(lightning.isActive()).toBe(false);

      const start = new THREE.Vector3(0, 900, 0);
      const target = new THREE.Vector3(150, -200, 0);

      lightning.strike(start, target, 300);
      expect(lightning.isActive()).toBe(true);
      expect(lightning.group.visible).toBe(true);

      const lineSegments = lightning.group.children[0] as THREE.LineSegments;
      const posAttr = lineSegments.geometry.getAttribute("position");
      expect(posAttr.count).toBeGreaterThan(10); // Multiple jagged points
    });

    it("should decay and automatically deactivate after duration", () => {
      const start = new THREE.Vector3(0, 500, 0);
      const end = new THREE.Vector3(0, 0, 0);
      lightning.strike(start, end, 200);

      lightning.update(100);
      expect(lightning.isActive()).toBe(true);

      lightning.update(150); // Total 250ms > 200ms
      expect(lightning.isActive()).toBe(false);
      expect(lightning.group.visible).toBe(false);
    });
  });

  describe("SwordTrailParticles (青竹蜂云剑灵力流光)", () => {
    let trail: SwordTrailParticles;

    beforeEach(() => {
      trail = new SwordTrailParticles({ maxParticles: 50, particleLifeMs: 200 });
    });

    afterEach(() => {
      trail.dispose();
    });

    it("should emit particles from sword coordinates", () => {
      expect(trail.getActiveCount()).toBe(0);

      const swordTip = new THREE.Vector3(120, 50, 0);
      trail.emit(swordTip, 8);

      expect(trail.getActiveCount()).toBe(8);
    });

    it("should age particles and deactivate them after lifespan", () => {
      trail.emit(new THREE.Vector3(0, 0, 0), 10);
      expect(trail.getActiveCount()).toBe(10);

      // Advance halfway
      trail.update(100);
      expect(trail.getActiveCount()).toBe(10);

      // Advance past life
      trail.update(250);
      expect(trail.getActiveCount()).toBe(0);
    });
  });

  describe("ScreenFlash (受击白闪)", () => {
    let flash: ScreenFlash;

    beforeEach(() => {
      flash = new ScreenFlash();
    });

    afterEach(() => {
      flash.dispose();
    });

    it("should trigger white flash and decay quadratically", () => {
      expect(flash.isActive()).toBe(false);
      flash.trigger(100, 0xffffff, 0.9);

      expect(flash.isActive()).toBe(true);
      expect(flash.mesh.visible).toBe(true);

      flash.update(50); // Halfway
      expect(flash.isActive()).toBe(true);

      flash.update(60); // Complete
      expect(flash.isActive()).toBe(false);
      expect(flash.mesh.visible).toBe(false);
    });
  });

  describe("VFXManager Integration with ThreeStage", () => {
    let stage: ThreeStage;
    let vfx: VFXManager;

    beforeEach(() => {
      stage = new ThreeStage({ viewportWidth: 1080, viewportHeight: 1920 });
      vfx = new VFXManager({ width: stage.width, height: stage.height });
      stage.addVFX(vfx.root);
    });

    afterEach(() => {
      vfx.dispose();
      stage.dispose();
    });

    it("should orchestrate combat hit flash and thunder strikes seamlessly", () => {
      vfx.triggerHit(true);
      expect(vfx.screenFlash.isActive()).toBe(true);

      const thunderStart = new THREE.Vector3(0, 800, 0);
      const thunderTarget = new THREE.Vector3(200, -100, 0);
      vfx.strikeThunder(thunderStart, thunderTarget, 300);

      expect(vfx.lightning.isActive()).toBe(true);

      // Update both
      vfx.update(150);
      expect(vfx.lightning.isActive()).toBe(true);

      vfx.update(300);
      expect(vfx.lightning.isActive()).toBe(false);
    });
  });
});
