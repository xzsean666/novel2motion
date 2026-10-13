import { describe, it, expect } from "vitest";
import {
  MultiTrackTimelineModel,
  NovelInputModel,
  CharacterRosterModel,
  VideoPlayerModel
} from "../src/index.js";
import { StoryPlanSchema } from "../../src/core/models/dsl.js";

describe("Web Workbench Panels & Data Flow (TASK-123)", () => {
  describe("MultiTrackTimelineModel", () => {
    it("should manage multi-track blocks and synchronize seek timestamp", () => {
      const timeline = new MultiTrackTimelineModel(5000);
      expect(timeline.tracks.length).toBe(5);

      // Add subtitle block
      timeline.addBlock("track_subtitles", {
        id: "sub_1",
        startTimeMs: 1000,
        durationMs: 1500,
        label: "道友请留步！"
      });

      // Add camera block
      timeline.addBlock("track_camera", {
        id: "cam_1",
        startTimeMs: 800,
        durationMs: 1200,
        label: "聚焦特写"
      });

      const subTrack = timeline.getTrack("track_subtitles")!;
      expect(subTrack.blocks.length).toBe(1);
      expect(subTrack.blocks[0].label).toBe("道友请留步！");

      // Move block
      timeline.moveBlock("track_subtitles", "sub_1", 2000);
      expect(subTrack.blocks[0].startTimeMs).toBe(2000);

      // Seek sync
      let seekedTo = 0;
      timeline.onSeek((t) => {
        seekedTo = t;
      });

      timeline.seek(2200);
      expect(timeline.getCurrentTimeMs()).toBe(2200);
      expect(seekedTo).toBe(2200);
    });
  });

  describe("NovelInputModel", () => {
    it("should load scene cards, allow interactive editing, and compile back to StoryPlan", () => {
      const model = new NovelInputModel();

      const initialPlan = {
        storyId: "plan_test_01",
        title: "青竹剑阵",
        characters: ["char_han_li"],
        scenes: [
          {
            sceneId: "scene_001",
            title: "剑阵初启",
            backgroundId: "bg_thunder_cliff",
            bgmId: "bgm_battle",
            bgmVolume: 0.4,
            initialStaging: [
              {
                characterId: "char_han_li",
                slot: "center" as const,
                scale: 1.0,
                facing: "right" as const,
                initialMemeFace: "normal",
                floatAnimation: true
              }
            ],
            events: [
              {
                type: "dialogue" as const,
                speakerId: "char_han_li",
                text: "出剑！",
                memeFace: "battle",
                subtitleStyle: "calligraphy_gold" as const,
                durationMs: 1200
              }
            ]
          }
        ]
      };

      model.loadFromStoryPlan(initialPlan);
      expect(model.getSceneCards().length).toBe(1);

      const card = model.getSceneCards()[0];
      expect(card.title).toBe("剑阵初启");
      expect(card.lines[0].text).toBe("出剑！");

      // Edit line text and meme face
      model.updateCardLine("scene_001", card.lines[0].id, {
        text: "青竹蜂云剑，布阵！",
        memeFace: "angry"
      });

      // Change background
      model.updateSceneCard("scene_001", {
        backgroundId: "bg_void_realm"
      });

      // Export back to StoryPlan
      const exportedPlan = model.toStoryPlan("plan_custom_02");
      expect(StoryPlanSchema.safeParse(exportedPlan).success).toBe(true);

      expect(exportedPlan.scenes[0].backgroundId).toBe("bg_void_realm");
      expect((exportedPlan.scenes[0].events[0] as any).text).toBe("青竹蜂云剑，布阵！");
      expect((exportedPlan.scenes[0].events[0] as any).memeFace).toBe("angry");
    });
  });

  describe("CharacterRosterModel", () => {
    it("should manage roster of characters and update voice/meme faces", () => {
      const roster = new CharacterRosterModel();

      roster.add({
        id: "char_han_li",
        name: "韩立",
        aliases: ["韩天尊"],
        gender: "male",
        bodyType: "adult_cultivator",
        headProportion: 5.5,
        description: "修仙者",
        voiceConfig: {
          voiceId: "zh-CN-YunxiNeural",
          rate: 1.0,
          pitch: 0,
          volume: 1.0
        },
        defaultMemeFaceId: "normal",
        memeFaces: [],
        parts: [],
        metadata: {}
      });

      expect(roster.getAll().length).toBe(1);
      expect(roster.getSelected()?.name).toBe("韩立");

      roster.updateVoice("char_han_li", { rate: 1.25, pitch: 5 });
      const updated = roster.get("char_han_li")!;
      expect(updated.voiceConfig.rate).toBe(1.25);
      expect(updated.voiceConfig.pitch).toBe(5);

      roster.setDefaultMemeFace("char_han_li", "shouting_jacky");
      expect(updated.defaultMemeFaceId).toBe("shouting_jacky");
    });
  });

  describe("VideoPlayerModel", () => {
    it("should manage video state, playback ticks, and download attributes", () => {
      const player = new VideoPlayerModel();

      player.loadVideo("http://localhost:3000/api/download/job_123", 25.5, 4.2);
      expect(player.getDurationSec()).toBe(25.5);
      expect(player.getRenderTimeSec()).toBe(4.2);
      expect(player.getIsPlaying()).toBe(false);

      player.play();
      expect(player.getIsPlaying()).toBe(true);

      player.tick(2.5);
      expect(player.getCurrentTimeSec()).toBe(2.5);

      player.pause();
      expect(player.getIsPlaying()).toBe(false);

      player.seek(18.0);
      expect(player.getCurrentTimeSec()).toBe(18.0);

      expect(player.getDownloadFilename()).toMatch(/^novel2motion_master_\d+\.mp4$/);
    });
  });
});
