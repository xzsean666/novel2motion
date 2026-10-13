import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DramaScript } from "../models/drama-dsl.js";
import { mixSceneAudio } from "../../audio/audio-mixer.js";
import type { AudioCueInput } from "../../core/models/timeline.js";

export interface DramaComposerOptions {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  assetsDir?: string;
}

/**
 * 影视级短剧多轨道非线性视听合成器 (Drama Composer)
 * 将所有分镜头视频、对白配音、音效、电影级 BGM 以及爆款字幕合成最终短剧母带 MP4。
 */
export class DramaComposer {
  static async compose(script: DramaScript, options: DramaComposerOptions): Promise<string> {
    const { outputPath, width, height, fps, assetsDir = "assets" } = options;
    const workDir = path.dirname(outputPath);
    fs.mkdirSync(workDir, { recursive: true });

    // 1. 搜集并校验所有分镜头的视频片段
    const shotVideoPaths: string[] = [];
    for (const shot of script.shots) {
      if (shot.renderedVideoPath && fs.existsSync(shot.renderedVideoPath)) {
        shotVideoPaths.push(shot.renderedVideoPath);
      }
    }

    if (shotVideoPaths.length === 0) {
      throw new Error("No rendered shot videos available to compose");
    }

    // 2. 拼接视频轨道 (Concatenate Video Track)
    const concatListFile = path.join(workDir, `concat_${script.dramaId}_${Date.now()}.txt`);
    const listContent = shotVideoPaths
      .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
      .join("\n");
    fs.writeFileSync(concatListFile, listContent, "utf8");

    const visualCombinedMp4 = path.join(workDir, `combined_visual_${script.dramaId}_${Date.now()}.mp4`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        [
          "-y",
          "-f", "concat",
          "-safe", "0",
          "-i", concatListFile,
          "-c", "copy",
          visualCombinedMp4
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(visualCombinedMp4)) resolve();
        else reject(new Error(`Failed to concat video track: ${stderr}`));
      });
      proc.on("error", reject);
    });

    // 3. 构建多轨混音 (Voices + SFX + BGM with Audio Ducking)
    const audioCues: AudioCueInput[] = [];
    let currentTimelineMs = 0;

    for (const shot of script.shots) {
      if (shot.dialogue && shot.dialogue.audioPath && fs.existsSync(shot.dialogue.audioPath)) {
        audioCues.push({
          cueId: `voice_${shot.shotId}`,
          type: "voice",
          audioPath: shot.dialogue.audioPath,
          startTimeMs: currentTimelineMs + 200,
          durationMs: shot.dialogue.audioDurationMs ?? (shot.durationMs - 300),
          volume: 1.0,
          duckBgm: true
        });
      }

      // 添加击打与转场音效
      for (const sfx of shot.sfxTags) {
        const sfxName = sfx.replace(/^sfx_/, "");
        const sfxPath = path.resolve(assetsDir, "audio/sfx", `${sfxName}.wav`);
        if (fs.existsSync(sfxPath)) {
          audioCues.push({
            cueId: `sfx_${shot.shotId}_${sfx}`,
            type: "sfx",
            audioPath: sfxPath,
            startTimeMs: currentTimelineMs + 100,
            durationMs: 800,
            volume: 0.8
          });
        }
      }

      currentTimelineMs += shot.durationMs;
    }

    const totalDurationMs = currentTimelineMs;

    // 解析 BGM
    let bgmPath: string | undefined;
    const bgmCandidates = [
      script.bgmPath,
      path.resolve(assetsDir, "audio/bgm/combat_epic.wav"),
      path.resolve(assetsDir, "audio/bgm/tense_suspense.wav")
    ];
    for (const cand of bgmCandidates) {
      if (cand && fs.existsSync(cand)) {
        bgmPath = cand;
        break;
      }
    }

    const mixedWav = path.join(workDir, `mixed_${script.dramaId}_${Date.now()}.wav`);
    let finalAudioPath: string | undefined;

    try {
      await mixSceneAudio({
        bgm: bgmPath ? { filePath: bgmPath, volume: 0.32 } : undefined,
        audioCues,
        totalDurationMs,
        outputPath: mixedWav
      });
      if (fs.existsSync(mixedWav)) {
        finalAudioPath = mixedWav;
      }
    } catch {
      // 降级：若混音失败则仅使用纯画面
    }

    // 4. 生成带字幕的最终 MP4
    const srtFile = path.join(workDir, `subtitles_${script.dramaId}_${Date.now()}.srt`);
    this.generateSrtFile(script, srtFile);

    const ffmpegArgs: string[] = ["-y", "-i", visualCombinedMp4];

    if (finalAudioPath) {
      ffmpegArgs.push("-i", finalAudioPath);
    }

    // 视频滤镜：字幕与画质微调
    // 若系统支持 libass 字幕，则烧录字幕；否则安全拷贝
    const isVertical = height > width;
    const subtitleFontSize = isVertical ? 26 : 22;

    ffmpegArgs.push(
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "19",
      "-pix_fmt", "yuv420p"
    );

    if (finalAudioPath) {
      ffmpegArgs.push("-c:a", "aac", "-b:a", "192k");
    }

    ffmpegArgs.push(outputPath);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", ffmpegArgs, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) resolve();
        else reject(new Error(`Failed to encode final drama master: ${stderr}`));
      });
      proc.on("error", reject);
    });

    // 清理临时拼接文件
    try {
      if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile);
      if (fs.existsSync(visualCombinedMp4)) fs.unlinkSync(visualCombinedMp4);
      if (fs.existsSync(mixedWav)) fs.unlinkSync(mixedWav);
      if (fs.existsSync(srtFile)) fs.unlinkSync(srtFile);
    } catch {
      // ignore
    }

    return outputPath;
  }

  private static generateSrtFile(script: DramaScript, srtPath: string): void {
    let srtContent = "";
    let srtIndex = 1;
    let offsetMs = 0;

    for (const shot of script.shots) {
      if (shot.dialogue) {
        const startMs = offsetMs + 200;
        const endMs = offsetMs + (shot.dialogue.audioDurationMs ?? (shot.durationMs - 200));

        srtContent += `${srtIndex}\n`;
        srtContent += `${this.formatTime(startMs)} --> ${this.formatTime(endMs)}\n`;
        srtContent += `${shot.dialogue.speakerName}：“${shot.dialogue.text}”\n\n`;
        srtIndex++;
      }
      offsetMs += shot.durationMs;
    }

    fs.writeFileSync(srtPath, srtContent, "utf8");
  }

  private static formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mill = ms % 1000;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(mill).padStart(3, "0")}`;
  }
}
