import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseFfmpegProgressLine, type FFmpegProgress } from "../runtime/ffmpeg-task.js";
import { HeadlessRenderer } from "./headless-renderer.js";
import type { ThreeStage } from "../engine/stage/three-stage.js";

export interface StreamEncoderOptions {
  outputPath: string;
  width: number;
  height: number;
  fps?: number; // default: 24
  crf?: number; // default: 18 (visually lossless)
  audioPath?: string;
  signal?: AbortSignal;
  onProgress?: (progress: FFmpegProgress) => void;
}

export class StreamEncoder {
  readonly outputPath: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  private readonly crf: number;
  private readonly audioPath?: string;
  private readonly signal?: AbortSignal;
  private readonly onProgress?: (progress: FFmpegProgress) => void;

  private child: ChildProcess | null = null;
  private isFinished = false;
  private stderrText = "";
  private exitPromise: Promise<number> | null = null;

  constructor(options: StreamEncoderOptions) {
    this.outputPath = path.resolve(options.outputPath);
    this.width = options.width;
    this.height = options.height;
    this.fps = options.fps ?? 24;
    this.crf = options.crf ?? 18;
    this.audioPath = options.audioPath ? path.resolve(options.audioPath) : undefined;
    this.signal = options.signal;
    this.onProgress = options.onProgress;

    // Ensure output directory exists
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Spawns FFmpeg and begins listening for raw RGBA frames via stdin
   */
  public start(): void {
    if (this.child) {
      throw new Error("StreamEncoder already started");
    }

    const args = [
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${this.width}x${this.height}`,
      "-r",
      `${this.fps}`,
      "-i",
      "pipe:0"
    ];

    if (this.audioPath && fs.existsSync(this.audioPath)) {
      args.push("-i", this.audioPath);
    }

    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      `${this.crf}`,
      "-movflags",
      "+faststart"
    );

    if (this.audioPath && fs.existsSync(this.audioPath)) {
      args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
    }

    args.push(this.outputPath);

    this.child = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    if (this.signal) {
      this.signal.addEventListener("abort", () => {
        this.kill();
      });
    }

    this.child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      this.stderrText += text;

      if (this.onProgress) {
        const lines = text.split(/[\r\n]+/);
        for (const line of lines) {
          const p = parseFfmpegProgressLine(line);
          if (p) this.onProgress(p);
        }
      }
    });

    this.exitPromise = new Promise<number>((resolve, reject) => {
      this.child?.on("error", (err) => {
        reject(err);
      });

      this.child?.on("close", (code) => {
        resolve(code ?? 0);
      });
    });
  }

  /**
   * Writes a raw RGBA frame to FFmpeg's stdin with backpressure flow control
   */
  public async writeFrame(frameBuffer: Buffer): Promise<void> {
    if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
      throw new Error("FFmpeg encoder stdin is closed or process is not running");
    }

    const canContinue = this.child.stdin.write(frameBuffer);
    if (!canContinue) {
      await new Promise<void>((resolve) => {
        this.child?.stdin?.once("drain", resolve);
      });
    }
  }

  /**
   * Signals end of stream, flushes remaining packets, and waits for MP4 file finalization
   */
  public async finish(): Promise<string> {
    if (!this.child || !this.exitPromise) {
      throw new Error("Encoder was not started");
    }

    if (!this.isFinished) {
      this.isFinished = true;
      await new Promise<void>((resolve) => {
        this.child?.stdin?.end(resolve);
      });
    }

    const exitCode = await this.exitPromise;
    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with non-zero code ${exitCode}. Stderr: ${this.stderrText.slice(-1000)}`);
    }

    if (!fs.existsSync(this.outputPath) || fs.statSync(this.outputPath).size === 0) {
      throw new Error(`FFmpeg output video is missing or 0 bytes: ${this.outputPath}`);
    }

    return this.outputPath;
  }

  public kill(): void {
    if (this.child && !this.child.killed) {
      this.child.kill("SIGKILL");
    }
  }
}

export interface RenderStageOptions {
  stage: ThreeStage;
  durationMs: number;
  outputPath: string;
  width?: number; // default: stage.width
  height?: number; // default: stage.height
  fps?: number; // default: 24
  audioPath?: string;
  preloadImages?: string[];
  onProgress?: (progress: { frame: number; totalFrames: number; percent: number }) => void;
  updateCallback?: (timeMs: number, deltaTimeMs: number) => void;
}

/**
 * End-to-end stage rendering pipeline: drives timeline, rasterizes offscreen frames, and pipes to MP4
 */
export async function renderStageToMp4(options: RenderStageOptions): Promise<string> {
  const { stage, durationMs, outputPath } = options;
  const fps = options.fps ?? 24;
  const width = options.width ?? stage.width;
  const height = options.height ?? stage.height;

  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  const deltaTimeMs = 1000 / fps;

  const renderer = new HeadlessRenderer({ width, height });
  if (options.preloadImages && options.preloadImages.length > 0) {
    await renderer.preloadImages(options.preloadImages);
  }

  const encoder = new StreamEncoder({
    outputPath,
    width,
    height,
    fps,
    audioPath: options.audioPath
  });

  encoder.start();

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const timeMs = frame * deltaTimeMs;

      // Update stage animations & physics
      if (options.updateCallback) {
        options.updateCallback(timeMs, deltaTimeMs);
      }

      // Render raw RGBA frame
      const frameBuffer = renderer.renderFrame(stage);

      // Pipe to FFmpeg
      await encoder.writeFrame(frameBuffer);

      if (options.onProgress) {
        options.onProgress({
          frame: frame + 1,
          totalFrames,
          percent: Math.round(((frame + 1) / totalFrames) * 100)
        });
      }
    }

    return await encoder.finish();
  } catch (err) {
    encoder.kill();
    throw err;
  } finally {
    renderer.dispose();
  }
}
