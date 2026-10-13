import { describe, it, expect } from "vitest";
import { VerletChain } from "../src/engine/puppet/avatar/verlet-physics.js";
import { PoseBlendController } from "../src/engine/puppet/avatar/pose-blend-controller.js";
import { AvatarAssetCatalog } from "../src/engine/puppet/avatar/avatar-asset-catalog.js";
import { AvatarFactory } from "../src/engine/puppet/avatar/avatar-factory.js";
import { ModularAvatar } from "../src/engine/puppet/avatar/modular-avatar.js";
import { PRESET_HAN_LI } from "../src/engine/puppet/avatar/preset-avatars.js";
import { UniversalMotionLibrary } from "../src/engine/puppet/avatar/universal-motion-library.js";

describe("Industrial Modular Avatar Advanced Upgrade (TASK-132)", () => {
  describe("1. Multi-Node Verlet Chain Physics Simulator", () => {
    it("should initialize VerletChain with correct pinned roots and constraints", () => {
      const chain = new VerletChain({
        nodeCount: 4,
        segmentLength: 50,
        drag: 0.05,
        gravity: 200
      });

      expect(chain.points.length).toBe(4);
      expect(chain.constraints.length).toBe(3);
      expect(chain.points[0].pinned).toBe(true);
      expect(chain.points[1].pinned).toBe(false);
      expect(chain.points[3].y).toBe(150);
    });

    it("should maintain distance constraints under wind forces without explosion", () => {
      const chain = new VerletChain({
        nodeCount: 4,
        segmentLength: 40,
        drag: 0.05,
        gravity: 250
      });

      // Pin root to head coordinate
      chain.setPin(100, 200);

      // Simulate 40 physics frames with sudden gust of wind
      for (let i = 0; i < 40; i++) {
        chain.step(0.016, -180, 50);
      }

      // Root point must remain pinned exactly at (100, 200)
      expect(chain.points[0].x).toBe(100);
      expect(chain.points[0].y).toBe(200);

      // Tail node should have been blown sideways by wind
      expect(chain.points[3].x).toBeLessThan(100);

      // Distance between adjacent points should closely match segmentLength (40)
      for (let i = 0; i < 3; i++) {
        const p1 = chain.points[i];
        const p2 = chain.points[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        expect(Math.abs(dist - 40)).toBeLessThan(1.5); // Constraint tolerance within 1.5px
      }

      const curves = chain.getCurvePoints();
      expect(curves.length).toBe(4);
    });
  });

  describe("2. PoseBlendController & Crossfade Animation Transitions", () => {
    it("should smoothly interpolate joint angles and translations during action crossfade", () => {
      const controller = new PoseBlendController();
      controller.playAction("idle");

      // Initial idle pose
      const idlePose = controller.update(16, 1000);
      expect(idlePose).toBeDefined();

      // Switch to intense slash strike with 200ms crossfade
      controller.playAction("slash_strike", idlePose, 200);
      expect(controller.getCurrentAction()).toBe("slash_strike");

      // Mid-transition at 100ms (50% blend)
      const midPose = controller.update(100, 1100);

      // Target slash clip at progress
      const targetClip = UniversalMotionLibrary.get("slash_strike");
      const targetPose = targetClip.computePose(100 / targetClip.durationMs, 1100);

      // Intermediate pose values must be between idle and target (interpolated smoothly)
      expect(midPose.armUpperR_RotZ).not.toBe(idlePose.armUpperR_RotZ);
      expect(midPose.armUpperR_RotZ).not.toBe(targetPose.armUpperR_RotZ);

      // Complete transition after remaining 120ms
      const finalPose = controller.update(120, 1220);
      expect(finalPose).toBeDefined();
    });
  });

  describe("3. AvatarAssetCatalog Dynamic Component Registration", () => {
    it("should retrieve default builtin clothing and prop components", () => {
      const robe = AvatarAssetCatalog.get("outer", "robe_outer_cyan_cloud");
      expect(robe).toBeDefined();
      expect(robe?.name).toBe("苍青行云大袖仙袍");

      const sword = AvatarAssetCatalog.get("prop", "weapon_bamboo_cloud_sword");
      expect(sword).toBeDefined();
      expect(sword?.name).toBe("青竹蜂云剑");

      const cloaks = AvatarAssetCatalog.listByCategory("cloak");
      expect(cloaks.length).toBeGreaterThan(0);
    });

    it("should allow dynamic runtime registration of new clothing parts without code modification", () => {
      // User registers new Cyberpunk Daoist Robe component
      AvatarAssetCatalog.register({
        id: "robe_cyber_daoist_v1",
        name: "赛博霓虹太虚道袍",
        category: "outer",
        tags: ["cyberpunk", "neon", "daoist"],
        render: (ctx, { palette }) => {
          ctx.fillStyle = palette.primaryColor || "#00f0ff";
          ctx.strokeStyle = palette.accentColor || "#ff003c";
          ctx.strokeRect(-20, -50, 40, 100);
        }
      });

      const registered = AvatarAssetCatalog.get("outer", "robe_cyber_daoist_v1");
      expect(registered).toBeDefined();
      expect(registered?.name).toBe("赛博霓虹太虚道袍");

      // Verify that ModularAvatar can equip this newly registered part seamlessly
      const avatar = new ModularAvatar({ spec: PRESET_HAN_LI });
      avatar.updateCostume({
        outer: {
          assetId: "robe_cyber_daoist_v1",
          name: "赛博霓虹太虚道袍",
          primaryColor: "#00f0ff",
          secondaryColor: "#7000ff",
          accentColor: "#ff003c",
          opacity: 1.0,
          pattern: "none",
          physicsEnabled: true
        }
      });

      expect(avatar.spec.costume.outer.assetId).toBe("robe_cyber_daoist_v1");
    });
  });

  describe("4. AvatarFactory Procedural Synthesis & Story NLP Heuristics", () => {
    it("should generate valid cultivator JSON specifications for different sects", () => {
      // 1. Demonic Ancestor Elder
      const demon = AvatarFactory.createCultivator({
        name: "血煞老魔",
        gender: "male",
        sect: "demonic_sect",
        rank: "ancestor_elder"
      });
      expect(demon.archetype).toBe("male_elder");
      expect(demon.sockets.aura?.type).toBe("purple_demonic");
      expect(demon.face.style).toBe("donghua_action");

      // 2. Ice Fairy Disciple
      const iceFairy = AvatarFactory.createCultivator({
        name: "冷月仙子",
        gender: "female",
        sect: "ice_palace",
        rank: "core_master"
      });
      expect(iceFairy.archetype).toBe("female_adult");
      expect(iceFairy.sockets.aura?.type).toBe("ice_frost");
      expect(iceFairy.costume.outer.primaryColor).toBe("#1e1b4b");

      // 3. Beast Brute Cultivator
      const brute = AvatarFactory.createCultivator({
        name: "蛮骨力士",
        gender: "male",
        sect: "beast_cult"
      });
      expect(brute.archetype).toBe("male_muscular");
      expect(brute.sockets.aura?.color).toBe("#f59e0b");
    });

    it("should generate a stable ID for the same recipe", () => {
      const first = AvatarFactory.createCultivator({
        name: "云漪",
        gender: "female",
        sect: "ice_palace",
        rank: "core_master"
      });
      const second = AvatarFactory.createCultivator({
        name: "云漪",
        gender: "female",
        sect: "ice_palace",
        rank: "core_master"
      });

      expect(first.id).toBe(second.id);
    });

    it("should heuristically parse character roles from novel story descriptions", () => {
      // Story: "只见一位白发苍苍的魔门老祖阴森冷笑..."
      const spec1 = AvatarFactory.createFromStoryDescription(
        "极冥老怪",
        "白发苍苍的魔道长老，阴煞之气滔天"
      );
      expect(spec1.archetype).toBe("male_elder");
      expect(spec1.hair.baseColor).toBe("#ffffff"); // White hair
      expect(spec1.sockets.aura?.type).toBe("purple_demonic");

      // Story: "身着粉衣长裙的小师妹娇嗔道..."
      const spec2 = AvatarFactory.createFromStoryDescription(
        "柳师妹",
        "天水峰可爱的少女师妹，容貌清丽"
      );
      expect(spec2.gender).toBe("female");
      expect(spec2.archetype).toBe("female_adult");
    });
  });
});
