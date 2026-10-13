import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { IVideoGeneratorProvider, VideoGenerationTask, VideoGenerationResult } from "../video-provider.js";

/**
 * 快速测试与 CI Mock 视频生成器
 * 使用 FFmpeg 生成合法的极小测试 MP4 视频，确保在流水线合成测试中 100% 稳定
 */
export class MockVideoProvider implements IVideoGeneratorProvider {
  readonly id = "mock";
  readonly displayName = "Mock Video Provider (Testing)";

  isConfigured(): boolean {
    return true;
  }

  async generateShotVideo(task: VideoGenerationTask): Promise<VideoGenerationResult> {
    fs.mkdirSync(path.dirname(task.outputVideoPath), { recursive: true });
    const durSec = Math.max(0.5, (task.shot.durationMs / 1000)).toFixed(2);
    const w = task.width || 64;
    const h = task.height || 64;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", [
        "-y",
        "-f", "lavfi",
        "-i", `color=c=black:s=${w}x${h}:r=24`,
        "-t", durSec,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        task.outputVideoPath
      ], { stdio: ["ignore", "pipe", "pipe"] });

      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(task.outputVideoPath)) resolve();
        else reject(new Error(`Mock video generation failed: ${stderr}`));
      });
      proc.on("error", reject);
    });

    return {
      videoPath: task.outputVideoPath,
      durationMs: task.shot.durationMs,
      provider: this.id,
      modelUsed: "mock-v1"
    };
  }
}
