import { DramaShot, DramaScript } from "../models/drama-dsl.js";

export interface VideoGenerationTask {
  shot: DramaShot;
  script?: DramaScript;
  width: number;
  height: number;
  fps: number;
  outputVideoPath: string;
  keyframeImagePath?: string;
}

export interface VideoGenerationResult {
  videoPath: string;
  durationMs: number;
  provider: string;
  modelUsed: string;
}

/**
 * 统一短剧视频生成提供者接口 (IVideoGeneratorProvider)
 * 允许无缝切换：
 * - 快手可灵 (Kling AI v1.5 / v2.0)
 * - MiniMax 海螺 AI (Hailuo Video-01)
 * - 阿里通义万相 (Wan 2.1 / ComfyUI)
 * - 本地/离线电影级运镜回退引擎 (Cinematic Motion Engine)
 */
export interface IVideoGeneratorProvider {
  readonly id: string;
  readonly displayName: string;

  /**
   * 生成单个分镜头的动态视频
   */
  generateShotVideo(task: VideoGenerationTask): Promise<VideoGenerationResult>;

  /**
   * 检查提供者环境就绪情况（如 API Key 是否配置）
   */
  isConfigured(): boolean;
}
