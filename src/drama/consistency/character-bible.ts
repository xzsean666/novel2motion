import { DramaCharacterProfile } from "../models/drama-dsl.js";

/**
 * 影视短剧角色资产与一致性设定库 (Character Bible)
 * 解决 AI 漫剧/短剧“换一个镜头就换一张脸、衣服细节不一致”的根本痛点。
 */
export class CharacterBible {
  private profiles = new Map<string, DramaCharacterProfile>();

  constructor(initialProfiles: DramaCharacterProfile[] = []) {
    for (const p of initialProfiles) {
      this.register(p);
    }
  }

  register(profile: DramaCharacterProfile): void {
    this.profiles.set(profile.characterId, profile);
  }

  get(characterId: string): DramaCharacterProfile | undefined {
    return this.profiles.get(characterId);
  }

  getAll(): DramaCharacterProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 根据小说中出现的人名或特征自动解析并绑定/注册角色
   */
  resolveOrRegister(name: string, contextSnippet = ""): DramaCharacterProfile {
    // 1. 精确或模糊匹配已有角色
    for (const p of this.profiles.values()) {
      if (p.name === name || name.includes(p.name) || p.name.includes(name)) {
        return p;
      }
    }

    // 2. 启发式构建新角色档案
    const isFemale = /女|少女|师妹|仙子|夫人|总裁|千金|清月/.test(name + contextSnippet);
    const isAntagonist = /魔|煞|邪|逆|老祖|仇|极阴|霸主/.test(name + contextSnippet);

    const generatedId = `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newProfile: DramaCharacterProfile = {
      characterId: generatedId,
      name,
      roleType: isAntagonist ? "antagonist" : "protagonist",
      gender: isFemale ? "female" : "male",
      visualDescription: isFemale
        ? "elegant East Asian woman, long flowing silk dress, delicate features, high ponytail, determined eyes, cinematic dramatic lighting"
        : isAntagonist
        ? "intimidating warlord, dark ornate robes, sharp aggressive gaze, subtle dark aura, cinematic rim lighting"
        : "charismatic young hero, athletic build, modern-traditional fusion clothing, sharp focused eyes, cinematic film grain",
      defaultEmotion: "determined",
      voice: {
        voiceId: isFemale ? "zh-CN-XiaoxiaoNeural" : (isAntagonist ? "zh-CN-YunjianNeural" : "zh-CN-YunxiNeural"),
        rate: 1.0,
        pitch: isAntagonist ? -4 : 0
      }
    };

    this.register(newProfile);
    return newProfile;
  }

  /**
   * 构建分镜头生图提示词时，注入强约束的角色一致性视觉提示词
   */
  enrichVisualPrompt(characterIds: string[], basePrompt: string, stylePreset = "cinematic_anime"): {
    positive: string;
    negative: string;
  } {
    const charDescriptions: string[] = [];
    for (const cid of characterIds) {
      const char = this.get(cid);
      if (char) {
        charDescriptions.push(`(${char.name}: ${char.visualDescription})`);
      }
    }

    const styleKeywords = stylePreset === "cinematic_anime"
      ? "masterpiece, 8k resolution, cinematic lighting, volumetric smoke, photorealistic anime, Makoto Shinkai & Ufotable style, highly detailed textures, depth of field"
      : "cinematic film still, 35mm photography, dramatic rim light, 8k, Unreal Engine 5 render, highly detailed skin texture, dynamic composition";

    const negativeKeywords =
      "low quality, blurry, deformed anatomy, bad hands, missing fingers, extra limbs, cartoon puppet, flat 2d cutout, mutated face, oversaturated, text watermark";

    const enriched = [
      charDescriptions.join(", "),
      basePrompt,
      styleKeywords
    ].filter(Boolean).join(", ");

    return {
      positive: enriched,
      negative: negativeKeywords
    };
  }
}
