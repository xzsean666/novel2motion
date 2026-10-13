import * as THREE from "three";

/**
 * Standard 2.5D Depth Layers and their nominal Z positions
 */
export const STAGE_LAYERS = {
  FAR_SKY: { name: "far_sky", z: -500, renderOrder: 0, description: "Far Sky / Vortex / Distant Storm" },
  MID_GROUND: { name: "mid_ground", z: -250, renderOrder: 10, description: "Floating rocks / Mountains / Fog" },
  ACTORS: { name: "actors", z: 0, renderOrder: 20, description: "Main Characters / Swords / Puppets" },
  VFX: { name: "vfx", z: 150, renderOrder: 30, description: "Sword Qi Trails / Lightning / Sparks" },
  SUBTITLES: { name: "subtitles", z: 300, renderOrder: 40, description: "Calligraphy Subtitles / SFX Stickers" }
} as const;

export type StageLayerName = keyof typeof STAGE_LAYERS;
export type StageLayerKey = (typeof STAGE_LAYERS)[StageLayerName]["name"];

/**
 * Manages 2.5D layered Three.js groups for depth sorting and parallax control
 */
export class StageLayerManager {
  readonly root: THREE.Group;
  private readonly layerGroups: Map<StageLayerKey, THREE.Group> = new Map();

  constructor() {
    this.root = new THREE.Group();
    this.root.name = "StageLayersRoot";
    this.initializeLayers();
  }

  private initializeLayers(): void {
    for (const key of Object.keys(STAGE_LAYERS) as StageLayerName[]) {
      const def = STAGE_LAYERS[key];
      const group = new THREE.Group();
      group.name = `Layer_${def.name}`;
      group.position.z = def.z;
      group.renderOrder = def.renderOrder;
      this.layerGroups.set(def.name, group);
      this.root.add(group);
    }
  }

  /**
   * Get the Three.js Group corresponding to a layer
   */
  getLayer(layerName: StageLayerKey): THREE.Group {
    const group = this.layerGroups.get(layerName);
    if (!group) {
      throw new Error(`StageLayerManager: unknown layer "${layerName}"`);
    }
    return group;
  }

  /**
   * Add an Object3D to a designated layer
   */
  addToLayer(layerName: StageLayerKey, object: THREE.Object3D): void {
    const layer = this.getLayer(layerName);
    layer.add(object);
  }

  /**
   * Remove an Object3D from a designated layer
   */
  removeFromLayer(layerName: StageLayerKey, object: THREE.Object3D): void {
    const layer = this.getLayer(layerName);
    layer.remove(object);
  }

  /**
   * Get nominal Z position for a layer
   */
  getLayerZ(layerName: StageLayerKey): number {
    for (const key of Object.keys(STAGE_LAYERS) as StageLayerName[]) {
      if (STAGE_LAYERS[key].name === layerName) {
        return STAGE_LAYERS[key].z;
      }
    }
    return 0;
  }

  /**
   * Calculate parallax factor given layer depth and camera Z position
   * At Z=0 (Actor plane), parallax factor is 1.0.
   * For layers further away (Z < 0), factor < 1.0 (moves slower when camera pans).
   * For layers closer (Z > 0), factor > 1.0 (moves faster).
   */
  getParallaxFactor(layerName: StageLayerKey, cameraZ: number): number {
    const layerZ = this.getLayerZ(layerName);
    const distanceToCamera = cameraZ - layerZ;
    const actorDistanceToCamera = cameraZ - 0;
    if (actorDistanceToCamera <= 0 || distanceToCamera <= 0) return 1.0;
    return actorDistanceToCamera / distanceToCamera;
  }

  /**
   * Clear all children from a specific layer
   */
  clearLayer(layerName: StageLayerKey): void {
    const layer = this.getLayer(layerName);
    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.remove(child);
      if ("dispose" in child && typeof (child as any).dispose === "function") {
        (child as any).dispose();
      }
    }
  }

  /**
   * Clear all layers
   */
  clearAll(): void {
    for (const key of this.layerGroups.keys()) {
      this.clearLayer(key);
    }
  }
}
