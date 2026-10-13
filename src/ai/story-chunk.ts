import { z } from "zod";

export const StoryChunkTypeSchema = z.enum(["dialogue", "narration", "combat"]);
export type StoryChunkType = z.infer<typeof StoryChunkTypeSchema>;

export const StoryChunkSchema = z.object({
  id: z.string(),
  type: StoryChunkTypeSchema,
  text: z.string().min(1),
  speakerRaw: z.string().optional(),
  boundSpeakerId: z.string().optional(),
  targetRaw: z.string().optional(),
  boundTargetId: z.string().optional(),
  actionKeywords: z.array(z.string()).default([]),
  suggestedMemeFace: z.enum([
    "normal",
    "shocked",
    "angry",
    "smug",
    "sweat",
    "battle",
    "crying"
  ]).default("normal"),
  suggestedSfx: z.string().optional()
});

export type StoryChunk = z.infer<typeof StoryChunkSchema>;
