import { describe, it, expect, afterAll } from "vitest";
import {
  getAppRuntime,
  shutdownAppRuntime,
  parseFfmpegProgressLine,
  runFFmpeg,
  interpolateTransform,
  applyEasing
} from "../src/runtime/index.js";

describe("Runtime Execution & FFmpeg Tasks (TASK-104)", () => {
  afterAll(async () => {
    await shutdownAppRuntime();
  });

  describe("TaskRuntime Instance", () => {
    it("should initialize singleton runtime with auto workers", () => {
      const runtime = getAppRuntime();
      expect(runtime).toBeDefined();
      expect(["created", "running"]).toContain(runtime.state);
    });

    it("should execute concurrent tasks using worker threads", async () => {
      const runtime = getAppRuntime();
      const squareTask = runtime.task<number, number>(async (x) => x * x, {
        name: "square_task"
      });

      const inputs = [1, 2, 3, 4, 5];
      const results = await Promise.all(inputs.map((n) => squareTask(n)));
      expect(results).toEqual([1, 4, 9, 16, 25]);
    });
  });

  describe("FFmpeg CLI & Progress Parsing", () => {
    it("should parse FFmpeg progress lines correctly", () => {
      const sampleLine = "frame=  120 fps= 60.2 q=-0.0 size=    1024kB time=00:00:04.00 bitrate=2097.2kbits/s speed=2.01x";
      const progress = parseFfmpegProgressLine(sampleLine);

      expect(progress).not.toBeNull();
      expect(progress?.frame).toBe(120);
      expect(progress?.fps).toBe(60.2);
      expect(progress?.timeMs).toBe(4000);
      expect(progress?.speed).toBe(2.01);
    });

    it("should return null for non-progress lines", () => {
      const headerLine = "Input #0, lavfi, from 'color=c=black:s=1080x1920':";
      expect(parseFfmpegProgressLine(headerLine)).toBeNull();
    });

    it("should successfully run real FFmpeg -version via CLI executor", async () => {
      const result = await runFFmpeg({
        args: ["-version"]
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout || result.stderr).toContain("ffmpeg version");
    });
  });

  describe("Timeline Keyframe Interpolation", () => {
    it("should interpolate between keyframes using easing", () => {
      const keyframes = [
        { timeMs: 0, x: 0, y: 0, z: 0, rotationZ: 0, scaleX: 1, scaleY: 1, opacity: 1, easing: "linear" as const },
        { timeMs: 1000, x: 100, y: 200, z: 0, rotationZ: 1, scaleX: 2, scaleY: 2, opacity: 0.5, easing: "linear" as const }
      ];

      // At start
      const at0 = interpolateTransform(keyframes, 0);
      expect(at0.x).toBe(0);
      expect(at0.y).toBe(0);

      // At midpoint
      const at500 = interpolateTransform(keyframes, 500);
      expect(at500.x).toBeCloseTo(50, 1);
      expect(at500.y).toBeCloseTo(100, 1);
      expect(at500.scaleX).toBeCloseTo(1.5, 1);
      expect(at500.opacity).toBeCloseTo(0.75, 1);

      // At end
      const at1000 = interpolateTransform(keyframes, 1000);
      expect(at1000.x).toBe(100);
      expect(at1000.y).toBe(200);
    });

    it("should clamp values outside keyframe bounds", () => {
      const keyframes = [
        { timeMs: 100, x: 10, y: 20, z: 0, rotationZ: 0, scaleX: 1, scaleY: 1, opacity: 1, easing: "linear" as const },
        { timeMs: 500, x: 50, y: 60, z: 0, rotationZ: 0, scaleX: 1, scaleY: 1, opacity: 1, easing: "linear" as const }
      ];

      const before = interpolateTransform(keyframes, 0);
      expect(before.x).toBe(10);

      const after = interpolateTransform(keyframes, 1000);
      expect(after.x).toBe(50);
    });

    it("should support different easing functions", () => {
      expect(applyEasing(0, "easeInOut")).toBe(0);
      expect(applyEasing(1, "easeInOut")).toBe(1);
      expect(applyEasing(0.5, "easeInOut")).toBe(0.5);
    });
  });
});
