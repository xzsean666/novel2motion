import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createDatabase,
  CharacterRegistry,
  BackgroundRegistry,
  AudioCache,
  ProjectStore
} from "../src/db/index.js";
import type { KVDB } from "kvdb-sdk";

describe("Database Registries & Storage (TASK-103)", () => {
  let db: KVDB;
  let charRegistry: CharacterRegistry;
  let bgRegistry: BackgroundRegistry;
  let audioCache: AudioCache;
  let projectStore: ProjectStore;

  beforeEach(() => {
    db = createDatabase({ dbPath: ":memory:" });
    charRegistry = new CharacterRegistry(db);
    bgRegistry = new BackgroundRegistry(db);
    audioCache = new AudioCache(db);
    projectStore = new ProjectStore(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("CharacterRegistry", () => {
    it("should register character and retrieve by id, name, and alias", async () => {
      await charRegistry.register({
        id: "char_han_li",
        name: "韩立",
        aliases: ["韩天尊", "二愣子", "厉飞雨"],
        gender: "male",
        bodyType: "adult_swordsman",
        headProportion: 5.5,
        description: "修仙者",
        voiceConfig: { voiceId: "zh-CN-YunxiNeural" },
        memeFaces: [
          {
            id: "smug",
            name: "魔性笑",
            expression: "smug",
            assetPath: "assets/characters/meme_human_face_jacky.png"
          }
        ]
      });

      // By ID
      const byId = await charRegistry.get("char_han_li");
      expect(byId).not.toBeNull();
      expect(byId?.name).toBe("韩立");

      // By Exact Name
      const byName = await charRegistry.findByNameOrAlias("韩立");
      expect(byName?.id).toBe("char_han_li");

      // By Alias
      const byAlias1 = await charRegistry.findByNameOrAlias("韩天尊");
      expect(byAlias1?.id).toBe("char_han_li");

      const byAlias2 = await charRegistry.findByNameOrAlias("厉飞雨");
      expect(byAlias2?.id).toBe("char_han_li");

      // By Substring (anti-drift in novel narrative like "韩天尊忽然冷笑一声")
      const byFuzzy = await charRegistry.findByNameOrAlias("韩天尊忽然冷笑一声");
      expect(byFuzzy?.id).toBe("char_han_li");
    });

    it("should delete character and remove alias mapping", async () => {
      await charRegistry.register({
        id: "char_temp",
        name: "临时角色",
        aliases: ["路人甲"]
      });

      expect(await charRegistry.findByNameOrAlias("路人甲")).not.toBeNull();
      const deleted = await charRegistry.delete("char_temp");
      expect(deleted).toBe(true);
      expect(await charRegistry.findByNameOrAlias("路人甲")).toBeNull();
    });
  });

  describe("BackgroundRegistry", () => {
    it("should register backgrounds and retrieve by tags", async () => {
      await bgRegistry.register({
        id: "bg_thunder_sky",
        name: "天劫雷云界",
        tags: ["thunder", "sky", "xianxia"],
        environment: "thunder_realm",
        layers: [
          {
            layerId: "l1",
            name: "雷云",
            assetPath: "assets/backgrounds/bg_thunder.png"
          }
        ]
      });

      await bgRegistry.register({
        id: "bg_sect_hall",
        name: "宗门大殿",
        tags: ["sect", "palace", "interior"],
        environment: "sect",
        layers: [
          {
            layerId: "l1",
            name: "大殿",
            assetPath: "assets/backgrounds/bg_hall.png"
          }
        ]
      });

      const thunderResults = await bgRegistry.findByTags(["thunder"]);
      expect(thunderResults.length).toBe(1);
      expect(thunderResults[0].id).toBe("bg_thunder_sky");

      const sectResults = await bgRegistry.findByTags(["sect"]);
      expect(sectResults.length).toBe(1);
      expect(sectResults[0].id).toBe("bg_sect_hall");
    });
  });

  describe("AudioCache", () => {
    it("should cache audio results and handle cache hit / miss", async () => {
      const voiceId = "zh-CN-YunxiNeural";
      const text = "道友请留步，前面乃是天劫禁区！";

      // Initial miss
      const miss = await audioCache.getAudio(voiceId, text);
      expect(miss).toBeNull();

      // Store in cache
      await audioCache.setAudio(voiceId, text, "/cache/audio/test_01.mp3", 2450);

      // Hit
      const hit = await audioCache.getAudio(voiceId, text);
      expect(hit).not.toBeNull();
      expect(hit?.audioPath).toBe("/cache/audio/test_01.mp3");
      expect(hit?.durationMs).toBe(2450);

      // Miss on different text
      const missDifferent = await audioCache.getAudio(voiceId, text + "!!!");
      expect(missDifferent).toBeNull();
    });
  });

  describe("ProjectStore", () => {
    it("should save and track project plans", async () => {
      const plan = {
        storyId: "story_101",
        title: "大破黑煞教",
        characters: ["char_han_li"],
        scenes: [
          {
            sceneId: "scene_01",
            backgroundId: "bg_thunder_sky",
            initialStaging: [
              {
                characterId: "char_han_li",
                slot: "center"
              }
            ],
            events: [
              {
                type: "narration",
                text: "暴雨如注，杀机四伏。"
              }
            ]
          }
        ]
      };

      const record = await projectStore.saveProject(plan, "draft");
      expect(record.status).toBe("draft");

      await projectStore.updateStatus("story_101", "completed", "output/story_101.mp4");
      const updated = await projectStore.getProject("story_101");
      expect(updated?.status).toBe("completed");
      expect(updated?.outputPath).toBe("output/story_101.mp4");
    });
  });
});
