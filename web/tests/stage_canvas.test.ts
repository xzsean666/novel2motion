import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StageCanvasController } from "../src/components/StageCanvas.js";
import { PuppetCharacter } from "../../src/engine/puppet/puppet-character.js";

describe("Web 2.5D Stage Canvas & Interactions (TASK-122)", () => {
  let controller: StageCanvasController;
  let puppet: PuppetCharacter;

  beforeEach(() => {
    controller = new StageCanvasController({
      viewportWidth: 1080,
      viewportHeight: 1920
    });

    puppet = new PuppetCharacter({
      id: "char_han_li",
      initialAction: "fly_sword_forward"
    });

    controller.stage.addActor("char_han_li", puppet.root, "center");
  });

  afterEach(() => {
    controller.dispose();
  });

  it("should raycast and select actor at center of the viewport", () => {
    // Screen center in 1080x1920: (540, 960)
    // In StageLayoutEngine, baseline ground Y is at Y=0.66, flying altitude offset = +120
    // Ground Y = (0.5 - 0.66) * 1920 = -307.2, flying Y = -187.2
    // Screen Y = 960 - (-187.2) = 1147.2
    const hitActorId = controller.handlePointerDown(540, 1147, 1080, 1920);

    expect(hitActorId).toBe("char_han_li");
    expect(controller.interactions.getSelectedActorId()).toBe("char_han_li");
  });

  it("should drag actor and snap to the nearest slot on pointer release", () => {
    controller.interactions.startDrag("char_han_li");

    // Drag far to the right (world X = 350, close to far_right X=378)
    controller.interactions.dragToWorld(350, -187);

    const snappedRight = controller.handlePointerUp();
    expect(snappedRight).not.toBeNull();
    expect(snappedRight!.slot).toBe("far_right");
    expect(puppet.root.position.x).toBeCloseTo(378, 1);

    // Now drag to the left side (world X = -360, close to far_left X=-378)
    controller.interactions.startDrag("char_han_li");
    controller.interactions.dragToWorld(-360, -187);

    const snappedLeft = controller.handlePointerUp();
    expect(snappedLeft).not.toBeNull();
    expect(snappedLeft!.slot).toBe("far_left");
    expect(puppet.root.position.x).toBeCloseTo(-378, 1);
  });

  it("should toggle facing direction and scale", () => {
    controller.interactions.setSelectedActorId("char_han_li");

    const initialFacing = controller.stage.getActorPlacement("char_han_li")!.facing;
    expect(initialFacing).toBe("right");

    const flipped = controller.interactions.flipFacing();
    expect(flipped).toBe("left");
    expect(controller.stage.getActorPlacement("char_han_li")!.facing).toBe("left");
    expect(puppet.root.scale.x).toBeLessThan(0);

    // Scale
    controller.interactions.setScale(1.8);
    expect(Math.abs(puppet.root.scale.x)).toBeCloseTo(1.8, 2);
    expect(puppet.root.scale.y).toBeCloseTo(1.8, 2);
  });

  it("should advance playhead on tick during playback and pause accurately", () => {
    expect(controller.getIsPlaying()).toBe(false);
    expect(controller.getCurrentTimeMs()).toBe(0);

    controller.play();
    expect(controller.getIsPlaying()).toBe(true);

    controller.tick(50); // 50ms elapsed
    expect(controller.getCurrentTimeMs()).toBe(50);

    controller.tick(100);
    expect(controller.getCurrentTimeMs()).toBe(150);

    controller.pause();
    expect(controller.getIsPlaying()).toBe(false);

    controller.tick(100);
    expect(controller.getCurrentTimeMs()).toBe(150); // Did not change while paused

    controller.seek(2500);
    expect(controller.getCurrentTimeMs()).toBe(2500);
  });
});
