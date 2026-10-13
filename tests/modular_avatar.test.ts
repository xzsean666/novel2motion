import { describe, it, expect, beforeEach } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { KVDB } from "kvdb-sdk";
import fs from "node:fs";
import path from "node:path";
import {
  ModularAvatarSpecSchema,
  type ModularAvatarSpec,
  type BodyArchetype,
  BodyArchetypeEnum,
  FaceStyleEnum,
  VisemeTypeEnum
} from "../src/core/models/modular-character.js";
import {
  UniversalSkeleton,
  ARCHETYPE_PROPORTIONS
} from "../src/engine/puppet/avatar/universal-skeleton.js";
import { FaceMeshBuilder } from "../src/engine/puppet/avatar/face-mesh-builder.js";
import { ModularCostumeRig } from "../src/engine/puppet/avatar/modular-costume-rig.js";
import {
  UniversalMotionLibrary,
  type UniversalActionType
} from "../src/engine/puppet/avatar/universal-motion-library.js";
import { ModularAvatar } from "../src/engine/puppet/avatar/modular-avatar.js";
import {
  PRESET_HAN_LI,
  PRESET_ZI_LING,
  PRESET_JI_YIN,
  PRESET_LIN_FEI,
  PRESET_MAN_SHEN,
  PRESET_XIAO_LING_ER,
  PRESET_CHIBI_DAOIST,
  PRESET_AVATARS
} from "../src/engine/puppet/avatar/preset-avatars.js";
import { PuppetCharacter } from "../src/engine/puppet/puppet-character.js";
import { CharacterRegistry } from "../src/db/character-registry.js";

describe("Declarative Modular Avatar System (TASK-131)", () => {
  const testDbPath = "/tmp/test_modular_avatar.db";

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  describe("1. Declarative Avatar JSON Schema & Validation", () => {
    it("should parse and validate all default preset avatar JSONs", () => {
      Object.entries(PRESET_AVATARS).forEach(([id, preset]) => {
        const parsed = ModularAvatarSpecSchema.parse(preset);
        expect(parsed.id).toBe(id);
        expect(parsed.name).toBeTruthy();
        expect(parsed.schemaVersion).toBe("2.0");
        expect(parsed.archetype).toBeTruthy();
        expect(parsed.face).toBeDefined();
        expect(parsed.costume).toBeDefined();
      });
    });

    it("should throw validation error if required fields are missing", () => {
      expect(() => {
        ModularAvatarSpecSchema.parse({
          name: "Invalid Without ID"
        });
      }).toThrow();
    });

    it("should export and re-parse JSON string with 100% fidelity", () => {
      const avatar = new ModularAvatar({ spec: PRESET_HAN_LI });
      const jsonString = avatar.toJSONString();
      const parsedAgain = JSON.parse(jsonString);
      const validated = ModularAvatarSpecSchema.parse(parsedAgain);

      expect(validated.id).toBe(PRESET_HAN_LI.id);
      expect(validated.name).toBe("韩立");
      expect(validated.costume.outer.primaryColor).toBe(PRESET_HAN_LI.costume.outer.primaryColor);
    });
  });

  describe("2. Universal Skeleton & Body Archetype Proportions", () => {
    const archetypes: BodyArchetype[] = [
      "male_adult",
      "female_adult",
      "male_youth",
      "female_youth",
      "male_muscular",
      "male_elder",
      "chibi_universal"
    ];

    it("should construct valid bone trees and sockets for all humanoid archetypes", () => {
      archetypes.forEach((archetype) => {
        const skel = new UniversalSkeleton(archetype);
        const prop = ARCHETYPE_PROPORTIONS[archetype];

        expect(skel.proportions.totalHeight).toBe(prop.totalHeight);
        expect(skel.bones.has("pelvis")).toBe(true);
        expect(skel.bones.has("chest")).toBe(true);
        expect(skel.bones.has("head")).toBe(true);
        expect(skel.bones.has("arm_upper_r")).toBe(true);
        expect(skel.bones.has("hand_r")).toBe(true);
        expect(skel.bones.has("thigh_l")).toBe(true);
        expect(skel.bones.has("foot_l")).toBe(true);

        // Check essential sockets
        expect(skel.sockets.has("hand_r")).toBe(true);
        expect(skel.sockets.has("hand_l")).toBe(true);
        expect(skel.sockets.has("back")).toBe(true);
        expect(skel.sockets.has("head_top")).toBe(true);
        expect(skel.sockets.has("waist")).toBe(true);
      });
    });

    it("should compute socket world transforms accurately", () => {
      const skel = new UniversalSkeleton("male_adult");
      const handR = skel.getSocketTransform("hand_r");
      expect(handR.position).toBeDefined();
      expect(typeof handR.rotationZ).toBe("number");
      expect(handR.scale).toBeDefined();
    });
  });

  describe("3. Multi-Style Face Engine & Viseme Lip-Sync", () => {
    const styles = ["xianxia_real", "anime_modern", "donghua_action", "chibi_comedy"] as const;
    const visemes = ["silence", "a", "i", "u", "e", "o", "m"] as const;

    it("should successfully render all facial styles without throwing errors", () => {
      const canvas = createCanvas(300, 300);
      const ctx = canvas.getContext("2d");

      styles.forEach((style) => {
        const faceSpec = {
          ...PRESET_HAN_LI.face,
          style
        };

        expect(() => {
          ctx.clearRect(0, 0, 300, 300);
          ctx.save();
          ctx.translate(150, 150);
          FaceMeshBuilder.renderFace(ctx, faceSpec, {
            timeMs: 500,
            isSpeaking: false,
            headScale: 120
          });
          ctx.restore();
        }).not.toThrow();
      });
    });

    it("should render all speech phoneme visemes and emotional overlays", () => {
      const canvas = createCanvas(300, 300);
      const ctx = canvas.getContext("2d");

      visemes.forEach((viseme) => {
        expect(() => {
          ctx.clearRect(0, 0, 300, 300);
          ctx.save();
          ctx.translate(150, 150);
          FaceMeshBuilder.renderFace(ctx, PRESET_ZI_LING.face, {
            timeMs: 1200,
            isSpeaking: true,
            activeViseme: viseme,
            visemeOpenness: 0.8,
            expression: "angry",
            headScale: 120
          });
          ctx.restore();
        }).not.toThrow();
      });
    });
  });

  describe("4. Modular Costume Rig & Hot-Swapping (换装系统)", () => {
    it("should allow hot-swapping costume layers in real-time via JSON update", () => {
      const avatar = new ModularAvatar({ spec: PRESET_HAN_LI });
      expect(avatar.spec.costume.outer.primaryColor).toBe("#0f766e");

      // Swap to Golden Python Robe
      avatar.updateCostume({
        outer: {
          assetId: "robe_outer_black_python_gold",
          name: "九霄金蟒黑煞道袍",
          primaryColor: "#0a0a0c",
          secondaryColor: "#ffd700",
          accentColor: "#f59e0b",
          opacity: 1.0,
          pattern: "dragon_scales",
          physicsEnabled: true
        }
      });

      expect(avatar.spec.costume.outer.assetId).toBe("robe_outer_black_python_gold");
      expect(avatar.spec.costume.outer.primaryColor).toBe("#0a0a0c");

      // Hot-swap hair to White Immortal Cascade
      avatar.updateHair({
        id: "white_immortal_cascade",
        baseColor: "#ffffff",
        highlightColor: "#e2e8f0"
      });

      expect(avatar.spec.hair.baseColor).toBe("#ffffff");

      // Hot-swap weapon prop
      avatar.setSocketProp("hand_r", {
        propId: "weapon_thunder_god_spear",
        name: "九天雷神重矛",
        propType: "weapon_sword",
        offsetX: 0,
        offsetY: -15,
        rotationZ: 0.1,
        scale: 1.2,
        visible: true,
        glowColor: "#a855f7"
      });

      expect(avatar.spec.sockets.hand_r?.propId).toBe("weapon_thunder_god_spear");
    });

    it("should simulate secondary spring physics for hair and cloak under wind forces", () => {
      const rig = new ModularCostumeRig();

      expect(rig.hairSpring.position).toBe(0);
      expect(rig.cloakSpring.position).toBe(0);

      // Simulate 50 frames with headwind
      for (let f = 1; f <= 50; f++) {
        rig.updateDynamics(f * 16, -150);
      }

      // Springs should have reacted to wind force
      expect(rig.hairSpring.position).not.toBe(0);
      expect(rig.cloakSpring.position).not.toBe(0);
    });
  });

  describe("5. Universal Motion Library Across All Archetypes", () => {
    const actions: UniversalActionType[] = [
      "idle",
      "hover_flight",
      "dialogue_calm",
      "dialogue_intense",
      "draw_sword",
      "slash_strike",
      "cast_mudra",
      "barrier_defend",
      "flinch_hit",
      "shocked_retreat",
      "bow_salute",
      "laugh_arrogant"
    ];

    it("should compute and apply all 12 universal actions to different body archetypes", () => {
      const maleSkel = new UniversalSkeleton("male_adult");
      const femaleSkel = new UniversalSkeleton("female_adult");
      const muscularSkel = new UniversalSkeleton("male_muscular");

      actions.forEach((act) => {
        const clip = UniversalMotionLibrary.get(act);
        expect(clip.name).toBeTruthy();
        expect(clip.durationMs).toBeGreaterThan(0);

        const pose = clip.computePose(0.5, 1000);
        expect(pose).toBeDefined();

        // Apply to male, female, muscular skeletons without errors
        expect(() => UniversalMotionLibrary.applyPoseToSkeleton(maleSkel, pose)).not.toThrow();
        expect(() => UniversalMotionLibrary.applyPoseToSkeleton(femaleSkel, pose)).not.toThrow();
        expect(() => UniversalMotionLibrary.applyPoseToSkeleton(muscularSkel, pose)).not.toThrow();
      });
    });
  });

  describe("6. Canvas Offline Rasterization & Rendering", () => {
    it("should render ModularAvatar to Canvas producing non-empty RGBA buffers", () => {
      const canvas = createCanvas(800, 1000);
      const ctx = canvas.getContext("2d");

      const avatar = new ModularAvatar({
        spec: PRESET_HAN_LI,
        initialAction: "hover_flight",
        facing: "right"
      });

      // Update simulation time
      avatar.update(1000, 0.016);

      ctx.save();
      ctx.translate(400, 750);
      avatar.render(ctx, 1.0);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, 800, 1000);
      const buf = Buffer.from(imgData.data.buffer);

      // Verify pixels are non-empty
      let hasColor = false;
      for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
          hasColor = true;
          break;
        }
      }
      expect(hasColor).toBe(true);
    });
  });

  describe("7. CharacterRegistry SQLite Persistence with Modular Avatars", () => {
    it("should register, retrieve, list and export modular avatar JSON in KVDB", async () => {
      const db = new KVDB({
        driver: "sqlite",
        url: ":memory:"
      });
      const registry = new CharacterRegistry(db);

      // Register Han Li & Zi Ling
      await registry.registerModularAvatar(PRESET_HAN_LI);
      await registry.registerModularAvatar(PRESET_ZI_LING);

      // Retrieve by ID
      const retrieved = await registry.getModularAvatar("char_han_li");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe("韩立");
      expect(retrieved?.archetype).toBe("male_adult");

      // List all
      const all = await registry.listModularAvatars();
      expect(all.length).toBe(2);

      // Export JSON string
      const exportedJson = await registry.exportAvatarJson("char_zi_ling");
      expect(exportedJson).toContain("紫菱仙子");
      expect(exportedJson).toContain("char_zi_ling");

      await db.close();
    });
  });

  describe("8. PuppetCharacter Native Modular Integration", () => {
    it("should instantiate PuppetCharacter with avatarSpec and synchronize actions", () => {
      const puppet = new PuppetCharacter({
        id: "han_modular",
        avatarSpec: PRESET_HAN_LI,
        initialAction: "cruise"
      });

      expect(puppet.modularAvatar).toBeDefined();
      expect(puppet.modularAvatar?.currentAction).toBe("hover_flight");

      // Play slash action
      puppet.playAction("attack_slash");
      expect(puppet.modularAvatar?.currentAction).toBe("slash_strike");

      // Update pose
      puppet.update(16);
      expect(puppet.root.userData.modularAvatar).toBe(puppet.modularAvatar);

      puppet.dispose();
    });
  });
});
