import { GameCharacter3DConfig } from "./types.js";
import { GameCharacter3D } from "./game-character-3d.js";

/**
 * 3D 游戏级角色精品预设库 (Game-Grade 3D Humanoid Presets)
 */
export const PRESET_HAN_LI_3D: GameCharacter3DConfig = {
  id: "char_han_li_3d",
  name: "韩立",
  gender: "male",
  faceShape: "male_heroic",
  hairStyle: "daoist_topknot",
  outfit: "xianxia_robe",
  weapon: "sword_cyan",
  colors: {
    skinTone: "#ffeedd",
    hairColor: "#18181b",
    primaryCostume: "#059669", // Emerald green
    accentCostume: "#10b981",  // Jade cyan
    weaponGlow: "#00ffaa"
  }
};

export const PRESET_ZI_LING_3D: GameCharacter3DConfig = {
  id: "char_zi_ling_3d",
  name: "紫菱仙子",
  gender: "female",
  faceShape: "female_fairy",
  hairStyle: "celestial_buns",
  outfit: "fairy_silks",
  weapon: "sword_ice",
  colors: {
    skinTone: "#fff0ea",
    hairColor: "#1e1b2e",
    primaryCostume: "#a855f7", // Lavender purple
    accentCostume: "#38bdf8",  // Crystal ice blue
    weaponGlow: "#67e8f9"
  }
};

export const PRESET_LIN_FEI_3D: GameCharacter3DConfig = {
  id: "char_lin_fei_3d",
  name: "林飞",
  gender: "male",
  faceShape: "male_shonen",
  hairStyle: "high_ponytail",
  outfit: "shonen_battlegarb",
  weapon: "sword_flame",
  colors: {
    skinTone: "#ffeedd",
    hairColor: "#18181b",
    primaryCostume: "#dc2626", // Solar crimson red
    accentCostume: "#f59e0b",  // Fiery gold
    weaponGlow: "#f97316"
  }
};

export const PRESET_MAN_SHEN_3D: GameCharacter3DConfig = {
  id: "char_man_shen_3d",
  name: "蛮神裂山",
  gender: "male",
  faceShape: "male_muscular",
  hairStyle: "barbarian_wild",
  outfit: "barbarian_armor",
  weapon: "totem_cleaver",
  colors: {
    skinTone: "#c28859",       // Bronze tanned skin
    hairColor: "#18181b",
    primaryCostume: "#78350f", // Rugged beast leather
    accentCostume: "#d97706",  // Ancient bronze
    weaponGlow: "#f59e0b"
  }
};

export const PRESET_JI_YIN_3D: GameCharacter3DConfig = {
  id: "char_ji_yin_3d",
  name: "极阴祖师",
  gender: "male",
  faceShape: "male_heroic",
  hairStyle: "flowing_long",
  outfit: "xianxia_robe",
  weapon: "none",
  colors: {
    skinTone: "#e2e8f0",       // Pale demonic complexion
    hairColor: "#f1f5f9",      // Flowing pure white hair
    primaryCostume: "#3b0764", // Deep demonic abyss purple
    accentCostume: "#9333ea",  // Demonic violet
    weaponGlow: "#c084fc"
  }
};

export class GameCharacter3DFactory {
  static createFromPreset(preset: GameCharacter3DConfig): GameCharacter3D {
    return new GameCharacter3D(preset);
  }

  static createByCharacterName(name: string): GameCharacter3D {
    if (/紫菱|仙子|寒宫|ziling/i.test(name)) {
      return new GameCharacter3D(PRESET_ZI_LING_3D);
    }
    if (/林飞|少年|赤阳|lin_fei/i.test(name)) {
      return new GameCharacter3D(PRESET_LIN_FEI_3D);
    }
    if (/蛮神|裂山|体修|man_shen/i.test(name)) {
      return new GameCharacter3D(PRESET_MAN_SHEN_3D);
    }
    if (/极阴|祖师|老祖|魔道|evil/i.test(name)) {
      return new GameCharacter3D(PRESET_JI_YIN_3D);
    }
    return new GameCharacter3D(PRESET_HAN_LI_3D);
  }
}
