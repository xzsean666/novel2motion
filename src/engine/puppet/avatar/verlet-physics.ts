export interface VerletPoint {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
  mass: number;
}

export interface DistanceConstraint {
  p1: VerletPoint;
  p2: VerletPoint;
  length: number;
  stiffness: number; // 0..1
}

export interface VerletChainOptions {
  nodeCount: number;
  segmentLength: number;
  drag?: number;         // Air friction (0..1, e.g. 0.05)
  gravity?: number;      // Downward pull (e.g. 200)
  constraintIterations?: number; // Solver steps (e.g. 3)
}

/**
 * VerletChain:
 * High-stability, multi-node Verlet integration string for secondary cloth & hair dynamics.
 * Simulates flowing hair, cloaks, and fluttering sleeves with natural physics curves.
 */
export class VerletChain {
  readonly points: VerletPoint[] = [];
  readonly constraints: DistanceConstraint[] = [];
  readonly drag: number;
  readonly gravity: number;
  readonly constraintIterations: number;

  constructor(options: VerletChainOptions) {
    const { nodeCount, segmentLength, drag = 0.04, gravity = 250, constraintIterations = 3 } = options;
    this.drag = drag;
    this.gravity = gravity;
    this.constraintIterations = constraintIterations;

    for (let i = 0; i < nodeCount; i++) {
      const y = i * segmentLength;
      this.points.push({
        x: 0,
        y,
        oldX: 0,
        oldY: y,
        pinned: i === 0, // Root node is pinned by default
        mass: 1.0 + i * 0.15
      });
    }

    for (let i = 0; i < nodeCount - 1; i++) {
      this.constraints.push({
        p1: this.points[i],
        p2: this.points[i + 1],
        length: segmentLength,
        stiffness: 0.95
      });
    }
  }

  private initialized = false;

  /**
   * Set root pinned anchor position (connected to skeleton bone)
   */
  setPin(x: number, y: number, index = 0): void {
    if (this.points[index]) {
      const dx = x - this.points[index].x;
      const dy = y - this.points[index].y;

      if (!this.initialized && index === 0) {
        this.initialized = true;
        for (const p of this.points) {
          p.x += dx;
          p.y += dy;
          p.oldX += dx;
          p.oldY += dy;
        }
      } else {
        this.points[index].x = x;
        this.points[index].y = y;
        this.points[index].oldX = x;
        this.points[index].oldY = y;
      }
      this.points[index].pinned = true;
    }
  }

  /**
   * Step the Verlet physics simulation forward
   */
  step(dtSec: number, windX = 0, windY = 0): void {
    const dt = Math.min(0.033, Math.max(0.001, dtSec));
    const dt2 = dt * dt;

    // 1. Verlet Integration step
    for (const p of this.points) {
      if (p.pinned) continue;

      const vx = (p.x - p.oldX) * (1.0 - this.drag);
      const vy = (p.y - p.oldY) * (1.0 - this.drag);

      p.oldX = p.x;
      p.oldY = p.y;

      // Add forces: Gravity + Wind
      const ax = (windX / p.mass);
      const ay = (this.gravity + windY) / p.mass;

      p.x += vx + ax * dt2;
      p.y += vy + ay * dt2;
    }

    // 2. Satisfy distance constraints
    for (let it = 0; it < this.constraintIterations; it++) {
      for (const c of this.constraints) {
        const dx = c.p2.x - c.p1.x;
        const dy = c.p2.y - c.p1.y;
        const dist = Math.hypot(dx, dy) || 1e-4;
        const diff = (dist - c.length) / dist;

        const offsetX = dx * 0.5 * diff * c.stiffness;
        const offsetY = dy * 0.5 * diff * c.stiffness;

        if (!c.p1.pinned) {
          c.p1.x += offsetX;
          c.p1.y += offsetY;
        }
        if (!c.p2.pinned) {
          c.p2.x -= offsetX;
          c.p2.y -= offsetY;
        }
      }
    }
  }

  /**
   * Get points array for drawing smooth Bezier cloth/hair curves
   */
  getCurvePoints(): { x: number; y: number }[] {
    return this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}
