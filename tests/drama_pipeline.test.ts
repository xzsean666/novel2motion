import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  DramaDirector,
  CharacterBible,
  JianyingDraftExporter,
  CinematicMotionProvider,
  MockVideoProvider,
  KlingVideoProvider,
  executeDramaPipeline
} from "../src/drama/index.js";

describe("Industrial AI Short Drama Pipeline (TASK-130)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_drama_test_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const sampleNovel = `第1集 逆徒弑师？本座今日清理门户！
天元宗后山，暴雨如注，九天神雷滚滚落下。
陆沉白衣胜雪，负手立于断崖之巅。
逆徒林玄拔出赤炎魔剑，冷笑连连：“师尊，交出九转金丹，我可留你全尸！”
陆沉眼神冰冷如霜，淡淡开口：“孽徒，你真以为本座修为尽失？”
轰隆！一道金色雷霆贯穿苍穹，狂暴的剑气瞬间撕裂整座山峦！
林玄惊骇欲绝：“这不可能！你的丹田不是已经碎了吗？！”
`;

  it("DramaDirector should parse novel and build structured cinematic shot screenplay", () => {
    const bible = new CharacterBible();
    const director = new DramaDirector(bible);

    const script = director.direct(sampleNovel, {
      title: "逆徒弑师",
      aspectRatio: "9:16",
      targetShotDurationSec: 3.5
    });

    expect(script.title).toBe("逆徒弑师");
    expect(script.aspectRatio).toBe("9:16");
    expect(script.shots.length).toBeGreaterThanOrEqual(4);

    // Shot 0 must be establishing hook
    const hookShot = script.shots[0];
    expect(hookShot.scale).toBe("wide_establishing");
    expect(hookShot.cameraMotion).toBe("dolly_in");
    expect(hookShot.visualPrompt.positiveEn).toContain("Epic wide shot");
    expect(hookShot.videoMotionPrompt.motionEn).toBeDefined();

    // Dialogue shots should have close-up / medium-close-up framing
    const dialogueShots = script.shots.filter((s) => s.dialogue);
    expect(dialogueShots.length).toBeGreaterThanOrEqual(2);

    const firstDialogue = dialogueShots[0];
    expect(["close_up", "medium_close_up"]).toContain(firstDialogue.scale);
    expect(firstDialogue.dialogue?.speakerName).toBeDefined();
    expect(firstDialogue.visualPrompt.positiveEn).toContain("cinematic");
    expect(firstDialogue.videoMotionPrompt.motionEn).toContain("speaking");

    // Combat shots should have action triggers
    const combatShots = script.shots.filter((s) => s.combatAction);
    expect(combatShots.length).toBeGreaterThan(0);
    expect(combatShots[0].sfxTags.length).toBeGreaterThan(0);
  });

  it("CharacterBible should ensure visual consistency across multiple shots", () => {
    const bible = new CharacterBible();
    const p1 = bible.resolveOrRegister("陆沉", "白衣胜雪，眼神冰冷如霜，师尊");
    const p2 = bible.resolveOrRegister("林玄", "逆徒，拔出魔剑，冷笑");

    expect(p1.characterId).toBeDefined();
    expect(p2.characterId).toBeDefined();
    expect(p1.characterId).not.toBe(p2.characterId);

    // Resolving again should return the exact same profile
    const p1Again = bible.resolveOrRegister("陆沉");
    expect(p1Again.characterId).toBe(p1.characterId);

    // Enriched prompt should contain character visual details
    const enriched = bible.enrichVisualPrompt([p1.characterId], "standing on cliff");
    expect(enriched.positive).toContain("陆沉");
    expect(enriched.positive).toContain("masterpiece");
    expect(enriched.negative).toContain("low quality");
  });

  it("JianyingDraftExporter should export CapCut/Jianying draft compatible JSON", () => {
    const bible = new CharacterBible();
    const director = new DramaDirector(bible);
    const script = director.direct(sampleNovel);

    const draftPath = path.join(tempDir, "draft_content.json");
    JianyingDraftExporter.exportDraft(script, draftPath);

    expect(fs.existsSync(draftPath)).toBe(true);
    const draftJson = JSON.parse(fs.readFileSync(draftPath, "utf8"));

    expect(draftJson.canvas_config.ratio).toBe("16:9");
    expect(draftJson.canvas_config.width).toBe(1920);
    expect(draftJson.canvas_config.height).toBe(1080);
    expect(draftJson.tracks.length).toBe(4); // video, voice, sfx, subtitle text
    expect(draftJson.tracks[0].type).toBe("video");
    expect(draftJson.tracks[3].type).toBe("text");
  });

  it("KlingVideoProvider should gracefully fallback when offline", async () => {
    const kling = new KlingVideoProvider({ apiKey: "" });
    expect(kling.isConfigured()).toBe(false);

    const shotFile = path.join(tempDir, "kling_shot.mp4");
    const result = await kling.generateShotVideo({
      shot: {
        shotId: "shot_001",
        shotIndex: 1,
        durationMs: 1500,
        scale: "close_up",
        cameraMotion: "dolly_in",
        transition: "cut",
        visualPrompt: { positiveCn: "", positiveEn: "cinematic portrait", negativeEn: "ugly" },
        videoMotionPrompt: { motionCn: "", motionEn: "speaking with rage" },
        activeCharacters: [],
        sfxTags: []
      },
      width: 540,
      height: 960,
      fps: 24,
      outputVideoPath: shotFile
    });

    expect(fs.existsSync(shotFile)).toBe(true);
    expect(result.videoPath).toBe(shotFile);
    expect(result.provider).toContain("kling");
  });

  it("executeDramaPipeline should run end-to-end with Mock provider and export draft", async () => {
    const novelFile = path.join(tempDir, "novel.txt");
    const outputMp4 = path.join(tempDir, "output_drama.mp4");
    const draftFile = path.join(tempDir, "jianying_draft.json");
    fs.writeFileSync(novelFile, sampleNovel, "utf8");

    const result = await executeDramaPipeline({
      inputPath: novelFile,
      outputPath: outputMp4,
      aspectRatio: "9:16",
      width: 540,
      height: 960,
      fps: 24,
      videoProvider: "mock",
      exportJianyingDraftPath: draftFile
    });

    expect(result.shotCount).toBeGreaterThanOrEqual(4);
    expect(result.totalDurationMs).toBeGreaterThan(5000);
    expect(result.providerUsed).toBe("mock");
    expect(fs.existsSync(draftFile)).toBe(true);
  });
});
