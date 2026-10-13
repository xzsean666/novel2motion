import type { ModularAvatarSpec } from "../../../core/models/modular-character.js";

/**
 * 1. 韩立 (Han Li) - 成男修仙剑尊
 */
export const PRESET_HAN_LI: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_han_li",
  name: "韩立",
  gender: "male",
  archetype: "male_adult",
  description: "青竹蜂云剑主，心性坚毅沉稳，一袭青袍御剑九霄",
  heightScale: 1.0,

  face: {
    style: "xianxia_real",
    skinTone: "#f5dfd2",
    shape: "oval_sharp",
    eyes: {
      type: "resolute_phoenix",
      irisColor: "#1a1f2c",
      scleraColor: "#ffffff",
      highlightIntensity: 0.85
    },
    eyebrows: {
      type: "sword_sharp",
      color: "#12141a"
    },
    nose: {
      visible: true,
      type: "sharp_bridge"
    },
    mouth: {
      type: "disciplined_neutral",
      lipColor: "#bd6666",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "normal",
      angerVein: false,
      sweatDrop: false,
      blush: false,
      battleDamageMark: false
    }
  },

  hair: {
    id: "daoist_high_bun",
    name: "道家凌云高发髻",
    baseColor: "#121318",
    highlightColor: "#2c3445",
    frontStyle: "flowing_strands",
    backStyle: "waist_flowing",
    hasHairpin: true,
    hairpinType: "jade_pin",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.65,
      flutterAmp: 1.2,
      damping: 0.7
    }
  },

  costume: {
    inner: {
      assetId: "inner_taoist_white",
      name: "素白内衬交领",
      primaryColor: "#f8fafc",
      secondaryColor: "#e2e8f0",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_outer_cyan_cloud",
      name: "苍青行云大袖仙袍",
      primaryColor: "#0f766e",
      secondaryColor: "#2dd4bf",
      accentColor: "#fbbf24",
      opacity: 1.0,
      pattern: "clouds_auspicious",
      physicsEnabled: true
    },
    sash: {
      assetId: "belt_jade_clasp",
      name: "墨青金缕玉佩腰带",
      primaryColor: "#1e293b",
      secondaryColor: "#34d399",
      accentColor: "#facc15",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    cloak: {
      assetId: "cloak_wind_strider",
      name: "御风青羽大氅",
      primaryColor: "#134e4a",
      secondaryColor: "#042f2e",
      accentColor: "#5eead4",
      opacity: 0.95,
      pattern: "none",
      physicsEnabled: true
    },
    bottom: {
      assetId: "pants_loose_cloud",
      name: "云纹宽筒下裳",
      primaryColor: "#0f766e",
      secondaryColor: "#134e4a",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    shoes: {
      assetId: "boots_cloud_stepper",
      name: "踏云灵履",
      primaryColor: "#18181b",
      secondaryColor: "#e4e4e7",
      accentColor: "#38bdf8",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "weapon_bamboo_cloud_sword",
      name: "青竹蜂云剑",
      propType: "weapon_sword",
      offsetX: 0,
      offsetY: -10,
      rotationZ: 0,
      scale: 1.0,
      visible: true,
      glowColor: "#00ffcc"
    },
    back: {
      propId: "scabbard_verdant_pine",
      name: "青松古木剑匣",
      propType: "scabbard",
      offsetX: 0,
      offsetY: 20,
      rotationZ: 0.35,
      scale: 1.0,
      visible: true
    },
    head_top: {
      propId: "crown_jade_hairpin",
      name: "青灵玉发冠",
      propType: "hairpin",
      offsetX: 0,
      offsetY: 0,
      rotationZ: 0,
      scale: 1.0,
      visible: true
    },
    aura: {
      enabled: true,
      type: "cyan_sword_qi",
      color: "#00ffcc",
      intensity: 1.2
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 1.2,
    motionInertia: 1.0
  },

  voice: {
    voiceId: "zh-CN-YunxiNeural",
    rate: 1.0,
    pitch: 0
  },

  tags: ["xianxia", "protagonist", "swordsman", "calm"],
  metadata: {}
};

/**
 * 2. 紫菱仙子 (Zi Ling) - 成女倾城仙子
 */
export const PRESET_ZI_LING: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_zi_ling",
  name: "紫菱仙子",
  gender: "female",
  archetype: "female_adult",
  description: "天南第一绝色，冰肌玉骨，清冷若姑射仙子",
  heightScale: 0.96,

  face: {
    style: "anime_modern",
    skinTone: "#fff1f2",
    shape: "oval_sharp",
    eyes: {
      type: "gentle_almond",
      irisColor: "#818cf8",
      scleraColor: "#ffffff",
      highlightIntensity: 0.95
    },
    eyebrows: {
      type: "willow_leaf",
      color: "#312e81"
    },
    nose: {
      visible: true,
      type: "subtle_line"
    },
    mouth: {
      type: "soft_cherry",
      lipColor: "#f43f5e",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "normal",
      angerVein: false,
      sweatDrop: false,
      blush: false,
      battleDamageMark: false
    }
  },

  hair: {
    id: "fairy_flowing_twin_ribbon",
    name: "广寒飞仙髻",
    baseColor: "#1e1b4b",
    highlightColor: "#6366f1",
    frontStyle: "bangs_parted",
    backStyle: "waist_flowing",
    hasHairpin: true,
    hairpinType: "golden_phoenix",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.55,
      flutterAmp: 1.4,
      damping: 0.65
    }
  },

  costume: {
    inner: {
      assetId: "inner_silk_pale_purple",
      name: "淡紫流光轻绡内衬",
      primaryColor: "#faf5ff",
      secondaryColor: "#f3e8ff",
      accentColor: "#c084fc",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_outer_purple_cloud",
      name: "流云紫霓羽衣",
      primaryColor: "#7e22ce",
      secondaryColor: "#c084fc",
      accentColor: "#fef08a",
      opacity: 0.92,
      pattern: "clouds_auspicious",
      physicsEnabled: true
    },
    sash: {
      assetId: "sash_silk_ribbon",
      name: "七宝琉璃飘带",
      primaryColor: "#581c87",
      secondaryColor: "#a855f7",
      accentColor: "#fbbf24",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    cloak: {
      assetId: "cloak_moonlight_veil",
      name: "月华轻纱披肩",
      primaryColor: "#3b0764",
      secondaryColor: "#6b21a8",
      accentColor: "#e9d5ff",
      opacity: 0.85,
      pattern: "none",
      physicsEnabled: true
    },
    bottom: {
      assetId: "skirt_feather_layers",
      name: "百褶烟萝下裳",
      primaryColor: "#6b21a8",
      secondaryColor: "#581c87",
      accentColor: "#d8b4fe",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    shoes: {
      assetId: "shoes_lotus_embroidered",
      name: "踏月莲步灵靴",
      primaryColor: "#faf5ff",
      secondaryColor: "#c084fc",
      accentColor: "#e879f9",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "weapon_ice_soul_sword",
      name: "冰魄神剑",
      propType: "weapon_sword",
      offsetX: 0,
      offsetY: -10,
      rotationZ: 0,
      scale: 0.95,
      visible: true,
      glowColor: "#38bdf8"
    },
    head_top: {
      propId: "phoenix_gold_hairpin",
      name: "九凤朝阳金钗",
      propType: "hairpin",
      offsetX: 0,
      offsetY: 0,
      rotationZ: 0,
      scale: 1.0,
      visible: true
    },
    aura: {
      enabled: true,
      type: "ice_frost",
      color: "#818cf8",
      intensity: 1.15
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 1.4,
    motionInertia: 0.9
  },

  voice: {
    voiceId: "zh-CN-XiaoxiaoNeural",
    rate: 1.05,
    pitch: 5
  },

  tags: ["xianxia", "fairy", "heroine", "elegant"],
  metadata: {}
};

/**
 * 3. 极阴祖师 (Ji Yin) - 魔道老祖长者
 */
export const PRESET_JI_YIN: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_ji_yin",
  name: "极阴祖师",
  gender: "male",
  archetype: "male_elder",
  description: "乱星海魔道枭雄，煞气漫天，行事狠辣诡谲",
  heightScale: 1.02,

  face: {
    style: "donghua_action",
    skinTone: "#e2e8f0",
    shape: "square_strong",
    eyes: {
      type: "sharp_hawk",
      irisColor: "#9333ea",
      scleraColor: "#f1f5f9",
      highlightIntensity: 0.4
    },
    eyebrows: {
      type: "thick_heroic",
      color: "#ffffff" // 白发白眉
    },
    nose: {
      visible: true,
      type: "sharp_bridge"
    },
    mouth: {
      type: "confident_smirk",
      lipColor: "#475569",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "smug",
      angerVein: false,
      sweatDrop: false,
      blush: false,
      battleDamageMark: false
    }
  },

  hair: {
    id: "elder_wild_white_hair",
    name: "乱发苍髯白浪",
    baseColor: "#f8fafc",
    highlightColor: "#cbd5e1",
    frontStyle: "clean_forehead",
    backStyle: "waist_flowing",
    hasHairpin: false,
    hairpinType: "silver_crown",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.7,
      flutterAmp: 1.5,
      damping: 0.75
    }
  },

  costume: {
    inner: {
      assetId: "inner_demonic_black",
      name: "玄冥内衬",
      primaryColor: "#020617",
      secondaryColor: "#1e1b4b",
      accentColor: "#9333ea",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_outer_shadow_gold",
      name: "幽冥玄阴黑金重袍",
      primaryColor: "#09090b",
      secondaryColor: "#18181b",
      accentColor: "#a855f7",
      opacity: 1.0,
      pattern: "dragon_scales",
      physicsEnabled: true
    },
    sash: {
      assetId: "belt_bone_clasp",
      name: "白骨玄煞法带",
      primaryColor: "#18181b",
      secondaryColor: "#71717a",
      accentColor: "#a855f7",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    cloak: {
      assetId: "cloak_nether_smoke",
      name: "九幽天煞大氅",
      primaryColor: "#030712",
      secondaryColor: "#581c87",
      accentColor: "#c084fc",
      opacity: 0.95,
      pattern: "none",
      physicsEnabled: true
    },
    bottom: {
      assetId: "pants_demonic_black",
      name: "黑煞玄武下裳",
      primaryColor: "#09090b",
      secondaryColor: "#020617",
      accentColor: "#7c3aed",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    shoes: {
      assetId: "boots_demonic_iron",
      name: "踏魄冥铁战靴",
      primaryColor: "#09090b",
      secondaryColor: "#71717a",
      accentColor: "#a855f7",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "talisman_nether_fire",
      name: "玄阴魔火符印",
      propType: "talisman",
      offsetX: 0,
      offsetY: -5,
      rotationZ: 0,
      scale: 1.1,
      visible: true,
      glowColor: "#a855f7"
    },
    aura: {
      enabled: true,
      type: "purple_demonic",
      color: "#9333ea",
      intensity: 1.5
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 1.3,
    motionInertia: 1.1
  },

  voice: {
    voiceId: "zh-CN-YunjianNeural",
    rate: 0.95,
    pitch: -15
  },

  tags: ["xianxia", "villain", "demon_lord", "elder"],
  metadata: {}
};

/**
 * 4. 林飞 (Lin Fei) - 少年热血剑修
 */
export const PRESET_LIN_FEI: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_lin_fei",
  name: "林飞",
  gender: "male",
  archetype: "male_youth",
  description: "天元宗外门热血少年，朝气蓬勃，重剑无锋",
  heightScale: 0.95,

  face: {
    style: "anime_modern",
    skinTone: "#fde68a",
    shape: "round_soft",
    eyes: {
      type: "bright_round",
      irisColor: "#dc2626",
      scleraColor: "#ffffff",
      highlightIntensity: 0.9
    },
    eyebrows: {
      type: "thick_heroic",
      color: "#1c1917"
    },
    nose: {
      visible: true,
      type: "dot_soft"
    },
    mouth: {
      type: "confident_smirk",
      lipColor: "#e11d48",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "battle",
      angerVein: false,
      sweatDrop: false,
      blush: false,
      battleDamageMark: false
    }
  },

  hair: {
    id: "spiky_youth_ponytail",
    name: "烈火凌风高马尾",
    baseColor: "#18181b",
    highlightColor: "#ef4444",
    frontStyle: "bangs_full",
    backStyle: "high_ponytail",
    hasHairpin: false,
    hairpinType: "ribbon_sash",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.7,
      flutterAmp: 1.3,
      damping: 0.7
    }
  },

  costume: {
    inner: {
      assetId: "inner_tight_black",
      name: "紧身玄色武道内衬",
      primaryColor: "#18181b",
      secondaryColor: "#27272a",
      accentColor: "#ef4444",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_outer_red_flame",
      name: "赤焰劲装战袍",
      primaryColor: "#dc2626",
      secondaryColor: "#f87171",
      accentColor: "#facc15",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    sash: {
      assetId: "belt_red_leather",
      name: "赤红熟铜护腰",
      primaryColor: "#7f1d1d",
      secondaryColor: "#f59e0b",
      accentColor: "#fbbf24",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    bottom: {
      assetId: "pants_martial_arts",
      name: "收腿战道裤",
      primaryColor: "#18181b",
      secondaryColor: "#27272a",
      accentColor: "#ef4444",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    shoes: {
      assetId: "boots_swift_wind",
      name: "疾风熟牛皮轻靴",
      primaryColor: "#27272a",
      secondaryColor: "#52525b",
      accentColor: "#dc2626",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "weapon_heavy_claymore",
      name: "真武玄铁重剑",
      propType: "weapon_sword",
      offsetX: 0,
      offsetY: -10,
      rotationZ: 0,
      scale: 1.15,
      visible: true,
      glowColor: "#ef4444"
    },
    aura: {
      enabled: true,
      type: "crimson_blood",
      color: "#ef4444",
      intensity: 1.1
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 1.5,
    motionInertia: 1.0
  },

  voice: {
    voiceId: "zh-CN-YunxiNeural",
    rate: 1.1,
    pitch: 10
  },

  tags: ["xianxia", "youth", "passionate", "shonen"],
  metadata: {}
};

/**
 * 5. 蛮神裂山 (Man Shen) - 魁梧体修力士
 */
export const PRESET_MAN_SHEN: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_man_shen",
  name: "蛮神裂山",
  gender: "male",
  archetype: "male_muscular",
  description: "上古荒古巨力体修，不动如山，一拳裂苍穹",
  heightScale: 1.08,

  face: {
    style: "donghua_action",
    skinTone: "#d97706",
    shape: "square_strong",
    eyes: {
      type: "sharp_hawk",
      irisColor: "#78350f",
      scleraColor: "#ffffff",
      highlightIntensity: 0.5
    },
    eyebrows: {
      type: "thick_heroic",
      color: "#451a03"
    },
    nose: {
      visible: true,
      type: "sharp_bridge"
    },
    mouth: {
      type: "disciplined_neutral",
      lipColor: "#92400e",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "battle",
      angerVein: true,
      sweatDrop: false,
      blush: false,
      battleDamageMark: true
    }
  },

  hair: {
    id: "short_brute_spiky",
    name: "荒古狂煞短鬃",
    baseColor: "#1c1917",
    highlightColor: "#78350f",
    frontStyle: "clean_forehead",
    backStyle: "short_spiky",
    hasHairpin: false,
    hairpinType: "silver_crown",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.9,
      flutterAmp: 0.6,
      damping: 0.85
    }
  },

  costume: {
    inner: {
      assetId: "inner_heavy_leather",
      name: "莽荒龙鳞底甲",
      primaryColor: "#451a03",
      secondaryColor: "#78350f",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "dragon_scales",
      physicsEnabled: false
    },
    outer: {
      assetId: "armor_heavy_titan",
      name: "荒古泰坦玄甲",
      primaryColor: "#292524",
      secondaryColor: "#44403c",
      accentColor: "#d97706",
      opacity: 1.0,
      pattern: "dragon_scales",
      physicsEnabled: false
    },
    sash: {
      assetId: "belt_titan_beast",
      name: "兽首锁蛮腰铠",
      primaryColor: "#78350f",
      secondaryColor: "#f59e0b",
      accentColor: "#d97706",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    bottom: {
      assetId: "pants_iron_guards",
      name: "重铸玄铁战甲裙",
      primaryColor: "#292524",
      secondaryColor: "#1c1917",
      accentColor: "#d97706",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    shoes: {
      assetId: "boots_earth_shaker",
      name: "震岳裂地钢靴",
      primaryColor: "#1c1917",
      secondaryColor: "#44403c",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    aura: {
      enabled: true,
      type: "golden_buddha",
      color: "#d97706",
      intensity: 1.6
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 12.0,
    swayFrequency: 0.8,
    motionInertia: 1.6
  },

  voice: {
    voiceId: "zh-CN-YunzeNeural",
    rate: 0.9,
    pitch: -25
  },

  tags: ["xianxia", "muscular", "brute", "tank"],
  metadata: {}
};

/**
 * 6. 小灵儿 (Xiao Ling'er) - 娇俏灵动少女
 */
export const PRESET_XIAO_LING_ER: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_xiao_ling_er",
  name: "小灵儿",
  gender: "female",
  archetype: "female_youth",
  description: "古灵精怪的小师妹，清脆悦耳，身法轻盈如蝶",
  heightScale: 0.92,

  face: {
    style: "anime_modern",
    skinTone: "#fdf2f8",
    shape: "round_soft",
    eyes: {
      type: "bright_round",
      irisColor: "#ec4899",
      scleraColor: "#ffffff",
      highlightIntensity: 0.98
    },
    eyebrows: {
      type: "willow_leaf",
      color: "#831843"
    },
    nose: {
      visible: true,
      type: "dot_soft"
    },
    mouth: {
      type: "soft_cherry",
      lipColor: "#fb7185",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "smug",
      angerVein: false,
      sweatDrop: false,
      blush: true,
      battleDamageMark: false
    }
  },

  hair: {
    id: "twin_buns_youth_girly",
    name: "灵蝶双丫仙髻",
    baseColor: "#3b0764",
    highlightColor: "#f472b6",
    frontStyle: "bangs_full",
    backStyle: "twin_tails",
    hasHairpin: true,
    hairpinType: "ribbon_sash",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.5,
      flutterAmp: 1.6,
      damping: 0.6
    }
  },

  costume: {
    inner: {
      assetId: "inner_pink_blossom",
      name: "桃花粉素轻衫",
      primaryColor: "#fdf2f8",
      secondaryColor: "#fce7f3",
      accentColor: "#f472b6",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_outer_butterfly_pink",
      name: "彩蝶流仙灵裙",
      primaryColor: "#db2777",
      secondaryColor: "#f472b6",
      accentColor: "#fde047",
      opacity: 0.95,
      pattern: "clouds_auspicious",
      physicsEnabled: true
    },
    sash: {
      assetId: "belt_bell_ribbon",
      name: "银铃随风飘带",
      primaryColor: "#9d174d",
      secondaryColor: "#f472b6",
      accentColor: "#fde047",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    bottom: {
      assetId: "skirt_short_fluffy",
      name: "灵雀齐膝流光短裙",
      primaryColor: "#be185d",
      secondaryColor: "#9d174d",
      accentColor: "#fbcfe8",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    shoes: {
      assetId: "shoes_fairy_bells",
      name: "丁香风铃软锦绣履",
      primaryColor: "#fdf2f8",
      secondaryColor: "#f472b6",
      accentColor: "#fde047",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "fan_butterfly_spring",
      name: "流云七宝灵扇",
      propType: "fan",
      offsetX: 0,
      offsetY: -8,
      rotationZ: 0,
      scale: 0.9,
      visible: true
    },
    aura: {
      enabled: true,
      type: "ice_frost",
      color: "#ec4899",
      intensity: 0.9
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 1.6,
    motionInertia: 0.8
  },

  voice: {
    voiceId: "zh-CN-XiaoxiaoNeural",
    rate: 1.15,
    pitch: 15
  },

  tags: ["xianxia", "girl", "cute", "cheerful"],
  metadata: {}
};

/**
 * 7. 沙雕白须仙翁 (Meme Chibi Daoist) - Q版沙雕风
 */
export const PRESET_CHIBI_DAOIST: ModularAvatarSpec = {
  schemaVersion: "2.0",
  id: "char_chibi_daoist",
  name: "沙雕白须仙翁",
  gender: "male",
  archetype: "chibi_universal",
  description: "爱看热闹的沙雕掌门，豆豆眼白胡子，表情极其魔性",
  heightScale: 0.85,

  face: {
    style: "chibi_comedy",
    skinTone: "#fef08a",
    shape: "chibi_round",
    eyes: {
      type: "chibi_dot",
      irisColor: "#0f172a",
      scleraColor: "#ffffff",
      highlightIntensity: 0.2
    },
    eyebrows: {
      type: "thick_heroic",
      color: "#ffffff"
    },
    nose: {
      visible: false,
      type: "dot_soft"
    },
    mouth: {
      type: "confident_smirk",
      lipColor: "#dc2626",
      currentViseme: "silence",
      visemeOpenness: 0
    },
    expressions: {
      defaultExpression: "shocked",
      angerVein: false,
      sweatDrop: true,
      blush: false,
      battleDamageMark: false
    }
  },

  hair: {
    id: "chibi_white_bun_beard",
    name: "Q版鹤发仙翁髻",
    baseColor: "#f8fafc",
    highlightColor: "#e2e8f0",
    frontStyle: "clean_forehead",
    backStyle: "top_bun_tied",
    hasHairpin: true,
    hairpinType: "silver_crown",
    physicsDynamics: {
      enabled: true,
      stiffness: 0.6,
      flutterAmp: 1.5,
      damping: 0.7
    }
  },

  costume: {
    inner: {
      assetId: "inner_chibi_yellow",
      name: "鹅黄内衬",
      primaryColor: "#fef08a",
      secondaryColor: "#fef9c3",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    outer: {
      assetId: "robe_chibi_taoist",
      name: "Q版太极阴阳道袍",
      primaryColor: "#1e293b",
      secondaryColor: "#475569",
      accentColor: "#facc15",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: true
    },
    sash: {
      assetId: "belt_chibi_sash",
      name: "宽板红锦带",
      primaryColor: "#dc2626",
      secondaryColor: "#f87171",
      accentColor: "#fef08a",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    bottom: {
      assetId: "pants_chibi_puffy",
      name: "圆滚滚灯笼裤",
      primaryColor: "#1e293b",
      secondaryColor: "#0f172a",
      accentColor: "#f59e0b",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    },
    shoes: {
      assetId: "shoes_chibi_round",
      name: "圆头老汉布鞋",
      primaryColor: "#0f172a",
      secondaryColor: "#ffffff",
      accentColor: "#dc2626",
      opacity: 1.0,
      pattern: "none",
      physicsEnabled: false
    }
  },

  sockets: {
    hand_r: {
      propId: "fan_duster_whisk",
      name: "太乙拂尘",
      propType: "fan",
      offsetX: 0,
      offsetY: -5,
      rotationZ: 0,
      scale: 0.8,
      visible: true
    },
    aura: {
      enabled: true,
      type: "golden_buddha",
      color: "#facc15",
      intensity: 1.3
    }
  },

  dynamics: {
    windForceX: 0,
    windForceY: 0,
    gravity: 9.8,
    swayFrequency: 2.0,
    motionInertia: 0.7
  },

  voice: {
    voiceId: "zh-CN-YunxiNeural",
    rate: 1.25,
    pitch: 20
  },

  tags: ["chibi", "comedy", "meme", "elder"],
  metadata: {}
};

/**
 * All Preset Avatars Catalog
 */
export const PRESET_AVATARS: Record<string, ModularAvatarSpec> = {
  char_han_li: PRESET_HAN_LI,
  char_zi_ling: PRESET_ZI_LING,
  char_ji_yin: PRESET_JI_YIN,
  char_lin_fei: PRESET_LIN_FEI,
  char_man_shen: PRESET_MAN_SHEN,
  char_xiao_ling_er: PRESET_XIAO_LING_ER,
  char_chibi_daoist: PRESET_CHIBI_DAOIST
};
