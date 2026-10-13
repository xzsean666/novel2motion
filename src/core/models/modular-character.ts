import { z } from "zod";

/**
 * Universal Body Archetype (Body shape & skeletal proportion standard)
 */
export const BodyArchetypeEnum = z.enum([
  "male_adult",      // 成男: 5.8 heads, broad shoulders, upright swordsman posture
  "female_adult",    // 成女: 5.5 heads, elegant curves, flowing sleeves
  "male_youth",      // 少年: 5.0 heads, lean athletic build, energetic
  "female_youth",    // 少女: 4.8 heads, petite graceful silhouette, flowing skirt
  "male_muscular",   // 魁梧力士/体修: 5.2 heads, heavy shoulders, thick chest & limbs
  "male_elder",      // 仙翁长者: 5.2 heads, slightly bowed spine, long beard, wide robe
  "chibi_universal"  // Q版幽默: 2.5 heads, exaggerated cute/comedic proportions
]);

export type BodyArchetype = z.infer<typeof BodyArchetypeEnum>;

/**
 * Facial Art Style
 */
export const FaceStyleEnum = z.enum([
  "xianxia_real",    // 国风仙侠正剧: 立体修长五官、凤眼/剑眉、精致内敛
  "anime_modern",    // 现代二次元动漫: 大眼高光、灵动小嘴、微表情丰富
  "donghua_action",  // 国漫热血硬派: 浓眉鹰目、棱角分明、硬朗战斗张力
  "chibi_comedy"     // Q版沙雕搞笑: 豆豆眼、夸张颜艺、幽默变形
]);

export type FaceStyle = z.infer<typeof FaceStyleEnum>;

/**
 * Speech Viseme (Lip-sync phonemes)
 */
export const VisemeTypeEnum = z.enum([
  "silence",  // 闭口静止
  "a",        // 开放元音 (啊/大/把)
  "i",        // 齿音嘴角后拉 (一/西/力)
  "u",        // 紧缩圆唇 (屋/如/出)
  "e",        // 半开元音 (也/白/得)
  "o",        // 竖向圆唇 (哦/多/波)
  "m"         // 闭唇摩擦 (么/门/闭口音)
]);

export type VisemeType = z.infer<typeof VisemeTypeEnum>;

/**
 * Facial Specification
 */
export const FaceSpecSchema = z.object({
  style: FaceStyleEnum.default("xianxia_real"),
  skinTone: z.string().default("#f6dfd3"),
  shape: z.enum(["oval_sharp", "round_soft", "square_strong", "chibi_round"]).default("oval_sharp"),
  eyes: z.object({
    type: z.enum(["resolute_phoenix", "bright_round", "sharp_hawk", "gentle_almond", "chibi_dot"]).default("resolute_phoenix"),
    irisColor: z.string().default("#1f2430"),
    scleraColor: z.string().default("#ffffff"),
    highlightIntensity: z.number().min(0).max(1).default(0.8)
  }).default({}),
  eyebrows: z.object({
    type: z.enum(["sword_sharp", "willow_leaf", "thick_heroic", "soft_arched"]).default("sword_sharp"),
    color: z.string().default("#161a22")
  }).default({}),
  nose: z.object({
    visible: z.boolean().default(true),
    type: z.enum(["subtle_line", "sharp_bridge", "dot_soft"]).default("subtle_line")
  }).default({}),
  mouth: z.object({
    type: z.enum(["disciplined_neutral", "soft_cherry", "confident_smirk"]).default("disciplined_neutral"),
    lipColor: z.string().default("#c27171"),
    currentViseme: VisemeTypeEnum.default("silence"),
    visemeOpenness: z.number().min(0).max(1).default(0)
  }).default({}),
  expressions: z.object({
    defaultExpression: z.enum(["normal", "angry", "shocked", "smug", "hurt", "battle", "crying"]).default("normal"),
    angerVein: z.boolean().default(false),
    sweatDrop: z.boolean().default(false),
    blush: z.boolean().default(false),
    battleDamageMark: z.boolean().default(false)
  }).default({})
});

export type FaceSpec = z.infer<typeof FaceSpecSchema>;

/**
 * Hair Specification
 */
export const HairSpecSchema = z.object({
  id: z.string().default("daoist_high_bun"),
  name: z.string().default("道家凌云高发髻"),
  baseColor: z.string().default("#141721"),
  highlightColor: z.string().default("#2c3445"),
  frontStyle: z.enum(["bangs_parted", "bangs_full", "flowing_strands", "clean_forehead"]).default("flowing_strands"),
  backStyle: z.enum(["waist_flowing", "high_ponytail", "top_bun_tied", "short_spiky", "twin_tails"]).default("waist_flowing"),
  hasHairpin: z.boolean().default(true),
  hairpinType: z.enum(["jade_pin", "silver_crown", "ribbon_sash", "golden_phoenix"]).default("jade_pin"),
  physicsDynamics: z.object({
    enabled: z.boolean().default(true),
    stiffness: z.number().min(0.1).max(1.0).default(0.65), // Spring stiffness
    flutterAmp: z.number().min(0).max(3.0).default(1.0),   // Wind flutter amplitude
    damping: z.number().min(0.1).max(1.0).default(0.7)
  }).default({})
});

export type HairSpec = z.infer<typeof HairSpecSchema>;

/**
 * Costume Layer Item Specification
 */
export const CostumeLayerItemSchema = z.object({
  assetId: z.string(),
  name: z.string().default(""),
  primaryColor: z.string().default("#1e3a5f"),
  secondaryColor: z.string().default("#e0f2fe"),
  accentColor: z.string().default("#f59e0b"),
  opacity: z.number().min(0).max(1).default(1.0),
  pattern: z.enum(["none", "clouds_auspicious", "dragon_scales", "golden_trim", "ink_bamboo"]).default("clouds_auspicious"),
  physicsEnabled: z.boolean().default(false)
});

export type CostumeLayerItem = z.infer<typeof CostumeLayerItemSchema>;

/**
 * Complete Costume Specification (Multi-layer modular outfit)
 */
export const CostumeSpecSchema = z.object({
  inner: CostumeLayerItemSchema.default({
    assetId: "inner_taoist_white",
    name: "素白内衬交领",
    primaryColor: "#f8fafc",
    secondaryColor: "#e2e8f0"
  }),
  outer: CostumeLayerItemSchema.default({
    assetId: "robe_outer_cyan_cloud",
    name: "苍青行云大袖仙袍",
    primaryColor: "#0f766e",
    secondaryColor: "#2dd4bf",
    accentColor: "#fbbf24",
    pattern: "clouds_auspicious",
    physicsEnabled: true
  }),
  sash: CostumeLayerItemSchema.default({
    assetId: "belt_jade_clasp",
    name: "墨青金缕玉佩腰带",
    primaryColor: "#1e293b",
    secondaryColor: "#34d399",
    accentColor: "#facc15"
  }),
  cloak: CostumeLayerItemSchema.optional(), // 可选飘逸披风/大氅
  bottom: CostumeLayerItemSchema.default({
    assetId: "pants_loose_cloud",
    name: "云纹宽筒下裳",
    primaryColor: "#0f766e",
    secondaryColor: "#134e4a"
  }),
  shoes: CostumeLayerItemSchema.default({
    assetId: "boots_cloud_stepper",
    name: "踏云灵履",
    primaryColor: "#18181b",
    secondaryColor: "#e4e4e7"
  }),
  armor: CostumeLayerItemSchema.optional() // 可选护腕/肩甲/轻铠
});

export type CostumeSpec = z.infer<typeof CostumeSpecSchema>;

/**
 * Socket Attachment (Equipment / Weapons / Props / Artifacts)
 */
export const SocketAttachmentSchema = z.object({
  propId: z.string(),
  name: z.string().default(""),
  propType: z.enum(["weapon_sword", "weapon_blade", "fan", "talisman", "scabbard", "wings", "artifact_wheel", "hairpin", "custom"]),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  rotationZ: z.number().default(0), // Radians
  scale: z.number().default(1.0),
  visible: z.boolean().default(true),
  glowColor: z.string().optional()
});

export type SocketAttachment = z.infer<typeof SocketAttachmentSchema>;

/**
 * Sockets Registry
 */
export const SocketsSpecSchema = z.object({
  hand_r: SocketAttachmentSchema.optional(),   // 主手（持剑/持法宝）
  hand_l: SocketAttachmentSchema.optional(),   // 副手（捏诀/持灵符/盾牌）
  back: SocketAttachmentSchema.optional(),     // 背后（背负剑匣/神兵/功德宝轮/风雷翅）
  head_top: SocketAttachmentSchema.optional(), // 冠冕/法簪
  waist: SocketAttachmentSchema.optional(),    // 腰部（储物袋/通灵玉佩）
  feet: SocketAttachmentSchema.optional(),     // 脚底（御剑踏剑/祥云/煞火）
  aura: z.object({                             // 护体罡气与流光
    enabled: z.boolean().default(true),
    type: z.enum(["cyan_sword_qi", "purple_demonic", "golden_buddha", "crimson_blood", "ice_frost"]).default("cyan_sword_qi"),
    color: z.string().default("#00ffcc"),
    intensity: z.number().min(0).max(3.0).default(1.0)
  }).default({})
});

export type SocketsSpec = z.infer<typeof SocketsSpecSchema>;

/**
 * Global Secondary Physics Dynamics
 */
export const SecondaryDynamicsSpecSchema = z.object({
  windForceX: z.number().default(0),
  windForceY: z.number().default(0),
  gravity: z.number().default(9.8),
  swayFrequency: z.number().default(1.2),
  motionInertia: z.number().min(0).max(2.0).default(1.0)
});

export type SecondaryDynamicsSpec = z.infer<typeof SecondaryDynamicsSpecSchema>;

/**
 * Top-Level Modular Avatar Specification (角色一串 JSON 的核心定义契约)
 */
export const ModularAvatarSpecSchema = z.object({
  schemaVersion: z.literal("2.0").default("2.0"),
  id: z.string().min(1),
  name: z.string().min(1),
  gender: z.enum(["male", "female", "neutral"]).default("male"),
  archetype: BodyArchetypeEnum.default("male_adult"),
  description: z.string().default(""),
  heightScale: z.number().min(0.5).max(1.8).default(1.0),

  face: FaceSpecSchema.default({}),
  hair: HairSpecSchema.default({}),
  costume: CostumeSpecSchema.default({}),
  sockets: SocketsSpecSchema.default({}),
  dynamics: SecondaryDynamicsSpecSchema.default({}),

  voice: z.object({
    voiceId: z.string().default("zh-CN-YunxiNeural"),
    rate: z.number().min(0.5).max(2.0).default(1.0),
    pitch: z.number().min(-50).max(50).default(0)
  }).default({}),

  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({})
});

export type ModularAvatarSpec = z.infer<typeof ModularAvatarSpecSchema>;
