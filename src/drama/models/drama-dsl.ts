import { z } from "zod";

/**
 * 镜头景别 (Shot Scale)
 */
export type ShotScale =
  | "extreme_close_up" // 大特写 (眼神、手指、法宝细节)
  | "close_up"         // 特写 (面部微表情、情绪对白)
  | "medium_close_up"  // 中近景 (胸部以上、说话交互)
  | "medium_shot"      // 中景 (半身、动作对抗)
  | "full_shot"        // 全景 (全身人物、出场亮相)
  | "wide_establishing"; // 远景/空镜 (宏大环境交代、天地雷暴)

/**
 * 镜头运动 (Camera Movement / Motion Language)
 */
export type CameraMotion =
  | "dolly_in"        // 缓慢推进 (压迫感、聚焦情绪)
  | "dolly_out"       // 缓慢拉远 (悬念、孤寂感、展现全局)
  | "pan_left"        // 向左横移 (环视、扫视)
  | "pan_right"       // 向右横移
  | "tilt_up"         // 仰拍摇上 (仰望强者、威严感)
  | "tilt_down"       // 俯拍摇下 (俯视众生、降临)
  | "whip_pan"        // 快速甩镜 (高燃转场、出招快打)
  | "cinematic_orbit" // 环绕运镜 (高潮蓄力、360度主角光环)
  | "static_intense"; // 静止凝视 (静止带微呼吸感)

/**
 * 转场方式 (Transition Type)
 */
export type DramaTransition =
  | "cut"          // 硬切 (最标准短剧剪辑，节奏紧凑)
  | "fade_black"   // 黑场淡入淡出 (转场、幕间)
  | "flash_white"  // 闪白 (打斗暴击、神通爆炸)
  | "whip_zoom";   // 快速拉冲 (情绪突变、反转瞬间)

/**
 * 角色在短剧人设库中的档案 (Character Bible Entry)
 */
export interface DramaCharacterProfile {
  characterId: string;
  name: string;
  roleType: "protagonist" | "antagonist" | "supporting" | "narrator";
  gender: "male" | "female" | "other";
  visualDescription: string;      // 视觉外貌特征 (英文/中文提示词)
  referenceImagePath?: string;     // 参考图路径 (用于 IP-Adapter / InstantID / ControlNet)
  loraTrigger?: string;            // LoRA 触发词
  defaultEmotion: string;
  voice: {
    voiceId: string;               // Edge-TTS / CosyVoice ID
    rate?: number;
    pitch?: number;
  };
}

/**
 * 单个分镜头定义 (Shot Definition)
 */
export interface DramaShot {
  shotId: string;
  shotIndex: number;
  durationMs: number;              // 推荐 2500ms ~ 5000ms 黄金短剧节奏
  scale: ShotScale;
  cameraMotion: CameraMotion;
  transition: DramaTransition;

  // 画面提示词 (Prompt Engineering)
  visualPrompt: {
    positiveCn: string;            // 中文分镜画面描述
    positiveEn: string;            // 电影级英文提示词 (8k, cinematic lighting, masterpiece...)
    negativeEn: string;            // 负向提示词 (blurry, deformed, cartoon, low quality...)
  };

  // 视频动态生成提示词 (面向可灵/海螺/Wan2.1 的运动物理 prompt)
  videoMotionPrompt: {
    motionCn: string;
    motionEn: string;
    motionSpeed?: number;          // 运动强度 1-10
  };

  // 角色参与
  activeCharacters: string[];      // 登场角色 ID
  focusCharacterId?: string;       // 焦点主角

  // 对白与旁白 (若无则为空镜头/纯动作打斗)
  dialogue?: {
    speakerId: string;
    speakerName: string;
    text: string;
    emotion: "furious" | "smug" | "shocked" | "calm" | "sorrow" | "whisper";
    audioPath?: string;            // 生成的 TTS 音频文件路径
    audioDurationMs?: number;
  };

  // 动作与音效打点
  combatAction?: {
    actionType: "slash" | "blast" | "spell" | "defend" | "struck";
    intensity: "light" | "medium" | "heavy";
    sfxId?: string;
  };

  // 音效与氛围
  sfxTags: string[];
  bgmMood?: "tension" | "climax_battle" | "mysterious" | "epic_reveal" | "melancholy";

  // 渲染产物 (流水线运行时填充)
  keyframeImagePath?: string;
  renderedVideoPath?: string;
}

/**
 * 完整短剧剧本契约 (Drama Script Contract)
 */
export interface DramaScript {
  dramaId: string;
  title: string;
  aspectRatio: "9:16" | "16:9";    // 默认短剧均为 9:16 竖屏 (1080x1920)
  genre: "xianxia" | "urban_reversal" | "mystery" | "ancient_palace" | "general";
  hookType: "climax_start" | "confrontation" | "crisis"; // 黄金3秒钩子模式
  totalEstimatedDurationMs: number;
  characters: DramaCharacterProfile[];
  shots: DramaShot[];
  bgmPath?: string;
  outputVideoPath?: string;
}

export const DramaCharacterProfileSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  roleType: z.enum(["protagonist", "antagonist", "supporting", "narrator"]),
  gender: z.enum(["male", "female", "other"]),
  visualDescription: z.string(),
  referenceImagePath: z.string().optional(),
  loraTrigger: z.string().optional(),
  defaultEmotion: z.string(),
  voice: z.object({
    voiceId: z.string(),
    rate: z.number().optional(),
    pitch: z.number().optional()
  })
});

export const DramaShotSchema = z.object({
  shotId: z.string(),
  shotIndex: z.number(),
  durationMs: z.number(),
  scale: z.enum([
    "extreme_close_up",
    "close_up",
    "medium_close_up",
    "medium_shot",
    "full_shot",
    "wide_establishing"
  ]),
  cameraMotion: z.enum([
    "dolly_in",
    "dolly_out",
    "pan_left",
    "pan_right",
    "tilt_up",
    "tilt_down",
    "whip_pan",
    "cinematic_orbit",
    "static_intense"
  ]),
  transition: z.enum(["cut", "fade_black", "flash_white", "whip_zoom"]),
  visualPrompt: z.object({
    positiveCn: z.string(),
    positiveEn: z.string(),
    negativeEn: z.string()
  }),
  videoMotionPrompt: z.object({
    motionCn: z.string(),
    motionEn: z.string(),
    motionSpeed: z.number().optional()
  }),
  activeCharacters: z.array(z.string()),
  focusCharacterId: z.string().optional(),
  dialogue: z.object({
    speakerId: z.string(),
    speakerName: z.string(),
    text: z.string(),
    emotion: z.enum(["furious", "smug", "shocked", "calm", "sorrow", "whisper"]),
    audioPath: z.string().optional(),
    audioDurationMs: z.number().optional()
  }).optional(),
  combatAction: z.object({
    actionType: z.enum(["slash", "blast", "spell", "defend", "struck"]),
    intensity: z.enum(["light", "medium", "heavy"]),
    sfxId: z.string().optional()
  }).optional(),
  sfxTags: z.array(z.string()),
  bgmMood: z.enum(["tension", "climax_battle", "mysterious", "epic_reveal", "melancholy"]).optional(),
  keyframeImagePath: z.string().optional(),
  renderedVideoPath: z.string().optional()
});

export const DramaScriptSchema = z.object({
  dramaId: z.string(),
  title: z.string(),
  aspectRatio: z.enum(["9:16", "16:9"]),
  genre: z.enum(["xianxia", "urban_reversal", "mystery", "ancient_palace", "general"]),
  hookType: z.enum(["climax_start", "confrontation", "crisis"]),
  totalEstimatedDurationMs: z.number(),
  characters: z.array(DramaCharacterProfileSchema),
  shots: z.array(DramaShotSchema),
  bgmPath: z.string().optional(),
  outputVideoPath: z.string().optional()
});
