import { z } from "zod";

export const ManifestCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  gender: z.enum(["male", "female", "creature", "unknown"]).default("male"),
  role_scope: z.enum(["exclusive", "shared"]).default("exclusive"),
  applicable_dramas: z.array(z.string()).default([]),
  is_pinned: z.boolean().default(false),
  description: z.string().default(""),
  voice_config: z.object({
    provider: z.string().default("edge-tts"),
    voice_id: z.string().default("zh-CN-YunxiNeural"),
    speed: z.number().default(1.0),
    pitch: z.number().default(0.0)
  }).default({}),
  visual_assets: z.object({
    default_scale: z.number().default(1.0),
    anchor_x: z.number().default(0.5),
    anchor_y: z.number().default(1.0),
    expressions: z.record(z.string()).default({})
  }).default({})
});

export type ManifestCharacter = z.infer<typeof ManifestCharacterSchema>;

export const ManifestBackgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()).default([]),
  time_of_day: z.string().default("Day"),
  file_path: z.string(),
  safe_area: z.object({
    min_x: z.number().default(0),
    max_x: z.number().default(1),
    baseline_y: z.number().default(0.8)
  }).default({})
});

export type ManifestBackground = z.infer<typeof ManifestBackgroundSchema>;

export const ManifestBgmSchema = z.object({
  id: z.string(),
  name: z.string(),
  mood: z.string(),
  file_path: z.string(),
  loop_start_ms: z.number().default(0),
  default_volume: z.number().default(1.0)
});

export type ManifestBgm = z.infer<typeof ManifestBgmSchema>;

export const ManifestSfxSchema = z.object({
  id: z.string(),
  sfx_type: z.string(),
  file_path: z.string(),
  default_volume: z.number().default(1.0)
});

export type ManifestSfx = z.infer<typeof ManifestSfxSchema>;

export const AssetManifestSchema = z.object({
  project_id: z.string().default("builtin_pack_default"),
  title: z.string().default("novel2motion assets"),
  version: z.string().default("1.0.0"),
  canvas: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
    fps: z.number().default(30)
  }).default({}),
  audio_ducking: z.object({
    ducking_volume: z.number().default(0.2),
    attack_ms: z.number().default(150),
    release_ms: z.number().default(300),
    crossfade_ms: z.number().default(800)
  }).default({}),
  characters: z.array(ManifestCharacterSchema).default([]),
  backgrounds: z.array(ManifestBackgroundSchema).default([]),
  bgm_library: z.array(ManifestBgmSchema).default([]),
  combat_sfx_library: z.array(ManifestSfxSchema).default([])
});

export type AssetManifest = z.infer<typeof AssetManifestSchema>;
