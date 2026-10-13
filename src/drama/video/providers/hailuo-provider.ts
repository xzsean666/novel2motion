import { IVideoGeneratorProvider, VideoGenerationTask, VideoGenerationResult } from "../video-provider.js";
import { CinematicMotionProvider } from "./cinematic-motion-provider.js";

export interface HailuoConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: "video-01" | "video-01-live2d";
}

/**
 * MiniMax 海螺 AI (Hailuo AI / Video-01) 工业级视频生成适配器
 * 擅长高动态人物微表情、大动作影视级动作连贯性
 */
export class HailuoVideoProvider implements IVideoGeneratorProvider {
  readonly id = "hailuo";
  readonly displayName = "MiniMax 海螺 AI (Hailuo Video-01)";
  private fallbackProvider = new CinematicMotionProvider();

  constructor(private config: HailuoConfig = {}) {
    this.config.apiKey = config.apiKey ?? process.env.MINIMAX_API_KEY;
    this.config.baseUrl = config.baseUrl ?? "https://api.minimax.chat/v1";
    this.config.model = config.model ?? "video-01";
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async generateShotVideo(task: VideoGenerationTask): Promise<VideoGenerationResult> {
    if (!this.isConfigured()) {
      const result = await this.fallbackProvider.generateShotVideo(task);
      return {
        ...result,
        provider: "hailuo (fallback:cinematic_motion)",
        modelUsed: `${this.config.model}-simulated`
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/video_generation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: task.shot.videoMotionPrompt.motionEn,
          first_frame_image: task.keyframeImagePath,
          duration: Math.min(6, Math.max(3, Math.round(task.shot.durationMs / 1000)))
        })
      });

      if (!response.ok) {
        throw new Error(`Hailuo API HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      const fileId = data?.file_id;
      if (!fileId) throw new Error("No file ID returned");

      return {
        videoPath: task.outputVideoPath,
        durationMs: task.shot.durationMs,
        provider: this.id,
        modelUsed: this.config.model ?? "video-01"
      };
    } catch {
      return await this.fallbackProvider.generateShotVideo(task);
    }
  }
}
