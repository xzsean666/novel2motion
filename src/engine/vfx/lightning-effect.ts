import * as THREE from "three";

export interface LightningConfig {
  color?: number; // Primary lightning color (default: 0xbb44ff - Celestial Violet)
  branchColor?: number; // Secondary branch color (default: 0xffdd44 - Gold core)
  roughness?: number; // Max displacement deviation (default: 45)
  segments?: number; // Number of subdivisions (default: 16)
  branchProbability?: number; // 0..1 probability of branch (default: 0.45)
}

/**
 * LightningEffect: Nine Heavens Mysterious Thunder (九天玄雷) procedural jagged lightning bolt
 */
export class LightningEffect {
  readonly group: THREE.Group;
  private readonly mainLine: THREE.LineSegments;
  private readonly branchLine: THREE.LineSegments;
  private readonly mainMaterial: THREE.LineBasicMaterial;
  private readonly branchMaterial: THREE.LineBasicMaterial;

  private durationMs = 350;
  private elapsedMs = 0;
  private active = false;
  private currentAlpha = 0;

  constructor(config: LightningConfig = {}) {
    this.group = new THREE.Group();
    this.group.name = "LightningEffect";

    this.mainMaterial = new THREE.LineBasicMaterial({
      color: config.color ?? 0xbb44ff,
      linewidth: 3,
      transparent: true,
      opacity: 0
    });

    this.branchMaterial = new THREE.LineBasicMaterial({
      color: config.branchColor ?? 0xffe066,
      linewidth: 1.5,
      transparent: true,
      opacity: 0
    });

    this.mainLine = new THREE.LineSegments(new THREE.BufferGeometry(), this.mainMaterial);
    this.branchLine = new THREE.LineSegments(new THREE.BufferGeometry(), this.branchMaterial);

    this.group.add(this.mainLine);
    this.group.add(this.branchLine);
    this.group.visible = false;
  }

  /**
   * Strike lightning from start to end with procedural zigzag branches
   */
  strike(
    start: THREE.Vector3,
    end: THREE.Vector3,
    durationMs = 350,
    config: LightningConfig = {}
  ): void {
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.active = true;
    this.group.visible = true;

    const segments = config.segments ?? 16;
    const roughness = config.roughness ?? 50;
    const branchProb = config.branchProbability ?? 0.4;

    const mainPoints: number[] = [];
    const branchPoints: number[] = [];

    // Generate main jagged path using midpoint displacement
    const points: THREE.Vector3[] = [start.clone()];
    const delta = end.clone().sub(start);

    for (let i = 1; i < segments; i++) {
      const frac = i / segments;
      const pt = start.clone().add(delta.clone().multiplyScalar(frac));
      // Add perpendicular displacement
      const dispX = (Math.random() - 0.5) * roughness * 2;
      const dispZ = (Math.random() - 0.5) * roughness * 0.5;
      pt.x += dispX;
      pt.z += dispZ;
      points.push(pt);

      // Random branch
      if (Math.random() < branchProb) {
        const branchLen = 60 + Math.random() * 90;
        const branchAngle = (Math.random() - 0.5) * 1.5;
        const branchEnd = pt.clone().add(new THREE.Vector3(
          Math.sin(branchAngle) * branchLen,
          -Math.cos(branchAngle) * branchLen,
          (Math.random() - 0.5) * 30
        ));
        branchPoints.push(pt.x, pt.y, pt.z, branchEnd.x, branchEnd.y, branchEnd.z);
      }
    }
    points.push(end.clone());

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      mainPoints.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    this.mainLine.geometry.dispose();
    this.mainLine.geometry = new THREE.BufferGeometry();
    this.mainLine.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(mainPoints, 3)
    );

    this.branchLine.geometry.dispose();
    this.branchLine.geometry = new THREE.BufferGeometry();
    this.branchLine.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(branchPoints, 3)
    );

    this.currentAlpha = 1.0;
    this.mainMaterial.opacity = 1.0;
    this.branchMaterial.opacity = 0.9;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Update lightning decay and flicker
   */
  update(deltaTimeMs: number): void {
    if (!this.active) return;

    this.elapsedMs += deltaTimeMs;
    const progress = Math.min(1.0, this.elapsedMs / this.durationMs);

    if (progress >= 1.0) {
      this.active = false;
      this.group.visible = false;
      this.mainMaterial.opacity = 0;
      this.branchMaterial.opacity = 0;
      return;
    }

    // High frequency flickering during strike
    const flicker = Math.random() > 0.3 ? 1.0 : 0.6;
    const decay = 1.0 - Math.pow(progress, 1.5);
    this.currentAlpha = decay * flicker;

    this.mainMaterial.opacity = this.currentAlpha;
    this.branchMaterial.opacity = this.currentAlpha * 0.8;
  }

  dispose(): void {
    this.mainLine.geometry.dispose();
    this.mainMaterial.dispose();
    this.branchLine.geometry.dispose();
    this.branchMaterial.dispose();
  }
}
