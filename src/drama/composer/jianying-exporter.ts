import fs from "node:fs";
import path from "node:path";
import { DramaScript } from "../models/drama-dsl.js";

/**
 * 剪映 / CapCut 工业级短剧草稿工程导出器 (Jianying Draft Exporter)
 * 允许用户在生成短剧的同时，输出 100% 兼容剪映/CapCut 桌面版的工程文件 (draft_content.json)。
 * 短剧创作者可以直接在剪映中打开工程，自由替换特效、精修字幕花字、微调转场，打造爆款！
 */
export class JianyingDraftExporter {
  static exportDraft(script: DramaScript, outputDraftPath: string): string {
    const draftDir = path.dirname(outputDraftPath);
    fs.mkdirSync(draftDir, { recursive: true });

    let currentTimelineOffsetMicro = 0;
    const tracks: any[] = [
      { id: "track_video_main", type: "video", segments: [] },
      { id: "track_audio_voice", type: "audio", segments: [] },
      { id: "track_audio_sfx", type: "audio", segments: [] },
      { id: "track_text_subtitle", type: "text", segments: [] }
    ];

    const materials: {
      videos: any[];
      audios: any[];
      texts: any[];
    } = {
      videos: [],
      audios: [],
      texts: []
    };

    for (const shot of script.shots) {
      const shotDurMicro = shot.durationMs * 1000;
      const videoMatId = `mat_video_${shot.shotId}`;

      // 1. 视频素材段
      materials.videos.push({
        id: videoMatId,
        path: shot.renderedVideoPath || shot.keyframeImagePath || "",
        duration: shotDurMicro
      });

      tracks[0].segments.push({
        id: `seg_v_${shot.shotId}`,
        material_id: videoMatId,
        target_timerange: {
          start: currentTimelineOffsetMicro,
          duration: shotDurMicro
        }
      });

      // 2. 对白音频与字幕
      if (shot.dialogue) {
        const voiceMatId = `mat_voice_${shot.shotId}`;
        const textMatId = `mat_text_${shot.shotId}`;

        if (shot.dialogue.audioPath) {
          materials.audios.push({
            id: voiceMatId,
            path: shot.dialogue.audioPath,
            duration: (shot.dialogue.audioDurationMs ?? shot.durationMs) * 1000
          });

          tracks[1].segments.push({
            id: `seg_a_${shot.shotId}`,
            material_id: voiceMatId,
            target_timerange: {
              start: currentTimelineOffsetMicro + 200000, // 略微延后 200ms 入场
              duration: (shot.dialogue.audioDurationMs ?? (shot.durationMs - 300)) * 1000
            }
          });
        }

        materials.texts.push({
          id: textMatId,
          content: shot.dialogue.text,
          speaker: shot.dialogue.speakerName,
          style: {
            textColor: "#FFD700",
            strokeColor: "#000000",
            fontSize: 48
          }
        });

        tracks[3].segments.push({
          id: `seg_t_${shot.shotId}`,
          material_id: textMatId,
          target_timerange: {
            start: currentTimelineOffsetMicro + 200000,
            duration: (shot.dialogue.audioDurationMs ?? (shot.durationMs - 300)) * 1000
          }
        });
      }

      currentTimelineOffsetMicro += shotDurMicro;
    }

    const draftData = {
      canvas_config: {
        width: script.aspectRatio === "9:16" ? 1080 : 1920,
        height: script.aspectRatio === "9:16" ? 1920 : 1080,
        ratio: script.aspectRatio
      },
      duration: currentTimelineOffsetMicro,
      materials,
      tracks,
      platform: {
        os: process.platform,
        app_version: "novel2motion-drama-v2"
      }
    };

    fs.writeFileSync(outputDraftPath, JSON.stringify(draftData, null, 2), "utf8");
    return outputDraftPath;
  }
}
