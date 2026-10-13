import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import {
  CameraController,
  CameraShake,
  IdleMotion,
  ThreeStage
} from "../src/engine/index.js";

describe("CameraController & Cinematic 3D Motions (TASK-112)", () => {
  describe("CameraShake", () => {
    let shake: CameraShake;

    beforeEach(() => {
      shake = new CameraShake();
    });

    it("should start inactive and report zero offsets", () => {
      expect(shake.isActive()).toBe(false);
      const offset = shake.update(16);
      expect(offset.offsetX).toBe(0);
      expect(offset.offsetY).toBe(0);
      expect(offset.offsetRotationZ).toBe(0);
    });

    it("should activate on trigger and decay to zero after duration", () => {
      shake.trigger("light"); // light duration is 250ms
      expect(shake.isActive()).toBe(true);

      const offsetMid = shake.update(50);
      expect(Math.abs(offsetMid.offsetX) + Math.abs(offsetMid.offsetY)).toBeGreaterThan(0);

      // Advance past duration
      shake.update(300);
      expect(shake.isActive()).toBe(false);

      const offsetEnd = shake.update(16);
      expect(offsetEnd.offsetX).toBe(0);
      expect(offsetEnd.offsetY).toBe(0);
    });

    it("should immediately stop on stop() call", () => {
      shake.trigger("heavy");
      expect(shake.isActive()).toBe(true);
      shake.stop();
      expect(shake.isActive()).toBe(false);
    });
  });

  describe("IdleMotion", () => {
    it("should generate sinusoidal vertical and rotational breathing offsets", () => {
      const idle = new IdleMotion({ amplitudeY: 8, periodMs: 2000, amplitudeRotationZ: 0.005 });
      const offset0 = idle.update(0);
      expect(offset0.offsetY).toBeCloseTo(0, 1);

      // Quarter period: 500ms -> sin(pi/2) = 1.0 -> offsetY should be close to amplitude (8)
      const offsetQuarter = idle.update(500);
      expect(offsetQuarter.offsetY).toBeCloseTo(8, 0.5);

      // Disable should return zero
      idle.setEnabled(false);
      const disabledOffset = idle.update(100);
      expect(disabledOffset.offsetY).toBe(0);
      expect(disabledOffset.offsetRotationZ).toBe(0);
    });
  });

  describe("CameraController Integration with ThreeStage", () => {
    let stage: ThreeStage;
    let controller: CameraController;

    beforeEach(() => {
      stage = new ThreeStage({
        viewportWidth: 1080,
        viewportHeight: 1920,
        fov: 45
      });
      controller = new CameraController({
        camera: stage.camera,
        baseCameraZ: stage.cameraZ,
        layoutEngine: stage.layout,
        idleBreathing: false // Disable idle during deterministic pan/zoom tests
      });
    });

    it("should initialize at center with neutral 1.0 zoom", () => {
      const pos = controller.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(controller.getZoom()).toBe(1.0);
      expect(pos.z).toBeCloseTo(stage.cameraZ, 1);
    });

    it("should smoothly pan to coordinates with easing", () => {
      // Pan to (200, 100) over 200ms
      controller.panTo(200, 100, 200, "linear");

      // Advance 100ms (50% progress)
      controller.update(100);
      const midPos = controller.getPosition();
      expect(midPos.x).toBeCloseTo(100, 1);
      expect(midPos.y).toBeCloseTo(50, 1);

      // Advance remaining 100ms
      controller.update(100);
      const finalPos = controller.getPosition();
      expect(finalPos.x).toBeCloseTo(200, 1);
      expect(finalPos.y).toBeCloseTo(100, 1);
    });

    it("should perform dolly zoom (adjusting camera distance along Z axis)", () => {
      // Zoom in to 2.0x over 200ms
      controller.zoomTo(2.0, 200, "linear");

      // Advance 200ms
      controller.update(200);
      expect(controller.getZoom()).toBeCloseTo(2.0, 2);

      // In perspective camera, 2.0x zoom means camera Z is halved (distance to Z=0 is half)
      const expectedZ = stage.cameraZ / 2.0;
      expect(stage.camera.position.z).toBeCloseTo(expectedZ, 1);
    });

    it("should focus on character slot", () => {
      controller.focusOnSlot("far_left", 1.5, 0); // instant
      controller.update(0);

      const pos = controller.getPosition();
      expect(pos.x).toBeCloseTo(-378, 1);
      expect(controller.getZoom()).toBe(1.5);
    });

    it("should apply shake offsets on top of camera position during combat", () => {
      controller.panTo(100, 50, 0); // instant pan
      controller.update(0);

      // Trigger heavy combat shake
      controller.triggerShake("heavy");
      expect(controller.shake.isActive()).toBe(true);

      // Camera position should now include shake noise
      controller.update(40);
      const cameraX = stage.camera.position.x;
      // It shouldn't be strictly 100 because of shake
      expect(cameraX).not.toBe(100);

      // After shake finishes
      controller.update(1000);
      expect(controller.shake.isActive()).toBe(false);
      controller.update(16);
      expect(stage.camera.position.x).toBeCloseTo(100, 1);
    });

    it("should reset smoothly back to origin", () => {
      controller.panTo(300, -200, 0);
      controller.zoomTo(1.8, 0);
      controller.update(0);

      controller.reset(0); // instant reset
      controller.update(0);

      const pos = controller.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(controller.getZoom()).toBe(1.0);
    });
  });

  describe("CameraController with Orthographic Camera", () => {
    it("should update orthoCamera.zoom when zooming", () => {
      const orthoStage = new ThreeStage({
        viewportWidth: 1080,
        viewportHeight: 1920,
        cameraMode: "orthographic"
      });
      const controller = new CameraController({
        camera: orthoStage.camera,
        idleBreathing: false
      });

      controller.zoomTo(1.6, 0);
      controller.update(0);

      const orthoCamera = orthoStage.camera as THREE.OrthographicCamera;
      expect(orthoCamera.zoom).toBeCloseTo(1.6, 2);

      orthoStage.dispose();
    });
  });
});
