import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  ThreeStage,
  StageLayoutEngine,
  StageLayerManager,
  STAGE_LAYERS,
  DEFAULT_SLOT_RATIOS
} from "../src/engine/index.js";

describe("ThreeStage & 5-Slot Layout Engine (TASK-111)", () => {
  describe("StageLayoutEngine", () => {
    let layout: StageLayoutEngine;

    beforeEach(() => {
      layout = new StageLayoutEngine({
        viewportWidth: 1080,
        viewportHeight: 1920,
        baselineYRatio: 0.66,
        flightAltitudeOffset: 120
      });
    });

    it("should accurately map all 5 canonical slots and ratios", () => {
      expect(layout.getSlotXRatio("far_left")).toBe(0.15);
      expect(layout.getSlotXRatio("mid_left")).toBe(0.32);
      expect(layout.getSlotXRatio("center")).toBe(0.50);
      expect(layout.getSlotXRatio("mid_right")).toBe(0.68);
      expect(layout.getSlotXRatio("far_right")).toBe(0.85);

      // Center should have world X = 0
      const centerWorld = layout.ratioToWorld(0.50, 0.50);
      expect(centerWorld.x).toBe(0);
      expect(centerWorld.y).toBe(0);

      // Far left world X: (0.15 - 0.5) * 1080 = -378
      const farLeftPos = layout.getSlotWorldPosition("far_left", false);
      expect(farLeftPos.x).toBeCloseTo(-378, 2);

      // Far right world X: (0.85 - 0.5) * 1080 = +378
      const farRightPos = layout.getSlotWorldPosition("far_right", false);
      expect(farRightPos.x).toBeCloseTo(378, 2);
    });

    it("should handle slot aliases seamlessly", () => {
      expect(layout.resolveSlot("left")).toBe("mid_left");
      expect(layout.resolveSlot("right")).toBe("mid_right");
      expect(layout.resolveSlot("farLeft")).toBe("far_left");
      expect(layout.resolveSlot("farRight")).toBe("far_right");
      expect(layout.resolveSlot("unknown_slot")).toBe("center");
    });

    it("should factor in baseline Y and flight altitude offset", () => {
      // baselineY = 0.66 -> world Y = (0.5 - 0.66) * 1920 = -0.16 * 1920 = -307.2
      const groundPos = layout.getSlotWorldPosition("center", false);
      expect(groundPos.y).toBeCloseTo(-307.2, 2);

      // Flying sword hover adds flightAltitudeOffset (+120)
      const flyingPos = layout.getSlotWorldPosition("center", true);
      expect(flyingPos.y).toBeCloseTo(-307.2 + 120, 2);
    });

    it("should compute facing directions and distances between slots", () => {
      expect(layout.getFacingDirection("far_left", "far_right")).toBe("right");
      expect(layout.getFacingDirection("mid_right", "mid_left")).toBe("left");
      expect(layout.getFacingDirection("center", "center")).toBe("right");

      const distance = layout.getSlotDistance("far_left", "far_right");
      // (0.85 - 0.15) * 1080 = 0.70 * 1080 = 756
      expect(distance).toBeCloseTo(756, 2);
    });

    it("should convert back and forth between ratio and world coordinates", () => {
      const originalX = 0.75;
      const originalY = 0.35;
      const world = layout.ratioToWorld(originalX, originalY);
      const ratio = layout.worldToRatio(world.x, world.y);
      expect(ratio.xRatio).toBeCloseTo(originalX, 4);
      expect(ratio.yRatio).toBeCloseTo(originalY, 4);
    });
  });

  describe("StageLayerManager (2.5D Depth Hierarchy)", () => {
    let layerMgr: StageLayerManager;

    beforeEach(() => {
      layerMgr = new StageLayerManager();
    });

    it("should create all 5 standard layers with exact Z depths and render order", () => {
      const farSky = layerMgr.getLayer("far_sky");
      expect(farSky.position.z).toBe(-500);
      expect(farSky.renderOrder).toBe(0);

      const midGround = layerMgr.getLayer("mid_ground");
      expect(midGround.position.z).toBe(-250);
      expect(midGround.renderOrder).toBe(10);

      const actors = layerMgr.getLayer("actors");
      expect(actors.position.z).toBe(0);
      expect(actors.renderOrder).toBe(20);

      const vfx = layerMgr.getLayer("vfx");
      expect(vfx.position.z).toBe(150);
      expect(vfx.renderOrder).toBe(30);

      const subtitles = layerMgr.getLayer("subtitles");
      expect(subtitles.position.z).toBe(300);
      expect(subtitles.renderOrder).toBe(40);
    });

    it("should support adding, removing and clearing layer objects", () => {
      const dummy = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
      layerMgr.addToLayer("actors", dummy);
      expect(layerMgr.getLayer("actors").children).toContain(dummy);

      layerMgr.removeFromLayer("actors", dummy);
      expect(layerMgr.getLayer("actors").children).not.toContain(dummy);

      layerMgr.addToLayer("vfx", dummy);
      layerMgr.clearLayer("vfx");
      expect(layerMgr.getLayer("vfx").children.length).toBe(0);
    });

    it("should calculate parallax depth factors", () => {
      const cameraZ = 2317.69;
      const actorFactor = layerMgr.getParallaxFactor("actors", cameraZ);
      expect(actorFactor).toBeCloseTo(1.0, 3);

      const skyFactor = layerMgr.getParallaxFactor("far_sky", cameraZ);
      // Sky is farther, moves slower -> factor < 1.0
      expect(skyFactor).toBeLessThan(1.0);
      expect(skyFactor).toBeCloseTo(cameraZ / (cameraZ - (-500)), 3);

      const vfxFactor = layerMgr.getParallaxFactor("vfx", cameraZ);
      // VFX is closer, moves faster -> factor > 1.0
      expect(vfxFactor).toBeGreaterThan(1.0);
    });
  });

  describe("ThreeStage Visual Stage", () => {
    let stage: ThreeStage;

    beforeEach(() => {
      stage = new ThreeStage({
        viewportWidth: 1080,
        viewportHeight: 1920,
        fov: 45
      });
    });

    afterEach(() => {
      stage.dispose();
    });

    it("should initialize 1080x1920 perspective stage with 1:1 pixel mapping at Z=0", () => {
      expect(stage.width).toBe(1080);
      expect(stage.height).toBe(1920);
      expect(stage.cameraMode).toBe("perspective");

      // Verify visible bounds at Z=0 match exact viewport pixel resolution!
      const boundsZ0 = stage.getVisibleBoundsAtZ(0);
      expect(boundsZ0.height).toBeCloseTo(1920, 1);
      expect(boundsZ0.width).toBeCloseTo(1080, 1);

      // Verify scene contains layers root and lights
      expect(stage.scene.getObjectByName("StageLayersRoot")).toBeDefined();
      expect(stage.scene.getObjectByName("StageAmbientLight")).toBeDefined();
      expect(stage.scene.getObjectByName("StageKeyLight")).toBeDefined();
    });

    it("should add actors with slot placement and facing direction", () => {
      const hanMesh = new THREE.Group();
      hanMesh.name = "HanTianzunMesh";

      stage.addActor("han_li", hanMesh, "far_left", "right", true);

      const placedActor = stage.getActor("han_li");
      expect(placedActor).toBe(hanMesh);
      expect(hanMesh.position.x).toBeCloseTo(-378, 1);
      expect(hanMesh.scale.x).toBeGreaterThan(0); // Facing right

      // Move actor to mid_right
      stage.setActorSlot("han_li", "mid_right");
      expect(hanMesh.position.x).toBeCloseTo(194.4, 1);

      // Change facing to left
      stage.setActorFacing("han_li", "left");
      expect(hanMesh.scale.x).toBeLessThan(0); // Flipped horizontally
    });

    it("should remove actors cleanly", () => {
      const evilMesh = new THREE.Group();
      stage.addActor("evil_lord", evilMesh, "far_right", "left");
      expect(stage.getActor("evil_lord")).toBeDefined();

      const removed = stage.removeActor("evil_lord");
      expect(removed).toBe(true);
      expect(stage.getActor("evil_lord")).toBeUndefined();
    });

    it("should support orthographic camera mode", () => {
      const orthoStage = new ThreeStage({
        viewportWidth: 1080,
        viewportHeight: 1920,
        cameraMode: "orthographic"
      });

      expect(orthoStage.cameraMode).toBe("orthographic");
      const bounds = orthoStage.getVisibleBoundsAtZ(0);
      expect(bounds.width).toBe(1080);
      expect(bounds.height).toBe(1920);

      orthoStage.dispose();
    });
  });
});
