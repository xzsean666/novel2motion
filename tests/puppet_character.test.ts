import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  PuppetCharacter,
  ActionController,
  ThreeStage
} from "../src/engine/index.js";

describe("PuppetCharacter Paper Doll Rig (TASK-113)", () => {
  describe("ActionController", () => {
    let controller: ActionController;

    beforeEach(() => {
      controller = new ActionController();
    });

    it("should start with cruise action and forward flight lean", () => {
      expect(controller.getCurrentAction()).toBe("cruise");
      const pose = controller.update(0);
      // Flight lean is negative rotationZ in radians (~ -0.48 rad)
      expect(pose.bodyRotationZ).toBeLessThan(-0.4);
      expect(pose.weaponOffsetY).toBeLessThan(-100); // Sword is below feet
    });

    it("should perform one-shot attack_slash and auto-return to cruise", () => {
      controller.playAction("attack_slash", 600);
      expect(controller.getCurrentAction()).toBe("attack_slash");

      // Mid strike at 300ms (progress = 0.5)
      const strikePose = controller.update(300);
      expect(strikePose.weaponOffsetX).toBeGreaterThan(0); // Lunge forward

      // End of attack slash at 301ms (total 601ms)
      controller.update(301);
      expect(controller.getCurrentAction()).toBe("cruise"); // Auto-transition back!
    });

    it("should compute hurt flinch with backward tilt and recover", () => {
      controller.playAction("hurt_flinch", 400);
      expect(controller.getCurrentAction()).toBe("hurt_flinch");

      const flinchPose = controller.update(50);
      // Flinch rotation tilts backward (positive rotationZ)
      expect(flinchPose.bodyRotationZ).toBeGreaterThan(0);

      // Finish flinch
      controller.update(360);
      expect(controller.getCurrentAction()).toBe("cruise");
    });

    it("should handle cast_spell levitation pose", () => {
      controller.playAction("cast_spell", 800);
      // At apex (400ms)
      const spellPose = controller.update(400);
      expect(spellPose.bodyOffsetY).toBeGreaterThan(20);
      expect(spellPose.armsRotationZ).toBeGreaterThan(0.5);
    });
  });

  describe("PuppetCharacter Structure & ThreeStage Integration", () => {
    let puppet: PuppetCharacter;

    beforeEach(() => {
      puppet = new PuppetCharacter({
        id: "han_tianzun",
        name: "韩立",
        facing: "right",
        initialAction: "cruise",
        auraColor: 0x33ffaa
      });
    });

    afterEach(() => {
      puppet.dispose();
    });

    it("should build 5.5-head tall hierarchical group with dedicated 2.5D depth offsets", () => {
      expect(puppet.root.name).toBe("Puppet_han_tianzun");
      expect(puppet.auraGroup.position.z).toBe(-5);
      expect(puppet.weaponGroup.position.z).toBe(-2);
      expect(puppet.bodyGroup.position.z).toBe(0);
      expect(puppet.armsGroup.position.z).toBe(2);
      expect(puppet.headGroup.position.z).toBe(4);
      expect(puppet.faceMount).toBeDefined();

      // Check head is placed at top (~190 units)
      const headMesh = puppet.headGroup.getObjectByName("HeadMesh");
      expect(headMesh).toBeDefined();
      expect(headMesh?.position.y).toBe(190);
    });

    it("should handle facing direction flipping correctly", () => {
      expect(puppet.getFacing()).toBe("right");
      expect(puppet.root.scale.x).toBeGreaterThan(0);

      puppet.setFacing("left");
      expect(puppet.getFacing()).toBe("left");
      expect(puppet.root.scale.x).toBeLessThan(0);
    });

    it("should animate parts when updated", () => {
      const initialSwordY = puppet.weaponGroup.position.y;
      puppet.update(250);
      // Sword and body should have bobbed
      expect(puppet.bodyGroup.rotation.z).not.toBe(0);
      expect(puppet.weaponGroup.position.y).not.toBe(0);
    });

    it("should support custom layer mesh replacement", () => {
      const customSword = new THREE.Mesh(
        new THREE.PlaneGeometry(350, 40),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );
      customSword.name = "CustomSword";
      puppet.setLayerMesh("weapon", customSword);

      expect(puppet.weaponGroup.getObjectByName("CustomSword")).toBe(customSword);
      expect(puppet.weaponGroup.getObjectByName("FlyingSwordMesh")).toBeUndefined();
    });

    it("should seamlessly integrate into ThreeStage actor layer", () => {
      const stage = new ThreeStage({ viewportWidth: 1080, viewportHeight: 1920 });
      stage.addActor("han_li", puppet.root, "far_left", "right", true);

      expect(stage.getActor("han_li")).toBe(puppet.root);
      expect(puppet.root.position.x).toBeCloseTo(-378, 1);

      // Animate puppet within stage lifecycle
      puppet.update(100);
      expect(puppet.bodyGroup.rotation.z).toBeLessThan(-0.4);

      stage.dispose();
    });
  });
});
