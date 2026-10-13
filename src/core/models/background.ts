import { z } from "zod";

/**
 * Background layer definition for 2.5D parallax
 */
export const BackgroundLayerSchema = z.object({
  layerId: z.string(),
  name: z.string(),
  assetPath: z.string(),
  depthZ: z.number().default(-100), // Distance along camera Z axis
  parallaxFactor: z.number().default(0.1), // Parallax movement ratio relative to camera
  scrollSpeedX: z.number().default(0), // Continuous looping scroll speed
  scrollSpeedY: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1.0),
  blendMode: z.enum(["normal", "additive", "multiply", "screen"]).default("normal")
});

export type BackgroundLayer = z.infer<typeof BackgroundLayerSchema>;

/**
 * Stage safe layout area
 */
export const StageSafeAreaSchema = z.object({
  baselineY: z.number().default(0),
  minX: z.number().default(-800),
  maxX: z.number().default(800),
  minY: z.number().default(-400),
  maxY: z.number().default(400)
});

export type StageSafeArea = z.infer<typeof StageSafeAreaSchema>;

/**
 * Background asset model schema
 */
export const BackgroundAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tags: z.array(z.string()).default([]),
  environment: z.enum(["sky", "thunder_realm", "sect", "dungeon", "wasteland", "palace", "void"]).default("thunder_realm"),
  layers: z.array(BackgroundLayerSchema).min(1),
  safeArea: StageSafeAreaSchema.default({}),
  ambientColor: z.string().default("#110a24"), // Hex color for scene lighting
  metadata: z.record(z.unknown()).default({})
});

export type BackgroundAsset = z.infer<typeof BackgroundAssetSchema>;
