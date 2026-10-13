import { describe, it, expect } from "vitest";
import {
  planCharacterStaging,
  buildCombatSequence,
  AiDirector,
  StoryChunk
} from "../src/ai/index.js";
import { StoryPlanSchema } from "../src/core/index.js";

describe("AI Director & Combat Choreography (TASK-109)", () => {
  describe("planCharacterStaging", () => {
    it("should stage single character in center", () => {
      const staging = planCharacterStaging(["char_han"]);
      expect(staging.length).toBe(1);
      expect(staging[0].slot).toBe("center");
      expect(staging[0].facing).toBe("right");
    });

    it("should stage dual characters face-to-face across mid_left and mid_right", () => {
      const staging = planCharacterStaging(["char_han", "char_evil"]);
      expect(staging.length).toBe(2);
      expect(staging[0].slot).toBe("mid_left");
      expect(staging[0].facing).toBe("right");

      expect(staging[1].slot).toBe("mid_right");
      expect(staging[1].facing).toBe("left"); // Face-to-face confrontation!
    });
  });

  describe("buildCombatSequence", () => {
    it("should pair offensive attack with defensive hit reaction, screen shake, and sfx", () => {
      const chunk: StoryChunk = {
        id: "chunk_c1",
        type: "combat",
        text: "青竹蜂云剑阵呼啸斩下！",
        actionKeywords: ["sword"],
        suggestedSfx: "sfx_sword_slash",
        suggestedMemeFace: "battle"
      };

      const sequence = buildCombatSequence({
        attackerId: "char_han",
        targetId: "char_evil",
        chunk
      });

      expect(sequence.length).toBe(4);
      const [attack, sfx, camera, hit] = sequence;

      expect(attack.type).toBe("attack");
      expect((attack as any).attackerId).toBe("char_han");
      expect((attack as any).skillType).toBe("sword_barrage");

      expect(sfx.type).toBe("sfx");
      expect((sfx as any).soundId).toBe("sfx_sword_slash");

      expect(camera.type).toBe("camera");
      expect((camera as any).motion).toBe("shake");

      expect(hit.type).toBe("hit");
      expect((hit as any).characterId).toBe("char_evil");
      expect((hit as any).reaction).toBe("white_flash");
      expect((hit as any).shockFace).toBe("shocked");
    });
  });

  describe("AiDirector.direct", () => {
    it("should compile story chunks into a valid StoryPlan DSL", () => {
      const chunks: StoryChunk[] = [
        {
          id: "c1",
          type: "narration",
          text: "天劫雷云界，风云变幻。",
          actionKeywords: [],
          suggestedMemeFace: "normal"
        },
        {
          id: "c2",
          type: "dialogue",
          text: "韩立，今日便是你的死期！",
          speakerRaw: "魔道老祖",
          boundSpeakerId: "char_evil",
          actionKeywords: [],
          suggestedMemeFace: "angry"
        },
        {
          id: "c3",
          type: "dialogue",
          text: "雕虫小技，也敢口出狂言？",
          speakerRaw: "韩立",
          boundSpeakerId: "char_han",
          actionKeywords: [],
          suggestedMemeFace: "smug"
        },
        {
          id: "c4",
          type: "combat",
          text: "万道金色辟邪神雷呼啸而出！",
          actionKeywords: ["thunder"],
          suggestedMemeFace: "battle"
        }
      ];

      const director = new AiDirector();
      const plan = director.direct(chunks, {
        storyId: "test_xianxia_battle",
        title: "正邪对决"
      });

      // Verify schema compliance
      const validated = StoryPlanSchema.parse(plan);
      expect(validated.storyId).toBe("test_xianxia_battle");
      expect(validated.scenes.length).toBeGreaterThanOrEqual(1);

      const scene = validated.scenes[0];
      expect(scene.bgmId).toBe("bgm_combat_epic");
      expect(scene.initialStaging.length).toBe(2);

      // Verify confrontation facing
      expect(scene.initialStaging[0].slot).toBe("mid_left");
      expect(scene.initialStaging[0].facing).toBe("right");
      expect(scene.initialStaging[1].slot).toBe("mid_right");
      expect(scene.initialStaging[1].facing).toBe("left");

      // Verify events contain dialogue and combat
      const hasDialogue = scene.events.some((e) => e.type === "dialogue");
      const hasAttack = scene.events.some((e) => e.type === "attack");
      const hasHit = scene.events.some((e) => e.type === "hit");

      expect(hasDialogue).toBe(true);
      expect(hasAttack).toBe(true);
      expect(hasHit).toBe(true);
    });
  });
});
