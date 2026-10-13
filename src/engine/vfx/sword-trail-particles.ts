import * as THREE from "three";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number; // Current age in ms
  maxLife: number; // Total lifespan in ms
  r: number;
  g: number;
  b: number;
  size: number;
  active: boolean;
}

export interface SwordTrailConfig {
  maxParticles?: number; // (default: 120)
  particleColor?: number; // Primary spirit green (default: 0x33ffaa)
  trailColor?: number; // Secondary golden hue (default: 0xaaff33)
  particleLifeMs?: number; // Particle lifespan (default: 450)
  particleSize?: number; // Particle point size (default: 8)
}

/**
 * SwordTrailParticles: Azure Bamboo Cloud-Swarm Sword (青竹蜂云剑) spiritual Qi particle stream
 */
export class SwordTrailParticles {
  readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly particles: Particle[] = [];
  private readonly maxParticles: number;
  private readonly baseLifeMs: number;
  private readonly baseSize: number;

  private readonly posArray: Float32Array;
  private readonly colArray: Float32Array;

  constructor(config: SwordTrailConfig = {}) {
    this.maxParticles = config.maxParticles ?? 120;
    this.baseLifeMs = config.particleLifeMs ?? 450;
    this.baseSize = config.particleSize ?? 8;

    this.posArray = new Float32Array(this.maxParticles * 3);
    this.colArray = new Float32Array(this.maxParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.posArray, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colArray, 3));

    this.material = new THREE.PointsMaterial({
      size: this.baseSize,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = "SwordTrailParticles";

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: this.baseLifeMs,
        r: 0.2, g: 1.0, b: 0.65,
        size: this.baseSize,
        active: false
      });
    }
  }

  /**
   * Emit particles from a given world position (e.g. sword tip/edge)
   */
  emit(position: THREE.Vector3, count = 4, direction?: THREE.Vector3): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= count) break;
      if (!p.active) {
        p.active = true;
        p.x = position.x + (Math.random() - 0.5) * 16;
        p.y = position.y + (Math.random() - 0.5) * 16;
        p.z = position.z + (Math.random() - 0.5) * 10;

        const speed = 40 + Math.random() * 80;
        const dir = direction ? direction.clone().normalize() : new THREE.Vector3(-1, 0, 0);
        // Add spread
        p.vx = (dir.x + (Math.random() - 0.5) * 0.6) * speed;
        p.vy = (dir.y + (Math.random() - 0.5) * 0.6) * speed;
        p.vz = (dir.z + (Math.random() - 0.5) * 0.3) * speed;

        p.life = 0;
        p.maxLife = this.baseLifeMs * (0.8 + Math.random() * 0.4);

        // Mix green and golden hues
        if (Math.random() > 0.35) {
          p.r = 0.2; p.g = 1.0; p.b = 0.65; // Spiritual Cyan-Green
        } else {
          p.r = 0.7; p.g = 1.0; p.b = 0.2; // Bamboo Yellow-Green
        }

        spawned++;
      }
    }
  }

  /**
   * Update particle positions, alpha decay, and buffer geometry
   */
  update(deltaTimeMs: number): void {
    const dtSec = deltaTimeMs / 1000;
    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      if (p.active) {
        p.life += deltaTimeMs;
        if (p.life >= p.maxLife) {
          p.active = false;
          this.posArray[i3] = 0;
          this.posArray[i3 + 1] = 0;
          this.posArray[i3 + 2] = -9999;
          continue;
        }

        activeCount++;
        // Apply velocity with drag
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.z += p.vz * dtSec;
        p.vx *= 0.94;
        p.vy *= 0.94;

        this.posArray[i3] = p.x;
        this.posArray[i3 + 1] = p.y;
        this.posArray[i3 + 2] = p.z;

        // Fade color based on remaining life
        const progress = p.life / p.maxLife;
        const alpha = Math.max(0, 1.0 - progress);
        this.colArray[i3] = p.r * alpha;
        this.colArray[i3 + 1] = p.g * alpha;
        this.colArray[i3 + 2] = p.b * alpha;
      } else {
        this.posArray[i3] = 0;
        this.posArray[i3 + 1] = 0;
        this.posArray[i3 + 2] = -9999;
        this.colArray[i3] = 0;
        this.colArray[i3 + 1] = 0;
        this.colArray[i3 + 2] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  getActiveCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
