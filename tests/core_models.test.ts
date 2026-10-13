import { describe, it, expect } from "vitest";
import {
  CharacterProfileSchema,
  BackgroundAssetSchema,
  ScenePlanSchema,
  StoryPlanSchema,
  CompiledSceneTimelineSchema,
  TimelineEventSchema
} from "../src/core/index.js";

describe("Core Domain Contracts & DSL Schemas (TASK-102)", () => {
  describe("CharacterProfileSchema", () => {
    it("should parse valid character profile with defaults", () => {
      const raw = {
        id: "char_han_li",
        name: "韩立",
        aliases: ["韩天尊", "二愣子"],
        gender: "male",
        bodyType: "adult_swordsman",
        headProportion: 5.5,
        description: "修仙界第一跑跑，5.5头身成男御剑飞行姿态",
        memeFaces: [
          {
            id: "face_jacky_laugh",
            name: "张学友魔性大笑",
            expression: "smug",
            assetPath: "assets/characters/meme_human_face_jacky.png",
            anchorX: 0.5,
            anchorY: 0.5,
            scale: 1.0
          }
        ]
      };

      const parsed = CharacterProfileSchema.parse(raw);
      expect(parsed.id).toBe("char_han_li");
      expect(parsed.headProportion).toBe(5.5);
      expect(parsed.voiceConfig.voiceId).toBe("zh-CN-YunxiNeural");
      expect(parsed.voiceConfig.rate).toBe(1.0);
      expect(parsed.memeFaces.length).toBe(1);
    });

    it("should reject character profile with invalid head proportion", () => {
      const invalid = {
        id: "char_bad",
        name: "Bad",
        headProportion: 1.5 // Too small (minimum is 3.0)
      };

      expect(() => CharacterProfileSchema.parse(invalid)).toThrow();
    });
  });

  describe("BackgroundAssetSchema", () => {
    it("should parse 2.5D background with layers", () => {
      const raw = {
        id: "bg_thunder_realm",
        name: "天劫雷云界",
        environment: "thunder_realm",
        layers: [
          {
            layerId: "far_clouds",
            name: "远景雷云",
            assetPath: "assets/backgrounds/bg_xianxia_thunder_v2.png",
            depthZ: -200,
            parallaxFactor: 0.2,
            scrollSpeedX: 0.05
          },
          {
            layerId: "mid_rocks",
            name: "中景悬浮碎石",
            assetPath: "assets/backgrounds/bg_rocks.png",
            depthZ: -50,
            parallaxFactor: 0.6
          }
        ]
      };

      const parsed = BackgroundAssetSchema.parse(raw);
      expect(parsed.layers.length).toBe(2);
      expect(parsed.safeArea.baselineY).toBe(0);
      expect(parsed.ambientColor).toBe("#110a24");
    });

    it("should reject background with zero layers", () => {
      const invalid = {
        id: "bg_empty",
        name: "Empty",
        layers: []
      };

      expect(() => BackgroundAssetSchema.parse(invalid)).toThrow();
    });
  });

  describe("ScenePlan & StoryPlan DSL", () => {
    it("should parse comprehensive scene plan with all event types", () => {
      const rawScene = {
        sceneId: "scene_001",
        title: "青竹蜂云剑阵对决",
        backgroundId: "bg_thunder_realm",
        bgmId: "bgm_battle",
        initialStaging: [
          {
            characterId: "char_han_li",
            slot: "mid_left",
            facing: "right",
            initialMemeFace: "normal"
          },
          {
            characterId: "char_evil_lord",
            slot: "mid_right",
            facing: "left",
            initialMemeFace: "angry"
          }
        ],
        events: [
          {
            type: "dialogue",
            speakerId: "char_evil_lord",
            text: "韩立小儿，纳命来！",
            memeFace: "angry",
            subtitleStyle: "shout_red"
          },
          {
            type: "attack",
            attackerId: "char_han_li",
            targetId: "char_evil_lord",
            skillType: "sword_barrage",
            durationMs: 1500
          },
          {
            type: "hit",
            characterId: "char_evil_lord",
            reaction: "white_flash",
            shockFace: "shocked",
            durationMs: 800
          },
          {
            type: "camera",
            motion: "shake",
            shakeIntensity: 8,
            durationMs: 600
          },
          {
            type: "sfx",
            soundId: "sfx_thunder",
            volume: 0.9
          },
          {
            type: "narration",
            text: "刹那间，万道金色雷光轰然降临！"
          }
        ]
      };

      const parsedScene = ScenePlanSchema.parse(rawScene);
      expect(parsedScene.initialStaging.length).toBe(2);
      expect(parsedScene.events.length).toBe(6);

      const story = StoryPlanSchema.parse({
        storyId: "story_xianxia_01",
        title: "凡人诛邪录",
        characters: ["char_han_li", "char_evil_lord"],
        scenes: [rawScene]
      });

      expect(story.scenes.length).toBe(1);
    });

    it("should discriminate invalid timeline events", () => {
      const badEvent = {
        type: "unknown_type",
        text: "invalid"
      };

      expect(() => TimelineEventSchema.parse(badEvent)).toThrow();
    });
  });

  describe("CompiledSceneTimelineSchema", () => {
    it("should parse compiled frame timeline", () => {
      const rawTimeline = {
        sceneId: "scene_001",
        backgroundId: "bg_thunder_realm",
        totalDurationMs: 5000,
        fps: 30,
        characterTracks: [
          {
            characterId: "char_han_li",
            transformKeyframes: [
              { timeMs: 0, x: -300, y: 50, z: 0, opacity: 1 },
              { timeMs: 2500, x: -200, y: 70, z: 0, opacity: 1 }
            ],
            faceKeyframes: [
              { timeMs: 0, faceId: "normal" },
              { timeMs: 2000, faceId: "smug" }
            ]
          }
        ],
        cameraKeyframes: [
          { timeMs: 0, posX: 0, posY: 0, posZ: 1000, zoom: 1.0 },
          { timeMs: 2500, posX: -100, posY: 20, posZ: 800, zoom: 1.25 }
        ],
        subtitleCues: [
          {
            startTimeMs: 100,
            endTimeMs: 1800,
            speakerId: "char_han_li",
            text: "道友请留步！",
            style: "calligraphy_gold"
          }
        ],
        audioCues: [
          {
            cueId: "voice_01",
            type: "voice",
            startTimeMs: 100,
            durationMs: 1700,
            audioPath: "cache/audio/voice_01.mp3",
            duckBgm: true
          }
        ]
      };

      const parsed = CompiledSceneTimelineSchema.parse(rawTimeline);
      expect(parsed.totalDurationMs).toBe(5000);
      expect(parsed.characterTracks[0].transformKeyframes.length).toBe(2);
      expect(parsed.audioCues[0].duckBgm).toBe(true);
    });
  });
});
