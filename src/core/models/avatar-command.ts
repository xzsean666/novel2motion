import { z } from "zod";

const CommandBaseSchema = z.object({
  id: z.string().min(1),
  at: z.number().nonnegative(),
  duration: z.number().nonnegative().default(0),
  track: z.string().min(1).default("default")
});

export const AvatarMoveToCommandSchema = CommandBaseSchema.extend({
  type: z.literal("moveTo"),
  to: z.object({ x: z.number(), y: z.number().default(0), z: z.number().default(0) }),
  easing: z.enum(["linear", "easeInOut", "easeOutCubic"]).default("easeInOut")
});

export const AvatarLookAtCommandSchema = CommandBaseSchema.extend({
  type: z.literal("lookAt"),
  target: z.string().min(1),
  weight: z.number().min(0).max(1).default(1)
});

export const AvatarPlayCommandSchema = CommandBaseSchema.extend({
  type: z.literal("play"),
  clip: z.string().min(1),
  layer: z.enum(["fullBody", "upperBody", "additive"]).default("fullBody"),
  blendIn: z.number().nonnegative().default(180),
  blendOut: z.number().nonnegative().default(220)
});

export const AvatarSpeakCommandSchema = CommandBaseSchema.extend({
  type: z.literal("speak"),
  audioId: z.string().min(1).optional(),
  text: z.string().optional(),
  visemes: z.string().optional()
});

export const AvatarExpressionCommandSchema = CommandBaseSchema.extend({
  type: z.literal("expression"),
  name: z.enum(["normal", "angry", "battle", "happy", "shocked", "hurt", "smug"]),
  weight: z.number().min(0).max(1).default(1)
});

export const AvatarAttachCommandSchema = CommandBaseSchema.extend({
  type: z.literal("attach"),
  socket: z.enum([
    "socket_head_top", "socket_face", "socket_hand_l", "socket_hand_r",
    "socket_back", "socket_waist_l", "socket_waist_r", "socket_ground"
  ]),
  assetId: z.string().min(1),
  visible: z.boolean().default(true)
});

export const AvatarCommandSchema = z.discriminatedUnion("type", [
  AvatarMoveToCommandSchema,
  AvatarLookAtCommandSchema,
  AvatarPlayCommandSchema,
  AvatarSpeakCommandSchema,
  AvatarExpressionCommandSchema,
  AvatarAttachCommandSchema
]);

export const AvatarCommandTimelineSchema = z.object({
  characterId: z.string().min(1),
  commands: z.array(AvatarCommandSchema).default([])
});

export type AvatarMoveToCommand = z.infer<typeof AvatarMoveToCommandSchema>;
export type AvatarLookAtCommand = z.infer<typeof AvatarLookAtCommandSchema>;
export type AvatarPlayCommand = z.infer<typeof AvatarPlayCommandSchema>;
export type AvatarSpeakCommand = z.infer<typeof AvatarSpeakCommandSchema>;
export type AvatarExpressionCommand = z.infer<typeof AvatarExpressionCommandSchema>;
export type AvatarAttachCommand = z.infer<typeof AvatarAttachCommandSchema>;
export type AvatarCommand = z.infer<typeof AvatarCommandSchema>;
export type AvatarCommandTimeline = z.infer<typeof AvatarCommandTimelineSchema>;
