import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DramaScript, DramaShot } from "./models/drama-dsl.js";
import { DramaDirector, DramaDirectorOptions } from "./director/drama-director.js";
import { CharacterBible } from "./consistency/character-bible.js";
import { IVideoGeneratorProvider } from "./video/video-provider.js";
import { CinematicMotionProvider } from "./video/providers/cinematic-motion-provider.js";
import { KlingVideoProvider } from "./video/providers/kling-provider.js";
import { HailuoVideoProvider } from "./video/providers/hailuo-provider.js";
import { WanVideoProvider } from "./video/providers/wan-provider.js";
import { MockVideoProvider } from "./video/providers/mock-provider.js";
import { LivePortraitLipSyncProvider } from "./lipsync/lipsync-provider.js";
import { DramaComposer } from "./composer/drama-composer.js";
import { JianyingDraftExporter } from "./composer/jianying-exporter.js";
import { EdgeTtsSynthesizer, MockTtsSynthesizer, CachedTtsService } from "../audio/tts-synthesizer.js";
import { createDatabase } from "../db/connection.js";
import { AudioCache } from "../db/audio-cache.js";

export interface ExecuteDramaPipelineOptions {
  inputPath: string;
  outputPath?: string;
  aspectRatio?: "9:16" | "16:9";
  width?: number;
  height?: number;
  fps?: number;
  videoProvider?: "cinematic_motion" | "kling" | "hailuo" | "wan" | "mock";
  exportJianyingDraftPath?: string;
  assetsDir?: string;
  bgmPath?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface DramaPipelineResult {
  outputPath: string;
  script: DramaScript;
  totalDurationMs: number;
  shotCount: number;
  providerUsed: string;
  jianyingDraftPath?: string;
}

/**
 * 现代工业级短剧全流程生成流水线 (Industrial AI Drama Pipeline)
 * Novel In -> Cinematic Video Out
 */
export async function executeDramaPipeline(
  options: ExecuteDramaPipelineOptions
): Promise<DramaPipelineResult> {
  const inputPath = path.resolve(options.inputPath);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input novel file not found: ${inputPath}`);
  }

  const novelText = fs.readFileSync(inputPath, "utf8");
  const aspectRatio = options.aspectRatio ?? "16:9";
  const isVertical = aspectRatio === "9:16";
  const width = options.width ?? (isVertical ? 1080 : 1920);
  const height = options.height ?? (isVertical ? 1920 : 1080);
  const fps = options.fps ?? 24;
  const outputPath = path.resolve(options.outputPath ?? "output/drama_master.mp4");
  const assetsDir = options.assetsDir ?? "assets";

  const notify = (p: number, msg: string) => {
    if (options.onProgress) options.onProgress(p, msg);
  };

  // 1. 初始化短剧导演与角色圣经
  notify(10, "AI 导演剧本拆解与黄金 3 秒分镜编排...");
  const characterBible = new CharacterBible();
  const director = new DramaDirector(characterBible);
  const script = director.direct(novelText, {
    title: path.basename(inputPath, path.extname(inputPath)),
    aspectRatio
  });
  if (options.bgmPath) {
    script.bgmPath = options.bgmPath;
  }

  // 2. 选择视频生成提供商
  let provider: IVideoGeneratorProvider;
  switch (options.videoProvider) {
    case "kling":
      provider = new KlingVideoProvider();
      break;
    case "hailuo":
      provider = new HailuoVideoProvider();
      break;
    case "wan":
      provider = new WanVideoProvider();
      break;
    case "mock":
      provider = new MockVideoProvider();
      break;
    case "cinematic_motion":
    default:
      provider = new CinematicMotionProvider();
      break;
  }

  // 3. 语音合成与对白时长校准
  notify(30, "情绪语音合成与对白时长对齐...");
  const db = createDatabase({ dbPath: ":memory:" });
  const audioCache = new AudioCache(db);
  const ttsSynthesizer = new EdgeTtsSynthesizer(new MockTtsSynthesizer());
  const ttsStorageDir = path.join(os.tmpdir(), "n2m_drama_tts");
  const ttsService = new CachedTtsService(ttsSynthesizer, audioCache, ttsStorageDir);

  const tempVideoDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_drama_shots_"));

  try {
    for (let idx = 0; idx < script.shots.length; idx++) {
      const shot = script.shots[idx];
      if (shot.dialogue) {
        try {
          const charProfile = characterBible.get(shot.dialogue.speakerId);
          const voiceId = charProfile?.voice?.voiceId ?? "zh-CN-YunxiNeural";
          const res = await ttsService.getOrSynthesize(shot.dialogue.text, {
            voiceId,
            rate: 1.05
          });
          shot.dialogue.audioPath = res.audioPath;
          shot.dialogue.audioDurationMs = res.durationMs;
          // 动态调整镜头时长以包容完整台词
          shot.durationMs = Math.max(shot.durationMs, Math.round(res.durationMs + 600));
        } catch {
          // fallback
        }
      }
    }

    // 4. 逐镜头生成电影级动态视频
    notify(50, `使用 ${provider.displayName} 渲染分镜视频...`);
    for (let idx = 0; idx < script.shots.length; idx++) {
      const shot = script.shots[idx];
      const shotVideoPath = path.join(tempVideoDir, `${shot.shotId}.mp4`);

      notify(
        50 + Math.round((idx / script.shots.length) * 35),
        `渲染分镜 [${idx + 1}/${script.shots.length}]: ${shot.scale} · ${shot.cameraMotion}`
      );

      const shotResult = await provider.generateShotVideo({
        shot,
        script,
        width,
        height,
        fps,
        outputVideoPath: shotVideoPath
      });

      shot.renderedVideoPath = shotResult.videoPath;
    }

    // 5. 影视级多轨视听合成 (FFmpeg)
    notify(88, "影视级多轨道视听合成与爆款短剧字幕排版...");
    await DramaComposer.compose(script, {
      outputPath,
      width,
      height,
      fps,
      assetsDir
    });

    script.outputVideoPath = outputPath;

    // 6. 导出剪映草稿工程 (如果用户指定)
    let exportedDraft: string | undefined;
    if (options.exportJianyingDraftPath) {
      notify(96, "导出剪映/CapCut 桌面版工程草稿...");
      exportedDraft = JianyingDraftExporter.exportDraft(script, options.exportJianyingDraftPath);
    }

    notify(100, "短剧母带生成完成！");

    const totalDurationMs = script.shots.reduce((acc, s) => acc + s.durationMs, 0);

    return {
      outputPath,
      script,
      totalDurationMs,
      shotCount: script.shots.length,
      providerUsed: provider.id,
      jianyingDraftPath: exportedDraft
    };
  } finally {
    await db.close();
    try {
      if (fs.existsSync(tempVideoDir)) {
        fs.rmSync(tempVideoDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}
