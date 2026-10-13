export type ShakePreset = "light" | "medium" | "heavy";

export interface ShakeConfig {
  amplitude?: number; // Maximum offset in pixels (default: 25)
  durationMs?: number; // Total decay duration in milliseconds (default: 400)
  frequency?: number; // Oscillation frequency in Hz (default: 30)
  decayPower?: number; // Non-linear decay power (default: 2.0)
  rotationFactor?: number; // Max rotation offset in radians (default: 0.035, ~2 degrees)
}

export const SHAKE_PRESETS: Record<ShakePreset, ShakeConfig> = {
  light: {
    amplitude: 12,
    durationMs: 250,
    frequency: 25,
    decayPower: 2.0,
    rotationFactor: 0.015
  },
  medium: {
    amplitude: 28,
    durationMs: 450,
    frequency: 32,
    decayPower: 2.0,
    rotationFactor: 0.035
  },
  heavy: {
    amplitude: 60,
    durationMs: 700,
    frequency: 38,
    decayPower: 2.5,
    rotationFactor: 0.065
  }
};

export interface ShakeOffset {
  offsetX: number;
  offsetY: number;
  offsetRotationZ: number;
}

/**
 * Camera Shake System with trauma accumulation and damped harmonic decay
 */
export class CameraShake {
  private trauma = 0.0; // 0..1
  private currentConfig: ShakeConfig = { ...SHAKE_PRESETS.medium };
  private elapsedTimeMs = 0;
  private seedX = 13.37;
  private seedY = 42.19;
  private seedZ = 99.81;

  /**
   * Trigger a screen shake with preset or custom config
   */
  trigger(presetOrConfig: ShakePreset | ShakeConfig = "medium"): void {
    if (typeof presetOrConfig === "string") {
      this.currentConfig = { ...SHAKE_PRESETS[presetOrConfig] };
    } else {
      this.currentConfig = { ...SHAKE_PRESETS.medium, ...presetOrConfig };
    }

    // Accumulate trauma up to 1.0
    this.trauma = Math.min(1.0, this.trauma + 0.85);
    this.elapsedTimeMs = 0;
  }

  /**
   * Advance shake simulation and compute current offset
   */
  update(deltaTimeMs: number): ShakeOffset {
    if (this.trauma <= 0.001) {
      this.trauma = 0;
      return { offsetX: 0, offsetY: 0, offsetRotationZ: 0 };
    }

    this.elapsedTimeMs += deltaTimeMs;

    const duration = this.currentConfig.durationMs ?? 400;
    const decayRate = duration > 0 ? deltaTimeMs / duration : 1;
    this.trauma = Math.max(0, this.trauma - decayRate);

    const decayPower = this.currentConfig.decayPower ?? 2.0;
    const shakePower = Math.pow(this.trauma, decayPower);

    const freq = this.currentConfig.frequency ?? 30;
    const maxAmp = this.currentConfig.amplitude ?? 28;
    const maxRot = this.currentConfig.rotationFactor ?? 0.035;

    // Harmonic pseudo-random oscillations
    const t = (this.elapsedTimeMs / 1000) * freq * Math.PI * 2;
    const noiseX = Math.sin(t + this.seedX) * Math.cos(t * 0.73 + this.seedX);
    const noiseY = Math.cos(t * 1.13 + this.seedY) * Math.sin(t * 0.53 + this.seedY);
    const noiseZ = Math.sin(t * 0.91 + this.seedZ);

    return {
      offsetX: noiseX * maxAmp * shakePower,
      offsetY: noiseY * maxAmp * shakePower,
      offsetRotationZ: noiseZ * maxRot * shakePower
    };
  }

  /**
   * Check if shake is currently active
   */
  isActive(): boolean {
    return this.trauma > 0.001;
  }

  /**
   * Immediately cancel any active shake
   */
  stop(): void {
    this.trauma = 0;
  }
}
