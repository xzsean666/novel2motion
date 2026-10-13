export interface IdleMotionConfig {
  enabled?: boolean;
  amplitudeY?: number; // Subtle vertical float in pixels (default: 6)
  periodMs?: number; // Sinusoidal period in ms (default: 3600)
  amplitudeRotationZ?: number; // Subtle roll in radians (default: 0.004)
}

export interface IdleOffset {
  offsetY: number;
  offsetRotationZ: number;
}

/**
 * Idle Breathing Motion generator for organic scene breathing
 */
export class IdleMotion {
  private enabled = true;
  private amplitudeY = 6;
  private periodMs = 3600;
  private amplitudeRotationZ = 0.004;
  private timeMs = 0;

  constructor(config: IdleMotionConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.amplitudeY = config.amplitudeY ?? 6;
    this.periodMs = config.periodMs ?? 3600;
    this.amplitudeRotationZ = config.amplitudeRotationZ ?? 0.004;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  update(deltaTimeMs: number): IdleOffset {
    if (!this.enabled) {
      return { offsetY: 0, offsetRotationZ: 0 };
    }

    this.timeMs += deltaTimeMs;
    const phase = (this.timeMs / this.periodMs) * Math.PI * 2;

    const offsetY = Math.sin(phase) * this.amplitudeY;
    const offsetRotationZ = Math.sin(phase * 0.7 + 0.5) * this.amplitudeRotationZ;

    return { offsetY, offsetRotationZ };
  }

  reset(): void {
    this.timeMs = 0;
  }
}
