import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { executeRenderPipeline } from "../src/cli/render-pipeline.js";
import { createCliProgram } from "../src/cli/index.js";
import { MockTtsSynthesizer } from "../src/audio/tts-synthesizer.js";

describe("CLI End-to-End Pipeline & Commands (TASK-120)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_cli_test_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should initialize a project workspace via CLI init command", async () => {
    const projectDir = path.join(tempDir, "my_novel_project");
    const program = createCliProgram();

    await program.parseAsync(["node", "novel2motion", "init", projectDir]);

    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "story.txt"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "project.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "assets/characters"))).toBe(true);
  });

  it("should parse text, direct, compile Three.js stage and render to MP4", async () => {
    const inputTxt = path.join(tempDir, "short_battle.txt");
    const outputMp4 = path.join(tempDir, "render_result.mp4");
    const cacheDir = path.join(tempDir, "render_cache");

    const sampleStory = `第1章 惊雷
韩立御空飞行，面无表情。
极阴祖师厉声喝道：“韩立小儿，纳命来！”
韩立冷笑一声，手中青竹蜂云剑绽放耀眼青光！
轰然一声巨响，天雷降临！
`;
    fs.writeFileSync(inputTxt, sampleStory, "utf8");

    const stepsReported: string[] = [];

    // First render pass (cold cache)
    const result1 = await executeRenderPipeline({
      inputPath: inputTxt,
      outputPath: outputMp4,
      width: 320,
      height: 240,
      fps: 24,
      cacheDir,
      ttsSynthesizer: new MockTtsSynthesizer(),
      onStep: (step, total, msg) => {
        stepsReported.push(`[${step}/${total}] ${msg}`);
      }
    });

    expect(fs.existsSync(outputMp4)).toBe(true);
    expect(fs.statSync(outputMp4).size).toBeGreaterThan(2000);
    expect(result1.sceneCount).toBeGreaterThan(0);
    expect(result1.cacheHitCount).toBe(0);
    expect(stepsReported.length).toBe(4);

    // Second render pass (warm cache)
    const outputMp4Second = path.join(tempDir, "render_result_cached.mp4");
    const result2 = await executeRenderPipeline({
      inputPath: inputTxt,
      outputPath: outputMp4Second,
      width: 320,
      height: 240,
      fps: 24,
      cacheDir,
      ttsSynthesizer: new MockTtsSynthesizer()
    });

    expect(fs.existsSync(outputMp4Second)).toBe(true);
    expect(result2.sceneCount).toBe(result1.sceneCount);
    // All scenes hit cache!
    expect(result2.cacheHitCount).toBe(result2.sceneCount);
  });
});
