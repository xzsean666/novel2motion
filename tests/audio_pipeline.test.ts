import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  generateValidPcmWav,
  MockTtsSynthesizer,
  CachedTtsService,
  probeAudioDurationMs,
  buildAudioFilterGraph,
  mixSceneAudio
} from "../src/audio/index.js";
import { createDatabase, AudioCache } from "../src/db/index.js";
import type { KVDB } from "kvdb-sdk";

describe("Audio Pipeline & Adaptive Ducking Mixer (TASK-110)", () => {
  let db: KVDB;
  let audioCache: AudioCache;
  let tempAudioDir: string;

  beforeEach(async () => {
    db = createDatabase({ dbPath: ":memory:" });
    audioCache = new AudioCache(db);
    tempAudioDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "n2m_test_audio_"));
  });

  afterEach(async () => {
    await db.close();
    await fs.promises.rm(tempAudioDir, { recursive: true, force: true });
  });

  it("should generate valid WAV buffer and probe exact duration with ffprobe", async () => {
    const testDurationMs = 1500;
    const wavBuffer = generateValidPcmWav(testDurationMs, 440);

    const testFile = path.join(tempAudioDir, "test_pcm.wav");
    await fs.promises.writeFile(testFile, wavBuffer);

    const probedMs = await probeAudioDurationMs(testFile);
    // Allow slight container/rounding difference <= 50ms
    expect(Math.abs(probedMs - testDurationMs)).toBeLessThanOrEqual(50);
  });

  it("should synthesize TTS with caching", async () => {
    const mockTts = new MockTtsSynthesizer();
    const service = new CachedTtsService(mockTts, audioCache, tempAudioDir);

    const text = "韩立，今日便是你的死期！";
    const voiceOpts = { voiceId: "zh-CN-YunjianNeural" };

    // 1st call: synthesized
    const first = await service.getOrSynthesize(text, voiceOpts);
    expect(first.fromCache).toBe(false);
    expect(fs.existsSync(first.audioPath)).toBe(true);
    expect(first.durationMs).toBeGreaterThan(1000);

    // 2nd call: cache hit!
    const second = await service.getOrSynthesize(text, voiceOpts);
    expect(second.fromCache).toBe(true);
    expect(second.audioPath).toBe(first.audioPath);
    expect(second.durationMs).toBe(first.durationMs);
  });

  it("should construct correct FFmpeg ducking filter graph", () => {
    const { filterGraph, inputArgs } = buildAudioFilterGraph(
      { filePath: "assets/audio/bgm/combat_epic.wav", volume: 0.4 },
      [
        {
          cueId: "v1",
          type: "voice",
          startTimeMs: 1000,
          durationMs: 2000,
          audioPath: "cache/v1.wav",
          duckBgm: true
        }
      ],
      5000
    );

    expect(inputArgs).toContain("-i");
    expect(inputArgs).toContain("assets/audio/bgm/combat_epic.wav");
    expect(inputArgs).toContain("cache/v1.wav");

    // Check ducking formula in filter graph
    expect(filterGraph).toContain("between(t,0.90,3.20)");
    expect(filterGraph).toContain("adelay=1000|1000");
    expect(filterGraph).toContain("amix=");
  });

  it("should mix real multi-track audio with BGM ducking and output valid audio file", async () => {
    // Generate 2 short voice clips
    const v1Path = path.join(tempAudioDir, "voice1.wav");
    const v2Path = path.join(tempAudioDir, "voice2.wav");
    await fs.promises.writeFile(v1Path, generateValidPcmWav(1200, 300));
    await fs.promises.writeFile(v2Path, generateValidPcmWav(1000, 600));

    const outputPath = path.join(tempAudioDir, "mixed_master.wav");

    const mixed = await mixSceneAudio({
      bgm: { filePath: "assets/audio/bgm/peaceful_daily.wav", volume: 0.5 },
      audioCues: [
        {
          cueId: "d1",
          type: "voice",
          startTimeMs: 500,
          durationMs: 1200,
          audioPath: v1Path,
          duckBgm: true
        },
        {
          cueId: "d2",
          type: "voice",
          startTimeMs: 2200,
          durationMs: 1000,
          audioPath: v2Path,
          duckBgm: true
        }
      ],
      totalDurationMs: 4000,
      outputPath
    });

    expect(fs.existsSync(mixed)).toBe(true);
    const duration = await probeAudioDurationMs(mixed);
    expect(Math.abs(duration - 4000)).toBeLessThanOrEqual(100);
  });
});
