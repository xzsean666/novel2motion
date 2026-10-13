export type TrackType = "character" | "subtitle" | "sfx" | "camera" | "vfx";

export interface TimelineBlock {
  id: string;
  startTimeMs: number;
  durationMs: number;
  label: string;
  data?: Record<string, unknown>;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  blocks: TimelineBlock[];
}

export class MultiTrackTimelineModel {
  readonly tracks: TimelineTrack[] = [];
  private currentTimeMs = 0;
  private durationMs = 10000;
  private onSeekListener?: (timeMs: number) => void;

  constructor(initialDurationMs = 10000) {
    this.durationMs = initialDurationMs;
    this.initDefaultTracks();
  }

  private initDefaultTracks(): void {
    this.tracks.push({
      id: "track_camera",
      name: "3D运镜轨",
      type: "camera",
      color: "#8a2be2",
      blocks: []
    });
    this.tracks.push({
      id: "track_subtitles",
      name: "书法字幕轨",
      type: "subtitle",
      color: "#ffd700",
      blocks: []
    });
    this.tracks.push({
      id: "track_actors",
      name: "角色动作轨",
      type: "character",
      color: "#00d0aa",
      blocks: []
    });
    this.tracks.push({
      id: "track_vfx",
      name: "视效粒子轨",
      type: "vfx",
      color: "#ff007f",
      blocks: []
    });
    this.tracks.push({
      id: "track_sfx",
      name: "音效配乐轨",
      type: "sfx",
      color: "#1e90ff",
      blocks: []
    });
  }

  public getTrack(trackId: string): TimelineTrack | undefined {
    return this.tracks.find((t) => t.id === trackId);
  }

  public addBlock(trackId: string, block: TimelineBlock): void {
    const track = this.getTrack(trackId);
    if (!track) throw new Error(`Track "${trackId}" not found`);
    track.blocks.push(block);
    track.blocks.sort((a, b) => a.startTimeMs - b.startTimeMs);

    // Update total duration if block extends beyond
    const blockEnd = block.startTimeMs + block.durationMs;
    if (blockEnd > this.durationMs) {
      this.durationMs = blockEnd;
    }
  }

  public moveBlock(trackId: string, blockId: string, newStartTimeMs: number): boolean {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const block = track.blocks.find((b) => b.id === blockId);
    if (!block) return false;

    block.startTimeMs = Math.max(0, newStartTimeMs);
    track.blocks.sort((a, b) => a.startTimeMs - b.startTimeMs);
    return true;
  }

  public removeBlock(trackId: string, blockId: string): boolean {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const idx = track.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return false;

    track.blocks.splice(idx, 1);
    return true;
  }

  public seek(timeMs: number): void {
    this.currentTimeMs = Math.max(0, Math.min(timeMs, this.durationMs));
    if (this.onSeekListener) {
      this.onSeekListener(this.currentTimeMs);
    }
  }

  public onSeek(listener: (timeMs: number) => void): void {
    this.onSeekListener = listener;
  }

  public getCurrentTimeMs(): number {
    return this.currentTimeMs;
  }

  public getDurationMs(): number {
    return this.durationMs;
  }
}
