import { TaskRuntime } from "node-task-runtime";
import { getAppRuntime } from "./app-runtime.js";

export interface FFmpegProgress {
  frame?: number;
  fps?: number;
  timeMs?: number;
  speed?: number;
  rawText?: string;
}

export interface FFmpegRunOptions {
  args: string[];
  inputBuffer?: Buffer;
  onProgress?: (progress: FFmpegProgress) => void;
  cwd?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface FFmpegResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Parses stderr output from FFmpeg to extract frame count, fps, timestamp and encoding speed.
 */
export function parseFfmpegProgressLine(line: string): FFmpegProgress | null {
  if (!line.includes("frame=") && !line.includes("time=")) {
    return null;
  }

  const progress: FFmpegProgress = { rawText: line.trim() };

  const frameMatch = line.match(/frame=\s*(\d+)/);
  if (frameMatch) progress.frame = parseInt(frameMatch[1], 10);

  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) progress.fps = parseFloat(fpsMatch[1]);

  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseFloat(timeMatch[3]);
    progress.timeMs = Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  const speedMatch = line.match(/speed=\s*([\d.]+)x/);
  if (speedMatch) progress.speed = parseFloat(speedMatch[1]);

  return progress;
}

/**
 * Runs an FFmpeg process through node-task-runtime's CLI executor with lifecycle control,
 * stderr progress streaming, timeout enforcement, and zero zombie process guarantees.
 */
export async function runFFmpeg(
  options: FFmpegRunOptions,
  customRuntime?: TaskRuntime
): Promise<FFmpegResult> {
  const runtime = customRuntime ?? getAppRuntime();

  let accumulatedStderr = "";
  let accumulatedStdout = "";

  const ffmpegTask = runtime.cli<FFmpegRunOptions, string>("ffmpeg", {
    name: "ffmpeg_execution",
    command: "ffmpeg",
    args: () => options.args,
    cwd: options.cwd,
    timeout: options.timeoutMs ?? 180_000,
    signal: options.signal,
    stdin: options.inputBuffer ? "binary" : "pipe",
    stdout: "string",
    stderr: "string",
    autoCleanTemp: "always",
    onStderr: (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      accumulatedStderr += text;

      if (options.onProgress) {
        const lines = text.split(/[\r\n]+/);
        for (const l of lines) {
          const prog = parseFfmpegProgressLine(l);
          if (prog) {
            options.onProgress(prog);
          }
        }
      }
    },
    onStdout: (chunk: Buffer) => {
      accumulatedStdout += chunk.toString("utf8");
    }
  });

  const output = await ffmpegTask(options);

  return {
    stdout: accumulatedStdout || output,
    stderr: accumulatedStderr,
    exitCode: 0
  };
}
