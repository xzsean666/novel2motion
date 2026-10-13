import type { KVDB, Table } from "kvdb-sdk";
import { createHash } from "node:crypto";

export interface CachedAudioEntry {
  audioPath: string;
  durationMs: number;
  text: string;
  voiceId: string;
  rate: number;
  pitch: number;
  createdAt: number;
}

export class AudioCache {
  private readonly table: Table<CachedAudioEntry>;

  constructor(private readonly db: KVDB) {
    this.table = this.db.table<CachedAudioEntry>("audio_cache");
  }

  /**
   * Generates a deterministic SHA256 key for a voice/text tuple
   */
  private generateKey(voiceId: string, text: string, rate: number, pitch: number): string {
    const raw = `${voiceId}::${rate.toFixed(2)}::${pitch.toFixed(1)}::${text.trim()}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Retrieves cached audio metadata if present
   */
  async getAudio(
    voiceId: string,
    text: string,
    rate = 1.0,
    pitch = 0
  ): Promise<{ audioPath: string; durationMs: number } | null> {
    const key = this.generateKey(voiceId, text, rate, pitch);
    const entry = await this.table.get(key);
    if (!entry) return null;
    return {
      audioPath: entry.audioPath,
      durationMs: entry.durationMs
    };
  }

  /**
   * Stores TTS audio metadata in cache
   */
  async setAudio(
    voiceId: string,
    text: string,
    audioPath: string,
    durationMs: number,
    rate = 1.0,
    pitch = 0,
    ttlMs?: number
  ): Promise<void> {
    const key = this.generateKey(voiceId, text, rate, pitch);
    const entry: CachedAudioEntry = {
      audioPath,
      durationMs,
      text: text.trim(),
      voiceId,
      rate,
      pitch,
      createdAt: Date.now()
    };
    await this.table.set(key, entry, { ttlMs });
  }

  /**
   * Clears the audio cache
   */
  async clear(): Promise<void> {
    await this.table.clear();
  }
}
