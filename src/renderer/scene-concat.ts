import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runFFmpeg } from "../runtime/ffmpeg-task.js";

export interface ConcatOptions {
  outputPath: string;
  videoPaths: string[];
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (progressText: string) => void;
}

/**
 * Rapidly concatenates multiple MP4 scene videos into a final master video without re-encoding,
 * using FFmpeg concat demuxer (`-c copy`).
 */
export async function concatSceneVideos(options: ConcatOptions): Promise<string> {
  const { videoPaths, outputPath, signal, timeoutMs } = options;

  if (videoPaths.length === 0) {
    throw new Error("concatSceneVideos requires at least one input video path");
  }

  // Ensure output directory exists
  const outDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // If only 1 video, direct copy is instantaneous
  if (videoPaths.length === 1) {
    fs.copyFileSync(videoPaths[0], outputPath);
    return path.resolve(outputPath);
  }

  // Create temporary concat list
  const tempFile = path.join(
    os.tmpdir(),
    `n2m_concat_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`
  );

  const concatLines = videoPaths.map((p) => {
    // Escape single quotes for ffmpeg concat demuxer
    const escaped = path.resolve(p).replace(/'/g, "'\\''");
    return `file '${escaped}'`;
  });

  fs.writeFileSync(tempFile, concatLines.join("\n") + "\n", "utf8");

  try {
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      tempFile,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath
    ];

    await runFFmpeg({
      args,
      timeoutMs: timeoutMs ?? 120_000,
      signal
    });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error(`FFmpeg concat produced an empty or missing output: ${outputPath}`);
    }

    return path.resolve(outputPath);
  } finally {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // ignore
      }
    }
  }
}
