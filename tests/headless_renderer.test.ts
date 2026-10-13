import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import * as THREE from "three";
import { ThreeStage } from "../src/engine/stage/three-stage.js";
import { PuppetCharacter } from "../src/engine/puppet/puppet-character.js";
import { SubtitleMesh } from "../src/engine/subtitle/subtitle-mesh.js";
import { VFXManager } from "../src/engine/vfx/screen-fx.js";
import { HeadlessRenderer } from "../src/renderer/headless-renderer.js";
import { StreamEncoder, renderStageToMp4 } from "../src/renderer/stream-encoder.js";

describe("Headless Three.js Rasterizer & Stream FFmpeg Encoder (TASK-118)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_headless_test_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should rasterize ThreeStage scene to an uncompressed RGBA pixel buffer", () => {
    const stage = new ThreeStage({ viewportWidth: 320, viewportHeight: 240 });
    const puppet = new PuppetCharacter({ id: "han_li", initialAction: "cruise" });
    stage.addActor("han_li", puppet.root, "center");

    const subtitle = new SubtitleMesh({ viewportWidth: 320, viewportHeight: 240 });
    subtitle.setCue("九天玄雷，听我号令！");
    stage.addSubtitle(subtitle.mesh);

    const renderer = new HeadlessRenderer({ width: 320, height: 240 });
    const frameBuffer = renderer.renderFrame(stage);

    expect(frameBuffer).toBeInstanceOf(Buffer);
    expect(frameBuffer.length).toBe(320 * 240 * 4); // Exact RGBA byte size

    // Ensure pixels are not all zeroes (actual scene content drawn)
    let nonZeroCount = 0;
    for (let i = 0; i < frameBuffer.length; i += 4) {
      if (frameBuffer[i] !== 0 || frameBuffer[i + 1] !== 0 || frameBuffer[i + 2] !== 0) {
        nonZeroCount++;
      }
    }
    expect(nonZeroCount).toBeGreaterThan(1000);

    stage.dispose();
  });

  it("should stream raw frames to FFmpeg and produce a valid MP4 file", async () => {
    const width = 320;
    const height = 240;
    const fps = 24;
    const outputPath = path.join(tempDir, "stream_test.mp4");

    const encoder = new StreamEncoder({
      outputPath,
      width,
      height,
      fps
    });

    encoder.start();

    // Write 12 frames of alternating color (0.5 second video)
    for (let f = 0; f < 12; f++) {
      const buffer = Buffer.alloc(width * height * 4);
      const r = (f * 20) % 255;
      const g = 100;
      const b = 200;
      for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = r;
        buffer[i + 1] = g;
        buffer[i + 2] = b;
        buffer[i + 3] = 255;
      }
      await encoder.writeFrame(buffer);
    }

    const finalPath = await encoder.finish();
    expect(fs.existsSync(finalPath)).toBe(true);
    expect(fs.statSync(finalPath).size).toBeGreaterThan(500);
  });

  it("should render stage animation end-to-end to MP4 via renderStageToMp4", async () => {
    const stage = new ThreeStage({ viewportWidth: 320, viewportHeight: 240 });
    const puppet = new PuppetCharacter({ id: "han_tianzun", initialAction: "cruise" });
    stage.addActor("han_tianzun", puppet.root, "mid_left");

    const vfx = new VFXManager({ width: 320, height: 240 });
    stage.addVFX(vfx.root);
    vfx.triggerHit(true);

    const outputPath = path.join(tempDir, "e2e_stage_render.mp4");

    let progressCount = 0;
    const resultVideo = await renderStageToMp4({
      stage,
      durationMs: 500, // ~12 frames
      fps: 24,
      width: 320,
      height: 240,
      outputPath,
      updateCallback: (_timeMs, dt) => {
        puppet.update(dt);
        vfx.update(dt);
      },
      onProgress: (_p) => {
        progressCount++;
      }
    });

    expect(fs.existsSync(resultVideo)).toBe(true);
    expect(fs.statSync(resultVideo).size).toBeGreaterThan(1000);
    expect(progressCount).toBe(12);

    stage.dispose();
  });
});
