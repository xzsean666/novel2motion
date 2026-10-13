import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { AudioCache } from "../db/audio-cache.js";
import { runFFmpeg } from "../runtime/ffmpeg-task.js";
import { probeAudioDurationMs } from "./audio-probe.js";

export interface TtsOptions {
  voiceId: string;
  rate?: number;
  pitch?: number;
}

export interface TtsResult {
  audioBuffer: Buffer;
  durationMs: number;
}

export interface TtsSynthesizer {
  synthesize(text: string, options: TtsOptions): Promise<TtsResult>;
}

/**
 * Generates a valid 16-bit mono 44.1kHz PCM WAV buffer in pure Node.js.
 */
export function generateValidPcmWav(durationMs: number, frequency = 440): Buffer {
  const sampleRate = 44100;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate gentle sine wave audio
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Fade in and out to prevent click
    const fadeDuration = 0.05;
    const fade = Math.min(1, Math.min(t / fadeDuration, (durationMs / 1000 - t) / fadeDuration));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3 * Math.max(0, fade);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Mock TTS Synthesizer for offline environments and fast tests.
 */
export class MockTtsSynthesizer implements TtsSynthesizer {
  async synthesize(text: string, options: TtsOptions): Promise<TtsResult> {
    const rate = options.rate ?? 1.0;
    // Base duration: ~220ms per character scaled by speed rate
    const durationMs = Math.round((Math.max(1000, text.length * 220) / rate));
    const audioBuffer = generateValidPcmWav(durationMs, 520);
    return {
      audioBuffer,
      durationMs
    };
  }
}

/**
 * Real Edge-TTS Neural Speech Synthesizer using Microsoft Edge Cloud TTS.
 * Generates natural high-fidelity voices for narrators and Xianxia characters.
 */
export class EdgeTtsSynthesizer implements TtsSynthesizer {
  constructor(private readonly fallback: TtsSynthesizer = new MockTtsSynthesizer()) {}

  async synthesize(text: string, options: TtsOptions): Promise<TtsResult> {
    const voice = options.voiceId || "zh-CN-YunxiNeural";
    const rateVal = options.rate ?? 1.0;
    const rateDiff = Math.round((rateVal - 1.0) * 100);
    const rateStr = rateDiff >= 0 ? `+${rateDiff}%` : `${rateDiff}%`;
    const pitchVal = Math.round(options.pitch ?? 0.0);
    const pitchStr = pitchVal >= 0 ? `+${pitchVal}Hz` : `${pitchVal}Hz`;

    const tmpMp3 = path.join(os.tmpdir(), `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);
    const tmpWav = path.join(os.tmpdir(), `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`);

    try {
      // 1. Synthesize via edge-tts CLI
      await new Promise<void>((resolve, reject) => {
        const proc = spawn("edge-tts", [
          "--voice", voice,
          "--rate", rateStr,
          "--pitch", pitchStr,
          "--text", text,
          "--write-media", tmpMp3
        ]);

        let stderr = "";
        proc.stderr?.on("data", (d) => { stderr += d.toString(); });

        proc.on("close", (code) => {
          if (code === 0 && fs.existsSync(tmpMp3) && fs.statSync(tmpMp3).size > 0) {
            resolve();
          } else {
            reject(new Error(`edge-tts failed with exit code ${code}: ${stderr}`));
          }
        });
        proc.on("error", (err) => reject(err));
      });

      // 2. Transcode to standard 44.1kHz 16-bit mono PCM WAV using FFmpeg for optimal mixing
      await runFFmpeg({
        args: [
          "-y",
          "-i", tmpMp3,
          "-ar", "44100",
          "-ac", "1",
          "-c:a", "pcm_s16le",
          tmpWav
        ]
      });

      const durationMs = await probeAudioDurationMs(tmpWav);
      const audioBuffer = await fs.promises.readFile(tmpWav);

      return {
        audioBuffer,
        durationMs
      };
    } catch (err) {
      if (this.fallback) {
        return this.fallback.synthesize(text, options);
      }
      throw err;
    } finally {
      if (fs.existsSync(tmpMp3)) {
        try { fs.unlinkSync(tmpMp3); } catch {}
      }
      if (fs.existsSync(tmpWav)) {
        try { fs.unlinkSync(tmpWav); } catch {}
      }
    }
  }
}

/**
 * Cached TTS Synthesizer wrapping any synthesizer with SQLite AudioCache and local disk persistence.
 */
export class CachedTtsService {
  constructor(
    private readonly synthesizer: TtsSynthesizer,
    private readonly cache: AudioCache,
    private readonly storageDir: string
  ) {}

  async getOrSynthesize(
    text: string,
    options: TtsOptions
  ): Promise<{ audioPath: string; durationMs: number; fromCache: boolean }> {
    const rate = options.rate ?? 1.0;
    const pitch = options.pitch ?? 0.0;

    // 1. Check SQLite Cache
    const cached = await this.cache.getAudio(options.voiceId, text, rate, pitch);
    if (cached && fs.existsSync(cached.audioPath)) {
      return {
        audioPath: cached.audioPath,
        durationMs: cached.durationMs,
        fromCache: true
      };
    }

    // 2. Synthesize via engine
    const { audioBuffer, durationMs } = await this.synthesizer.synthesize(text, options);

    // 3. Persist to disk
    await fs.promises.mkdir(this.storageDir, { recursive: true });
    const filename = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`;
    const fullPath = path.join(this.storageDir, filename);
    await fs.promises.writeFile(fullPath, audioBuffer);

    // 4. Update SQLite Cache
    await this.cache.setAudio(options.voiceId, text, fullPath, durationMs, rate, pitch);

    return {
      audioPath: fullPath,
      durationMs,
      fromCache: false
    };
  }
}
