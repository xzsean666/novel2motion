import path from "node:path";
import { AudioCue, AudioCueInput } from "../core/models/timeline.js";
import { runFFmpeg } from "../runtime/ffmpeg-task.js";

export interface BgmTrackConfig {
  filePath: string;
  volume?: number;
}

export interface MixSceneAudioOptions {
  bgm?: BgmTrackConfig;
  audioCues: (AudioCue | AudioCueInput)[];
  totalDurationMs: number;
  outputPath: string;
}

/**
 * Builds the FFmpeg filter graph string for multi-track audio mixing with BGM ducking.
 */
export function buildAudioFilterGraph(
  bgm: BgmTrackConfig | undefined,
  audioCues: (AudioCue | AudioCueInput)[],
  totalDurationMs: number
): { filterGraph: string; inputArgs: string[] } {
  const inputArgs: string[] = [];
  const filterParts: string[] = [];

  let inputIndex = 0;

  // 1. Process BGM Track if provided
  let hasBgm = false;
  if (bgm && bgm.filePath) {
    hasBgm = true;
    inputArgs.push("-i", bgm.filePath);

    const defaultBgmVol = bgm.volume ?? 0.4;
    const duckingCues = audioCues.filter((c) => c.duckBgm);

    if (duckingCues.length > 0) {
      // Build conditions for time windows where BGM should be suppressed (-14dB = ~0.2x volume)
      const conditions = duckingCues
        .map((c) => {
          const startSec = (Math.max(0, c.startTimeMs - 100) / 1000).toFixed(2);
          const endSec = ((c.startTimeMs + c.durationMs + 200) / 1000).toFixed(2);
          return `between(t,${startSec},${endSec})`;
        })
        .join("+");

      const duckedVol = (defaultBgmVol * 0.25).toFixed(2);
      filterParts.push(
        `[0:a]aloop=loop=-1:size=2e+09,volume='if(${conditions},${duckedVol},${defaultBgmVol})':eval=frame[bgm_out]`
      );
    } else {
      filterParts.push(
        `[0:a]aloop=loop=-1:size=2e+09,volume=${defaultBgmVol}[bgm_out]`
      );
    }
    inputIndex++;
  }

  // 2. Process Dialogue and SFX Cues
  const cueLabels: string[] = [];
  for (let i = 0; i < audioCues.length; i++) {
    const cue = audioCues[i];
    inputArgs.push("-i", cue.audioPath);

    const streamIdx = inputIndex++;
    const label = `cue_${i}`;
    const delayMs = Math.max(0, Math.round(cue.startTimeMs));
    const vol = cue.volume ?? 1.0;

    filterParts.push(
      `[${streamIdx}:a]volume=${vol},adelay=${delayMs}|${delayMs}[${label}]`
    );
    cueLabels.push(`[${label}]`);
  }

  // 3. Mix all streams together
  const mixInputs = (hasBgm ? ["[bgm_out]"] : []).concat(cueLabels);
  const totalSec = (totalDurationMs / 1000).toFixed(3);

  if (mixInputs.length === 0) {
    // Generate silent audio
    inputArgs.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo");
    filterParts.push(`[0:a]atrim=0:${totalSec}[out_a]`);
  } else if (mixInputs.length === 1) {
    filterParts.push(`${mixInputs[0]}atrim=0:${totalSec}[out_a]`);
  } else {
    filterParts.push(
      `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0:normalize=0,atrim=0:${totalSec}[out_a]`
    );
  }

  return {
    filterGraph: filterParts.join(";"),
    inputArgs
  };
}

/**
 * Executes FFmpeg to mix BGM, dialogue, and combat SFX into a single master audio track.
 */
export async function mixSceneAudio(options: MixSceneAudioOptions): Promise<string> {
  const { filterGraph, inputArgs } = buildAudioFilterGraph(
    options.bgm,
    options.audioCues,
    options.totalDurationMs
  );

  const outputPath = path.resolve(options.outputPath);

  const ffmpegArgs = [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filterGraph,
    "-map",
    "[out_a]",
    "-c:a",
    "pcm_s16le",
    outputPath
  ];

  await runFFmpeg({
    args: ffmpegArgs
  });

  return outputPath;
}
