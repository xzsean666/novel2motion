import { z } from "zod";

/**
 * Keyframe interpolation easing
 */
export const EasingTypeSchema = z.enum([
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "spring",
  "instant"
]);

export type EasingType = z.infer<typeof EasingTypeSchema>;

/**
 * 3D/2.5D Transform Keyframe
 */
export const TransformKeyframeSchema = z.object({
  timeMs: z.number().min(0),
  x: z.number(),
  y: z.number(),
  z: z.number().default(0),
  rotationZ: z.number().default(0), // Radians or degrees
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
  opacity: z.number().min(0).max(1).default(1),
  easing: EasingTypeSchema.default("easeInOut")
});

export type TransformKeyframe = z.infer<typeof TransformKeyframeSchema>;

/**
 * Face expression keyframe
 */
export const FaceKeyframeSchema = z.object({
  timeMs: z.number().min(0),
  faceId: z.string(),
  transition: z.enum(["cut", "crossfade"]).default("cut")
});

export type FaceKeyframe = z.infer<typeof FaceKeyframeSchema>;

/**
 * Character multi-track animation
 */
export const CharacterTrackSchema = z.object({
  characterId: z.string(),
  transformKeyframes: z.array(TransformKeyframeSchema).min(1),
  faceKeyframes: z.array(FaceKeyframeSchema).default([]),
  limbKeyframes: z.record(z.array(TransformKeyframeSchema)).default({})
});

export type CharacterTrack = z.infer<typeof CharacterTrackSchema>;

/**
 * Camera 3D motion keyframe
 */
export const CameraKeyframeSchema = z.object({
  timeMs: z.number().min(0),
  posX: z.number().default(0),
  posY: z.number().default(0),
  posZ: z.number().default(1000),
  lookAtX: z.number().default(0),
  lookAtY: z.number().default(0),
  zoom: z.number().default(1.0),
  shakeIntensity: z.number().default(0),
  easing: EasingTypeSchema.default("easeInOut")
});

export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;

/**
 * Subtitle Cue with word/clause level timestamps
 */
export const SubtitleCueSchema = z.object({
  startTimeMs: z.number().min(0),
  endTimeMs: z.number().positive(),
  speakerId: z.string().optional(),
  text: z.string().min(1),
  style: z.enum(["calligraphy_gold", "shout_red", "narration_white"]).optional().default("calligraphy_gold"),
  fontSize: z.number().optional().default(64),
  positionY: z.number().optional().default(1500) // Near bottom of 1080x1920 canvas

});

export type SubtitleCue = z.infer<typeof SubtitleCueSchema>;

/**
 * Audio Cue (Voice, SFX, BGM change)
 */
export const AudioCueSchema = z.object({
  cueId: z.string(),
  type: z.enum(["voice", "sfx", "bgm"]),
  startTimeMs: z.number().min(0),
  durationMs: z.number().positive(),
  audioPath: z.string(),
  volume: z.number().min(0).max(1.0).default(1.0),
  duckBgm: z.boolean().default(false), // Trigger -14dB BGM ducking during this window
  duckFactor: z.number().min(0).max(1.0).default(0.2)
});

export type AudioCue = z.infer<typeof AudioCueSchema>;
export type AudioCueInput = z.input<typeof AudioCueSchema>;

/**
 * Visual Effect Cue (Lightning, Slash, Shockwave)
 */
export const VfxCueSchema = z.object({
  vfxId: z.string(),
  vfxType: z.enum(["lightning_strike", "sword_flight", "hit_flash", "particle_cloud"]),
  startTimeMs: z.number().min(0),
  durationMs: z.number().positive(),
  originX: z.number().default(0),
  originY: z.number().default(0),
  targetX: z.number().optional(),
  targetY: z.number().optional(),
  intensity: z.number().default(1.0)
});

export type VfxCue = z.infer<typeof VfxCueSchema>;

/**
 * Fully compiled scene timeline
 */
export const CompiledSceneTimelineSchema = z.object({
  sceneId: z.string(),
  backgroundId: z.string(),
  totalDurationMs: z.number().positive(),
  fps: z.number().int().default(30),
  characterTracks: z.array(CharacterTrackSchema).default([]),
  cameraKeyframes: z.array(CameraKeyframeSchema).default([]),
  subtitleCues: z.array(SubtitleCueSchema).default([]),
  audioCues: z.array(AudioCueSchema).default([]),
  vfxCues: z.array(VfxCueSchema).default([])
});

export type CompiledSceneTimeline = z.infer<typeof CompiledSceneTimelineSchema>;
