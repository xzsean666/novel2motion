import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("E2E Master Video Synthesis & Final Acceptance (TASK-125)", () => {
  const masterVideoPath = path.resolve("output/xianxia_master.mp4");
  const cacheDir = path.resolve(".n2m_cache/scenes");

  it("should have generated a valid master video file in output/", () => {
    expect(fs.existsSync(masterVideoPath)).toBe(true);
    const stat = fs.statSync(masterVideoPath);
    expect(stat.size).toBeGreaterThan(1_000_000); // Greater than 1MB
  });

  it("should satisfy all strict video specifications via ffprobe", () => {
    const probeOutput = execSync(
      `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,codec_type,width,height,r_frame_rate -of json "${masterVideoPath}"`,
      { encoding: "utf8" }
    );
    const data = JSON.parse(probeOutput);

    // 1. Duration >= 25 seconds
    const duration = parseFloat(data.format.duration);
    expect(duration).toBeGreaterThanOrEqual(25.0);

    // 2. Video stream specifications
    const videoStream = data.streams.find((s: any) => s.codec_type === "video");
    expect(videoStream).toBeDefined();
    expect(videoStream.codec_name).toBe("h264");
    expect(videoStream.width).toBe(1920);
    expect(videoStream.height).toBe(1080);

    // 3. Audio stream specifications
    const audioStream = data.streams.find((s: any) => s.codec_type === "audio");
    expect(audioStream).toBeDefined();
    expect(audioStream.codec_name).toBe("aac");
  });

  it("should have populated incremental scene cache in .n2m_cache/scenes", () => {
    expect(fs.existsSync(cacheDir)).toBe(true);
    const cachedFiles = fs.readdirSync(cacheDir);
    const mp4Files = cachedFiles.filter((f) => f.endsWith(".mp4"));
    expect(mp4Files.length).toBeGreaterThanOrEqual(3);
  });
});
