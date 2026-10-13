import * as THREE from "three";
import { FontRasterizer, type SubtitleStyleType, type RasterizedSubtitle } from "./font-rasterizer.js";
import { StageLayoutEngine } from "../stage/stage-slots.js";
import type { SubtitleCue } from "../../core/models/timeline.js";



export interface SubtitleMeshOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  yRatio?: number; // Position from top (default: 0.82 for bottom subtitle safe area)
  fontSize?: number;
}

/**
 * SubtitleMesh: Three.js Subtitle plane on the top subtitle layer (Z = 300)
 * Synchronously displays calligraphy subtitles timed to audio dialogue cues.
 */
export class SubtitleMesh {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly layout: StageLayoutEngine;
  private readonly fontSize: number;

  private currentText = "";
  private currentStyle: SubtitleStyleType = "calligraphy_gold";
  private activeTexture: THREE.DataTexture | null = null;

  constructor(options: SubtitleMeshOptions = {}) {
    this.layout = new StageLayoutEngine({
      viewportWidth: options.viewportWidth ?? 1080,
      viewportHeight: options.viewportHeight ?? 1920
    });
    this.fontSize = options.fontSize ?? 72;

    const isLandscape = (options.viewportWidth ?? 1080) >= (options.viewportHeight ?? 1920);
    const quadWidth = isLandscape ? 1500 : 1000;
    const quadHeight = isLandscape ? 160 : 180;
    this.geometry = new THREE.PlaneGeometry(quadWidth, quadHeight);

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = "CalligraphySubtitleMesh";
    this.mesh.renderOrder = 40; // On top of VFX

    // Position at subtitle anchor
    const yRatio = options.yRatio ?? (isLandscape ? 0.88 : 0.82);
    const pos = this.layout.getSubtitlePosition(yRatio, 300);
    this.mesh.position.copy(pos);
    this.mesh.visible = false;
  }

  /**
   * Set and render an immediate subtitle cue
   */
  setCue(text: string, style: SubtitleStyleType = "calligraphy_gold", speakerName?: string): void {
    if (!text || text.trim().length === 0) {
      this.clear();
      return;
    }

    if (this.currentText === text && this.currentStyle === style && this.mesh.visible) {
      return; // Already displaying
    }

    this.currentText = text;
    this.currentStyle = style;

    // Dispose old texture to free memory
    if (this.activeTexture) {
      this.activeTexture.dispose();
    }

    const { texture }: RasterizedSubtitle = FontRasterizer.rasterize(text, {
      fontSize: this.fontSize,
      style,
      speakerName
    });

    this.activeTexture = texture;
    this.material.map = texture;
    this.material.needsUpdate = true;
    this.mesh.visible = true;
  }

  /**
   * Clear active subtitle
   */
  clear(): void {
    this.currentText = "";
    this.mesh.visible = false;
  }

  /**
   * Synchronize subtitle display with timeline timestamp
   */
  syncTime(timeMs: number, cues: SubtitleCue[]): void {
    const activeCue = cues.find((c) => timeMs >= c.startTimeMs && timeMs <= c.endTimeMs);

    if (activeCue) {
      this.setCue(activeCue.text, activeCue.style as SubtitleStyleType);
    } else {
      if (this.mesh.visible) {
        this.clear();
      }
    }
  }

  getCurrentText(): string {
    return this.currentText;
  }

  isVisible(): boolean {
    return this.mesh.visible;
  }

  dispose(): void {
    if (this.activeTexture) {
      this.activeTexture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
