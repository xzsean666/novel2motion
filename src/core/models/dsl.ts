import { z } from "zod";

/**
 * Stage slots for 5-position character placement
 */
export const StageSlotEnum = z.enum([
  "far_left",
  "mid_left",
  "center",
  "mid_right",
  "far_right"
]);

export type StageSlot = z.infer<typeof StageSlotEnum>;

/**
 * Character initial staging in a scene
 */
export const CharacterStagingSchema = z.object({
  characterId: z.string(),
  slot: StageSlotEnum.default("center"),
  customX: z.number().optional(),
  customY: z.number().optional(),
  scale: z.number().default(1.0),
  facing: z.enum(["left", "right"]).default("right"),
  initialMemeFace: z.string().default("normal"),
  floatAnimation: z.boolean().default(true) // Idle flying sword floating
});

export type CharacterStaging = z.infer<typeof CharacterStagingSchema>;

/**
 * Dialogue Event
 */
export const DialogueEventSchema = z.object({
  type: z.literal("dialogue"),
  speakerId: z.string(),
  text: z.string().min(1),
  memeFace: z.string().default("normal"),
  subtitleStyle: z.enum(["calligraphy_gold", "shout_red", "narration_white"]).default("calligraphy_gold"),
  audioUrl: z.string().optional(),
  durationMs: z.number().positive().optional()
});

export type DialogueEvent = z.infer<typeof DialogueEventSchema>;

/**
 * Attack / Skill Event
 */
export const AttackEventSchema = z.object({
  type: z.literal("attack"),
  attackerId: z.string(),
  targetId: z.string().optional(),
  skillName: z.string().default("flying_sword"),
  skillType: z.enum([
    "thunder_strike",
    "sword_barrage",
    "palm_strike",
    "dash_slash",
    "shield_barrier"
  ]),
  vfxIntensity: z.number().min(0.1).max(3.0).default(1.0),
  durationMs: z.number().positive().default(1200)
});

export type AttackEvent = z.infer<typeof AttackEventSchema>;

/**
 * Hit / Damage Reaction Event
 */
export const HitReactionEventSchema = z.object({
  type: z.literal("hit"),
  characterId: z.string(),
  reaction: z.enum(["shake", "knockback", "white_flash", "fly_away"]).default("white_flash"),
  shockFace: z.string().default("shocked"),
  durationMs: z.number().positive().default(800)
});

export type HitReactionEvent = z.infer<typeof HitReactionEventSchema>;

/**
 * Camera Motion Event
 */
export const CameraMotionEventSchema = z.object({
  type: z.literal("camera"),
  motion: z.enum(["pan", "zoom_in", "zoom_out", "shake", "reset"]),
  targetSlot: StageSlotEnum.optional(),
  targetCharacterId: z.string().optional(),
  zoomFactor: z.number().min(0.5).max(3.0).default(1.0),
  shakeIntensity: z.number().min(0).max(20).default(5),
  durationMs: z.number().positive().default(1000)
});

export type CameraMotionEvent = z.infer<typeof CameraMotionEventSchema>;

/**
 * Audio / Sound Effect Event
 */
export const SfxEventSchema = z.object({
  type: z.literal("sfx"),
  soundId: z.string(),
  volume: z.number().min(0).max(1.0).default(1.0),
  delayMs: z.number().min(0).default(0)
});

export type SfxEvent = z.infer<typeof SfxEventSchema>;

/**
 * Narration Event
 */
export const NarrationEventSchema = z.object({
  type: z.literal("narration"),
  text: z.string().min(1),
  audioUrl: z.string().optional(),
  durationMs: z.number().positive().optional()
});

export type NarrationEvent = z.infer<typeof NarrationEventSchema>;

/**
 * Union of all scene timeline events
 */
export const TimelineEventSchema = z.discriminatedUnion("type", [
  DialogueEventSchema,
  AttackEventSchema,
  HitReactionEventSchema,
  CameraMotionEventSchema,
  SfxEventSchema,
  NarrationEventSchema
]);

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Scene Plan
 */
export const ScenePlanSchema = z.object({
  sceneId: z.string().min(1),
  title: z.string().default(""),
  backgroundId: z.string(),
  bgmId: z.string().default("bgm_xianxia_battle"),
  bgmVolume: z.number().min(0).max(1.0).default(0.4),
  initialStaging: z.array(CharacterStagingSchema).min(1),
  events: z.array(TimelineEventSchema).min(1),
  durationMs: z.number().positive().optional()
});

export type ScenePlan = z.infer<typeof ScenePlanSchema>;

/**
 * Complete Story / Project Animation Plan
 */
export const StoryPlanSchema = z.object({
  storyId: z.string().min(1),
  title: z.string().default("Untitled Novel Motion"),
  characters: z.array(z.string()).default([]), // Character IDs involved
  scenes: z.array(ScenePlanSchema).min(1),
  totalDurationMs: z.number().positive().optional(),
  metadata: z.record(z.unknown()).default({})
});

export type StoryPlan = z.infer<typeof StoryPlanSchema>;
