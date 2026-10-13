export class VideoPlayerModel {
  private videoSrc = "";
  private durationSec = 0;
  private currentTimeSec = 0;
  private renderTimeSec = 0;
  private isPlaying = false;

  constructor(videoSrc = "") {
    this.videoSrc = videoSrc;
  }

  public getSrc(): string {
    return this.videoSrc;
  }

  public getDurationSec(): number {
    return this.durationSec;
  }

  public getCurrentTimeSec(): number {
    return this.currentTimeSec;
  }

  public getRenderTimeSec(): number {
    return this.renderTimeSec;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public loadVideo(src: string, durationSec: number, renderTimeSec = 0): void {
    this.videoSrc = src;
    this.durationSec = durationSec;
    this.renderTimeSec = renderTimeSec;
    this.currentTimeSec = 0;
    this.isPlaying = false;
  }

  public play(): void {
    if (!this.videoSrc) return;
    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
  }

  public seek(sec: number): void {
    this.currentTimeSec = Math.max(0, Math.min(sec, this.durationSec));
  }

  public tick(deltaSec: number): void {
    if (this.isPlaying) {
      this.currentTimeSec += deltaSec;
      if (this.currentTimeSec >= this.durationSec) {
        this.currentTimeSec = 0; // Loop playback
      }
    }
  }

  public getDownloadFilename(): string {
    return `novel2motion_master_${Date.now()}.mp4`;
  }
}
