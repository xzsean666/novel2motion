import * as THREE from "three";
import { ExpressionTextureManager, type ExpressionType } from "./expression-textures.js";
import type { PuppetCharacter } from "../puppet/puppet-character.js";

export interface MemeFaceOptions {
  width?: number; // Face plane width (default: 95)
  height?: number; // Face plane height (default: 95)
  initialExpression?: ExpressionType | string;
  textureMap?: Partial<Record<ExpressionType | string, THREE.Texture | string>>;
  alphaTest?: number; // Clean edge cutout threshold (default: 0.05)
}

/**
 * MemeFaceMaterial: Dynamic facial expression switcher with seamless edge integration
 * Enables instantaneous switching between Jacky Cheung meme faces, shocked expressions, and regular calm faces.
 */
export class MemeFaceMaterial {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
  readonly geometry: THREE.PlaneGeometry;

  private currentExpression: string;
  private readonly textureMap: Map<string, THREE.Texture | string> = new Map();
  private attachedPuppet: PuppetCharacter | null = null;

  constructor(options: MemeFaceOptions = {}) {
    const width = options.width ?? 95;
    const height = options.height ?? 95;
    this.currentExpression = options.initialExpression ?? "normal";

    this.geometry = new THREE.PlaneGeometry(width, height);
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: options.alphaTest ?? 0.05,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = "MemeFacePlane";
    this.mesh.renderOrder = 25; // Render directly in front of head base

    // Register initial texture map
    if (options.textureMap) {
      for (const [expr, texOrPath] of Object.entries(options.textureMap)) {
        if (texOrPath) {
          this.textureMap.set(expr, texOrPath);
        }
      }
    }

    // Apply initial expression
    this.applyExpression(this.currentExpression);
  }

  /**
   * Register a texture or file path for an expression
   */
  registerExpression(expression: string, textureOrPath: THREE.Texture | string): void {
    this.textureMap.set(expression, textureOrPath);
  }

  getCurrentExpression(): string {
    return this.currentExpression;
  }

  /**
   * Instantly switch expression (0ms latency if preloaded)
   */
  async setExpression(expression: string): Promise<void> {
    this.currentExpression = expression;
    await this.applyExpression(expression);
  }

  /**
   * Synchronously set expression with direct texture
   */
  setTexture(expression: string, texture: THREE.Texture): void {
    this.currentExpression = expression;
    this.material.map = texture;
    this.material.needsUpdate = true;
  }

  private async applyExpression(expression: string): Promise<void> {
    const registered = this.textureMap.get(expression);

    if (registered instanceof THREE.Texture) {
      this.material.map = registered;
      this.material.needsUpdate = true;
      return;
    }

    if (typeof registered === "string") {
      try {
        const tex = await ExpressionTextureManager.loadTextureFromFile(registered);
        this.material.map = tex;
        this.material.needsUpdate = true;
        return;
      } catch (err) {
        // Fallback to procedural if file loading fails
      }
    }

    // Fallback: procedural colored face texture
    const fallbackTex = ExpressionTextureManager.createProceduralFaceTexture(expression);
    this.material.map = fallbackTex;
    this.material.needsUpdate = true;
  }

  /**
   * Mount face mesh directly to a PuppetCharacter's face mount point
   */
  mountToPuppet(puppet: PuppetCharacter): void {
    if (this.attachedPuppet) {
      this.detach();
    }
    this.attachedPuppet = puppet;
    puppet.faceMount.add(this.mesh);
  }

  /**
   * Detach from current puppet
   */
  detach(): void {
    if (this.attachedPuppet) {
      this.attachedPuppet.faceMount.remove(this.mesh);
      this.attachedPuppet = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detach();
    this.geometry.dispose();
    this.material.dispose();
  }
}
