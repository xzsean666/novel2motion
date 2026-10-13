import {
  DramaScript,
  DramaShot,
  DramaCharacterProfile,
  ShotScale,
  CameraMotion,
  DramaTransition
} from "../models/drama-dsl.js";
import { CharacterBible } from "../consistency/character-bible.js";

export interface DramaDirectorOptions {
  title?: string;
  genre?: "xianxia" | "urban_reversal" | "mystery" | "ancient_palace" | "general";
  aspectRatio?: "9:16" | "16:9";
  targetShotDurationSec?: number; // 默认 3-4 秒/镜头
  visualStylePreset?: "cinematic_anime" | "cinematic_live_action";
}

/**
 * 工业级短剧多智能体导演与分镜编排引擎 (Drama Director)
 * 遵循现代短剧黄金节奏：
 * 1. 开头 3 秒黄金视觉冲击 (Hook: 危机爆发 / 震撼空镜 / 矛盾冲突顶峰)
 * 2. 镜头语言蒙太奇：景别呼吸感 (全景交代 -> 中景对峙 -> 特写情绪抓人 -> 大特写决断)
 * 3. 动作与运镜适配：推拉摇移、慢动作升格与甩镜
 * 4. 视频生成动态提示词生成：专为可灵 (Kling) / 海螺 (Hailuo) / 通义万相 (Wan2.1) 优化
 */
export class DramaDirector {
  constructor(private characterBible: CharacterBible = new CharacterBible()) {}

  /**
   * 将任意小说章节/剧本文本，编导为具备完整影视分镜的 DramaScript
   */
  direct(rawText: string, options: DramaDirectorOptions = {}): DramaScript {
    const title = options.title ?? "短剧精选分镜";
    const genre = options.genre ?? this.inferGenre(rawText);
    const aspectRatio = options.aspectRatio ?? "16:9";
    const targetShotDurationMs = Math.round((options.targetShotDurationSec ?? 3.5) * 1000);
    const stylePreset = options.visualStylePreset ?? "cinematic_anime";

    // 1. 文本预处理与语义段落切分
    const paragraphs = rawText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      throw new Error("Cannot direct empty novel text");
    }

    const shots: DramaShot[] = [];
    let shotIndex = 0;

    // 2. 镜头 0 (开场黄金 3 秒钩子 Establishing Hook Shot)
    shotIndex++;
    const hookShot = this.createHookShot(shotIndex, genre, paragraphs[0], stylePreset);
    shots.push(hookShot);

    // 3. 逐段解析对白、动作与剧情推进
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];

      // 检测是否包含对白（引号中的内容）
      const dialogueMatches = Array.from(para.matchAll(/[“"「]([^”"」]+)[”"」]/g));

      if (dialogueMatches.length > 0) {
        // 段落中包含角色对白
        for (const match of dialogueMatches) {
          const dialogueText = match[1].trim();
          if (!dialogueText) continue;

          // 提取说话人和说话语境
          const preContext = para.slice(0, match.index);
          const speakerName = this.extractSpeakerName(preContext, para);
          const character = this.characterBible.resolveOrRegister(speakerName, para);

          const emotion = this.detectEmotion(dialogueText, preContext);
          shotIndex++;

          // 为对白分配特写或中近景，突出微表情与戏剧张力
          const scale: ShotScale = emotion === "furious" || emotion === "shocked" ? "close_up" : "medium_close_up";
          const cameraMotion: CameraMotion = emotion === "furious" ? "dolly_in" : "static_intense";

          const enrichedPrompt = this.characterBible.enrichVisualPrompt(
            [character.characterId],
            `${character.name} with ${emotion} expression, talking, cinematic close-up framing, dramatic backlighting`,
            stylePreset
          );

          const motionPrompt = this.generateMotionPrompt(character.name, emotion, "talking", cameraMotion);

          shots.push({
            shotId: `shot_${shotIndex.toString().padStart(3, "0")}`,
            shotIndex,
            durationMs: Math.max(targetShotDurationMs, Math.round(dialogueText.length * 240 + 600)),
            scale,
            cameraMotion,
            transition: "cut",
            visualPrompt: {
              positiveCn: `${character.name} 面露${this.getEmotionCn(emotion)}之色，镜头聚焦其面部微表情并缓缓推近`,
              positiveEn: enrichedPrompt.positive,
              negativeEn: enrichedPrompt.negative
            },
            videoMotionPrompt: {
              motionCn: `${character.name} 嘴唇开合对白，眼神锐利微颤，发丝在微风中轻拂，电影级微表情`,
              motionEn: motionPrompt,
              motionSpeed: emotion === "furious" ? 6 : 4
            },
            activeCharacters: [character.characterId],
            focusCharacterId: character.characterId,
            dialogue: {
              speakerId: character.characterId,
              speakerName: character.name,
              text: dialogueText,
              emotion
            },
            sfxTags: emotion === "shocked" ? ["sfx_shock_sting"] : [],
            bgmMood: emotion === "furious" ? "climax_battle" : "tension"
          });
        }
      } else {
        // 叙述/打斗/场景动作段落
        const isCombat = /斩|剑|雷|轰|拳|杀|掌|爆|破|撞|击|飞/.test(para);
        shotIndex++;

        const scale: ShotScale = isCombat ? "medium_shot" : "full_shot";
        const cameraMotion: CameraMotion = isCombat ? "whip_pan" : "pan_right";
        const transition: DramaTransition = isCombat ? "flash_white" : "cut";

        const combatType = this.detectCombatAction(para);
        const enrichedPrompt = this.characterBible.enrichVisualPrompt(
          [],
          `Dynamic cinematic scene: ${para.slice(0, 60)}, high-speed motion blur, intense particles, epic atmosphere`,
          stylePreset
        );

        shots.push({
          shotId: `shot_${shotIndex.toString().padStart(3, "0")}`,
          shotIndex,
          durationMs: isCombat ? 3000 : 3500,
          scale,
          cameraMotion,
          transition,
          visualPrompt: {
            positiveCn: `电影级动作分镜：${para.slice(0, 50)}`,
            positiveEn: enrichedPrompt.positive,
            negativeEn: enrichedPrompt.negative
          },
          videoMotionPrompt: {
            motionCn: isCombat ? "极速出招碰撞，光芒与冲击波向四周扩散，镜头剧烈震颤" : "镜头横移，展现环境宏大细节与氛围",
            motionEn: isCombat
              ? "Fast combat slash, dynamic energy explosion with particles, dramatic camera whip-pan, cinematic action"
              : "Slow panoramic camera pan, atmospheric wind and mist, cinematic depth of field",
            motionSpeed: isCombat ? 8 : 3
          },
          activeCharacters: [],
          combatAction: isCombat
            ? {
                actionType: combatType,
                intensity: "heavy",
                sfxId: combatType === "blast" ? "sfx_thunder_blast" : "sfx_sword_slash"
              }
            : undefined,
          sfxTags: isCombat ? ["sfx_impact", "sfx_whoosh"] : ["sfx_ambience"],
          bgmMood: isCombat ? "climax_battle" : "tension"
        });
      }
    }

    const totalEstimatedDurationMs = shots.reduce((acc, s) => acc + s.durationMs, 0);

    return {
      dramaId: `drama_${Date.now()}`,
      title,
      aspectRatio,
      genre,
      hookType: "climax_start",
      totalEstimatedDurationMs,
      characters: this.characterBible.getAll(),
      shots
    };
  }

  private inferGenre(text: string): DramaScript["genre"] {
    if (/修仙|飞剑|玄雷|神雷|雷霆|雷电|宗门|道友|本尊|天劫|金丹|师尊|徒儿|丹田/.test(text)) return "xianxia";
    if (/战神|龙王|赘婿|集团|总裁|离婚|百亿/.test(text)) return "urban_reversal";
    if (/悬疑|凶手|密室|案发现场|线索/.test(text)) return "mystery";
    if (/皇上|贵妃|娘娘|东宫|微服/.test(text)) return "ancient_palace";
    return "general";
  }

  private createHookShot(
    shotIndex: number,
    genre: DramaScript["genre"],
    firstPara: string,
    stylePreset: string
  ): DramaShot {
    const isXianxia = genre === "xianxia";
    return {
      shotId: `shot_${shotIndex.toString().padStart(3, "0")}`,
      shotIndex,
      durationMs: 3200,
      scale: "wide_establishing",
      cameraMotion: "dolly_in",
      transition: "fade_black",
      visualPrompt: {
        positiveCn: isXianxia
          ? "云海翻滚，万丈雷暴天穹之上，仙剑悬浮，充满压迫感的开场巨幕"
          : "暴雨倾盆的繁华都市，摩天大楼霓虹闪烁，黑云压城，宿命对决一触即发",
        positiveEn: isXianxia
          ? "Epic wide shot, rolling sea of clouds with apocalyptic golden lightning storm, mystical mountain peaks, towering ancient shrine, 8k, volumetric rays, cinematic masterpiece"
          : "Cinematic establishing wide shot, torrential rain pouring on cyberpunk metropolis, neon reflections on wet asphalt, towering skyscrapers, dark ominous clouds, 8k",
        negativeEn: "low quality, blurry, flat, cartoon, oversaturated, deformed"
      },
      videoMotionPrompt: {
        motionCn: "暴风与雷云剧烈翻滚，闪电在云层中裂变穿梭，镜头自高空极速向下俯冲推进",
        motionEn: "Slow cinematic dolly in through violent thunderclouds, hyper-realistic lightning flashes illuminating misty mountains, epic movie opening",
        motionSpeed: 5
      },
      activeCharacters: [],
      sfxTags: ["sfx_thunder_blast", "sfx_wind_storm"],
      bgmMood: "epic_reveal"
    };
  }

  private extractSpeakerName(preContext: string, fullPara: string): string {
    const knownPattern = /(韩立|极阴祖师|极阴老祖|极阴|紫菱仙子|紫菱|冷月仙子|林飞|蛮神裂山|蛮神|裂山|小灵儿|白须仙翁|李云飞|苏清月|清月|陆沉|林玄|叶天|萧炎|秦羽|楚阳)/;
    const knownMatch = preContext.match(knownPattern) || fullPara.match(knownPattern);
    if (knownMatch) {
      return knownMatch[1];
    }

    const cleaned = preContext.replace(/^(?:第[0-9一二三四五六七八九十]+[章节集幕]\s*)?/, "").trim();
    const speechVerbPattern = /(?:[，。！？\s]|^)([\u4e00-\u9fa5]{2,6}?)(?:冷笑|怒喝|喝道|大喊|说道|道|厉声|咆哮|高呼|长啸|开口|拔出三尺青锋|冷哼|问|说|笑|怒吼)/;
    const speakerMatch = cleaned.match(speechVerbPattern);
    if (speakerMatch && speakerMatch[1]) {
      const stripped = speakerMatch[1].replace(/(?:双手|双臂|飞扬|暴起|重踏地面|地面)+$/, "").trim();
      if (stripped.length >= 2) return stripped;
    }
    return "主角";
  }

  private detectEmotion(dialogue: string, context: string): NonNullable<DramaShot["dialogue"]>["emotion"] {
    const combined = `${context} ${dialogue}`;
    if (/怒|找死|死|杀|放肆|聒噪|混账|纳命来|诛/.test(combined)) return "furious";
    if (/怎么可能|什么！？|骇然|震惊|这不可能|嘶/.test(combined)) return "shocked";
    if (/不过如此|跳梁小丑|可笑|呵|雕虫小技|自寻死路/.test(combined)) return "smug";
    if (/悲|痛|为何|呜呼|泪/.test(combined)) return "sorrow";
    return "calm";
  }

  private getEmotionCn(emotion: string): string {
    switch (emotion) {
      case "furious": return "狂怒威严";
      case "shocked": return "极度震撼";
      case "smug": return "冷酷讥诮";
      case "sorrow": return "悲戚决绝";
      default: return "冷峻沉凝";
    }
  }

  private detectCombatAction(text: string): NonNullable<DramaShot["combatAction"]>["actionType"] {
    if (/雷|电|爆|轰/.test(text)) return "blast";
    if (/剑|斩|劈|刃/.test(text)) return "slash";
    if (/盾|御|挡|防/.test(text)) return "defend";
    if (/吐血|倒飞|击飞|受创/.test(text)) return "struck";
    return "spell";
  }

  private generateMotionPrompt(
    charName: string,
    emotion: string,
    action: string,
    cameraMotion: CameraMotion
  ): string {
    const camStr = cameraMotion === "dolly_in"
      ? "Camera slowly dollying in towards character face"
      : "Camera maintains intense steady close-up with subtle organic handheld motion";

    const faceStr = emotion === "furious"
      ? "furrowed brows, intense blazing glare, subtle lip movement delivering commanding dialogue"
      : emotion === "shocked"
      ? "eyes wide open in disbelief, trembling pupils, subtle gasp"
      : "composed piercing eyes, cold smirk, subtle mouth movement";

    return `${camStr}, ${charName} speaking with ${faceStr}, hair gently fluttering in the wind, cinematic depth of field, photorealistic lighting`;
  }
}
