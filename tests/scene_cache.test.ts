import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { computeSceneHash, stableStringify } from "../src/renderer/scene-hasher.js";
import { SceneRenderCache } from "../src/renderer/scene-cache.js";
import { concatSceneVideos } from "../src/renderer/scene-concat.js";
import { runFFmpeg } from "../src/runtime/ffmpeg-task.js";
import type { ScenePlan } from "../src/core/models/dsl.js";

describe("Scene Incremental Hash & Render Cache (TASK-117)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_cache_test_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const baseScene: ScenePlan = {
    sceneId: "scene_001",
    title: "Battle at Kunlun",
    backgroundId: "bg_cliff",
    bgmId: "bgm_battle",
    bgmVolume: 0.5,
    initialStaging: [
      {
        characterId: "char_han_li",
        slot: "center",
        scale: 1.0,
        facing: "right",
        initialMemeFace: "normal",
        floatAnimation: true
      }
    ],
    events: [
      {
        type: "dialogue",
        speakerId: "char_han_li",
        text: "道友请留步！",
        memeFace: "shouting",
        subtitleStyle: "calligraphy_gold",
        durationMs: 1500
      }
    ],
    durationMs: 2000
  };

  it("should compute deterministic SHA-256 hashes", () => {
    const hash1 = computeSceneHash({ scene: baseScene });
    const hash2 = computeSceneHash({ scene: JSON.parse(JSON.stringify(baseScene)) });

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce different hashes when scene content changes", () => {
    const hashOriginal = computeSceneHash({ scene: baseScene });

    // Change dialogue text
    const modifiedTextScene: ScenePlan = {
      ...baseScene,
      events: [
        {
          type: "dialogue",
          speakerId: "char_han_li",
          text: "道友且慢！",
          memeFace: "shouting",
          subtitleStyle: "calligraphy_gold",
          durationMs: 1500
        }
      ]
    };
    const hashModifiedText = computeSceneHash({ scene: modifiedTextScene });
    expect(hashModifiedText).not.toBe(hashOriginal);

    // Change character slot
    const modifiedSlotScene: ScenePlan = {
      ...baseScene,
      initialStaging: [
        {
          ...baseScene.initialStaging[0],
          slot: "mid_left"
        }
      ]
    };
    const hashModifiedSlot = computeSceneHash({ scene: modifiedSlotScene });
    expect(hashModifiedSlot).not.toBe(hashOriginal);

    // Change asset fingerprint
    const hashWithAsset1 = computeSceneHash({
      scene: baseScene,
      assetFingerprints: { "bg_cliff": "hash_a" }
    });
    const hashWithAsset2 = computeSceneHash({
      scene: baseScene,
      assetFingerprints: { "bg_cliff": "hash_b" }
    });
    expect(hashWithAsset1).not.toBe(hashWithAsset2);
  });

  it("should store and retrieve scene videos in SceneRenderCache", async () => {
    const cache = new SceneRenderCache(tempDir);
    const sceneHash = computeSceneHash({ scene: baseScene });

    expect(cache.has(sceneHash)).toBe(false);
    expect(cache.get(sceneHash)).toBeNull();

    // Create a dummy video buffer
    const fakeVideoBuffer = Buffer.from("MOCK_MP4_VIDEO_STREAM_DATA");
    const savedPath = await cache.put(sceneHash, fakeVideoBuffer, baseScene.sceneId);

    expect(fs.existsSync(savedPath)).toBe(true);
    expect(cache.has(sceneHash)).toBe(true);
    expect(cache.get(sceneHash)).toBe(savedPath);

    const stats = cache.getStats();
    expect(stats.count).toBe(1);
    expect(stats.totalSizeBytes).toBe(fakeVideoBuffer.length);

    // Persistence reload test
    const reloadedCache = new SceneRenderCache(tempDir);
    expect(reloadedCache.has(sceneHash)).toBe(true);
    expect(reloadedCache.get(sceneHash)).toBe(savedPath);

    // Delete test
    expect(reloadedCache.delete(sceneHash)).toBe(true);
    expect(reloadedCache.has(sceneHash)).toBe(false);
  });

  it("should rapidly concatenate multiple scene mp4s using FFmpeg concat", async () => {
    // Generate two 1-second test videos using FFmpeg
    const clip1 = path.join(tempDir, "clip1.mp4");
    const clip2 = path.join(tempDir, "clip2.mp4");
    const outputConcat = path.join(tempDir, "final_merged.mp4");

    // clip1: 1s testsrc with sine audio
    await runFFmpeg({
      args: [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=1:size=320x240:rate=24",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        clip1
      ]
    });

    // clip2: 1s testsrc with sine audio
    await runFFmpeg({
      args: [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=1:size=320x240:rate=24",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:duration=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        clip2
      ]
    });

    expect(fs.existsSync(clip1)).toBe(true);
    expect(fs.existsSync(clip2)).toBe(true);

    const resultPath = await concatSceneVideos({
      videoPaths: [clip1, clip2],
      outputPath: outputConcat
    });

    expect(fs.existsSync(resultPath)).toBe(true);
    const stat = fs.statSync(resultPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
