import { z } from "zod";

/**
 * Character voice configuration schema
 */
export const VoiceConfigSchema = z.object({
  voiceId: z.string().default("zh-CN-YunxiNeural"),
  rate: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(-50).max(50).default(0),
  volume: z.number().min(0).max(1.0).default(1.0)
});

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

/**
 * Meme face asset specification schema
 */
export const MemeFaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  expression: z.enum(["normal", "shocked", "angry", "smug", "sweat", "battle", "crying"]),
  assetPath: z.string(),
  anchorX: z.number().min(0).max(1).default(0.5),
  anchorY: z.number().min(0).max(1).default(0.5),
  scale: z.number().min(0.1).max(3.0).default(1.0)
});

export type MemeFace = z.infer<typeof MemeFaceSchema>;

/**
 * Character visual part/layer schema
 */
export const VisualPartSchema = z.object({
  partId: z.string(),
  partType: z.enum(["body", "head", "weapon", "aura", "cloth", "wings"]),
  assetPath: z.string(),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  offsetZ: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
  zIndex: z.number().int().default(0)
});

export type VisualPart = z.infer<typeof VisualPartSchema>;

/**
 * Character profile definition schema
 */
export const CharacterProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  gender: z.enum(["male", "female", "creature", "unknown"]).default("male"),
  bodyType: z.enum(["adult_swordsman", "adult_cultivator", "elder", "beast", "custom"]).default("adult_swordsman"),
  headProportion: z.number().min(3.0).max(8.0).default(5.5), // 5.5 heads tall (realistic adult proportion)
  description: z.string().default(""),
  roleScope: z.enum(["exclusive", "shared"]).default("exclusive"), // Exclusive to specific drama or shared across all dramas
  applicableDramas: z.array(z.string()).default([]), // Empty means universal / all dramas
  voiceConfig: VoiceConfigSchema.default({}),
  defaultMemeFaceId: z.string().default("normal"),
  memeFaces: z.array(MemeFaceSchema).default([]),
  parts: z.array(VisualPartSchema).default([]),
  metadata: z.record(z.unknown()).default({})
});

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;
