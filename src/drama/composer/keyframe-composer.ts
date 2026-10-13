import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { DramaShot, DramaScript } from "../models/drama-dsl.js";
import { FontRasterizer } from "../../engine/subtitle/font-rasterizer.js";
import { ModularAvatar } from "../../engine/puppet/avatar/modular-avatar.js";
import {
  PRESET_HAN_LI,
  PRESET_ZI_LING,
  PRESET_JI_YIN,
  PRESET_LIN_FEI,
  PRESET_MAN_SHEN,
  PRESET_XIAO_LING_ER,
  PRESET_CHIBI_DAOIST
} from "../../engine/puppet/avatar/preset-avatars.js";
import { AvatarFactory } from "../../engine/puppet/avatar/avatar-factory.js";
import type { ModularAvatarSpec } from "../../core/models/modular-character.js";

export interface KeyframeComposerOptions {
  width: number;
  height: number;
  assetsDir?: string;
}

/**
 * 影视级短剧关键帧分镜合成器 (DramaKeyframeComposer)
 * 彻底解决“画面中人物丢失、空有背景”的严重问题：
 * 1. 严格支持 16:9 横屏影视画幅（1920x1080 / 1280x720）与 9:16 竖屏。
 * 2. 智能上下文背景感知：自动匹配仙巅群峰、九天雷暴、青竹剑境、九幽魔煞或都市长街。
 * 3. 影视级人物站位编排：
 *    - 对白特写（Close-Up）：主角居中偏左威严面向对话方，反派居中偏右对视，微表情精准匹配（怒容/震惊/战意）；
 *    - 双人对峙（Medium Shot）：左右双雄正面对峙，身形气场交锋；
 *    - 打斗出招（Combat）：剑气光弧、九天玄雷闪电特效与受击硬直。
 * 4. 爆款国风大字字幕烧录：马善政毛笔行楷金黄高亮 + 粗黑描边立体投影，底端居中清晰可见。
 */
export class DramaKeyframeComposer {
  private static imageCache = new Map<string, Image>();

  static async composeKeyframe(
    shot: DramaShot,
    script: DramaScript,
    options: KeyframeComposerOptions
  ): Promise<string> {
    const { width, height, assetsDir = "assets" } = options;
    FontRasterizer.ensureFonts();

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. 绘制背景层 (Background Layer)
    await this.renderBackground(ctx, shot, width, height, assetsDir);

    // 2. 绘制角色层 (Character Staging Layer)
    await this.renderCharacters(ctx, shot, script, width, height, assetsDir);

    // 3. 绘制战斗光效与氛围层 (VFX / Atmosphere Layer)
    this.renderAtmosphereVFX(ctx, shot, width, height);

    // 4. 绘制对白字幕层 (Subtitle Layer - 保证 100% 烧录上屏)
    if (shot.dialogue) {
      this.renderSubtitles(ctx, shot.dialogue, width, height);
    }

    // 5. 导出高清 PNG 关键帧文件
    const tempDir = path.resolve(".n2m_cache/keyframes");
    fs.mkdirSync(tempDir, { recursive: true });
    const keyframePath = path.join(tempDir, `kf_${script.dramaId}_${shot.shotId}_${Date.now()}.png`);

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(keyframePath, buffer);

    return keyframePath;
  }

  private static async getOrLoadImage(imgPath: string): Promise<Image | undefined> {
    const fullPath = path.resolve(imgPath);
    if (!fs.existsSync(fullPath)) return undefined;

    const cached = this.imageCache.get(fullPath);
    if (cached) return cached;

    try {
      const img = await loadImage(fullPath);
      this.imageCache.set(fullPath, img);
      return img;
    } catch {
      return undefined;
    }
  }

  private static async renderBackground(
    ctx: SKRSContext2D,
    shot: DramaShot,
    width: number,
    height: number,
    assetsDir: string
  ): Promise<void> {
    const promptText = `${shot.visualPrompt.positiveCn} ${shot.dialogue?.text || ""}`;
    let bgFile = "bg_xianxia_peak.png";

    if (/武馆|擂台|道场|大殿|演武|宗门大比/.test(promptText)) {
      bgFile = "bg_dojo.png";
    } else if (/长街|街|都市|城市|天台|集团/.test(promptText)) {
      bgFile = "bg_street.png";
    } else if (/魔|煞|血海|九幽|幽冥/.test(promptText)) {
      bgFile = "bg_xianxia_abyss.png";
    } else if (/竹|竹林|青竹|蜂云/.test(promptText)) {
      bgFile = "bg_xianxia_bamboo.png";
    } else if (/雷|天劫|玄雷|劫云|雷霆|雷电/.test(promptText)) {
      bgFile = "bg_xianxia_thunder.png";
    }

    let bgPath = path.join(assetsDir, "backgrounds", bgFile);
    if (!fs.existsSync(bgPath)) {
      bgPath = path.join(assetsDir, "backgrounds", "bg_xianxia_peak.png");
    }

    const bgImg = await this.getOrLoadImage(bgPath);
    if (bgImg) {
      // 保持长宽比填充并居中裁剪
      const imgRatio = bgImg.width / bgImg.height;
      const targetRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > targetRatio) {
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      }

      ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
    } else {
      // 电影级暗夜底色
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#080d1a");
      grad.addColorStop(1, "#030508");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private static resolveAvatarSpec(name: string, contextPrompt = ""): ModularAvatarSpec {
    const combined = `${name} ${contextPrompt}`;
    if (/紫菱|仙子|冷月|清月|雪宫|寒宫/.test(combined)) return PRESET_ZI_LING;
    if (/极阴|祖师|魔|煞|反派|冥|老祖/.test(combined)) return PRESET_JI_YIN;
    if (/蛮神|裂山|巨汉|体修|蛮骨/.test(combined)) return PRESET_MAN_SHEN;
    if (/林飞|赤阳|热血|大比|焚决/.test(combined)) return PRESET_LIN_FEI;
    if (/小灵儿|灵儿|小师妹|萌/.test(combined)) return PRESET_XIAO_LING_ER;
    if (/白须|仙翁|沙雕/.test(combined)) return PRESET_CHIBI_DAOIST;
    if (/韩|立|天尊|陆沉|仙尊|正道|剑尊|万剑/.test(combined)) return PRESET_HAN_LI;

    return AvatarFactory.createFromStoryDescription(name || "修士", contextPrompt || "修仙者");
  }

  /**
   * 角色资产与外观映射
   */
  private static resolveCharacterProfile(name: string, contextPrompt = ""): {
    charId: string;
    name: string;
    spriteDir: string;
    auraColor: string;
    mountType: "flying_sword" | "ice_lotus" | "solar_flame" | "demonic_miasma" | "earth_shatter";
    naturalFacing: "left" | "right";
    isAntagonist: boolean;
  } {
    const combined = `${name} ${contextPrompt}`.toLowerCase();
    if (/紫菱|仙子|冷月|清月|雪宫|寒宫|ziling|fairy/.test(combined)) {
      return {
        charId: "char_zi_ling",
        name: "紫菱仙子",
        spriteDir: "characters/ziling_fairy",
        auraColor: "#c084fc",
        mountType: "ice_lotus",
        naturalFacing: "right",
        isAntagonist: false
      };
    }
    if (/极阴|祖师|魔|煞|反派|冥|老祖|evil|demonic/.test(combined)) {
      return {
        charId: "char_ji_yin",
        name: "极阴祖师",
        spriteDir: "characters/evil_lord",
        auraColor: "#9922ff",
        mountType: "demonic_miasma",
        naturalFacing: "right",
        isAntagonist: true
      };
    }
    if (/蛮神|裂山|巨汉|体修|蛮骨|manshen/.test(combined)) {
      return {
        charId: "char_man_shen",
        name: "蛮神裂山",
        spriteDir: "characters/man_shen",
        auraColor: "#d97706",
        mountType: "earth_shatter",
        naturalFacing: "right",
        isAntagonist: true
      };
    }
    if (/林飞|赤阳|热血|大比|焚决|lin_fei|shonen/.test(combined)) {
      return {
        charId: "char_lin_fei",
        name: "林飞",
        spriteDir: "characters/lin_fei",
        auraColor: "#f97316",
        mountType: "solar_flame",
        naturalFacing: "right",
        isAntagonist: false
      };
    }
    if (/李云飞|云飞|战神|hero_m/.test(combined)) {
      return {
        charId: "char_hero_m",
        name: "李云飞",
        spriteDir: "characters/hero_m",
        auraColor: "#38bdf8",
        mountType: "flying_sword",
        naturalFacing: "left",
        isAntagonist: false
      };
    }
    if (/苏清月|清月|hero_f/.test(combined)) {
      return {
        charId: "char_hero_f",
        name: "苏清月",
        spriteDir: "characters/hero_f",
        auraColor: "#c084fc",
        mountType: "ice_lotus",
        naturalFacing: "right",
        isAntagonist: false
      };
    }
    return {
      charId: "char_han_li",
      name: "韩立",
      spriteDir: "characters/han_tianzun",
      auraColor: "#00ffaa",
      mountType: "flying_sword",
      naturalFacing: "left",
      isAntagonist: false
    };
  }

  /**
   * 绘制高保真角色人物形象
   */
  private static async drawCharacterFigure(
    ctx: SKRSContext2D,
    options: {
      charName: string;
      screenX: number;
      groundY: number;
      heightScale: number;
      facing: "left" | "right";
      emotion: string;
      isSpeaking: boolean;
      isCombat: boolean;
      combatType?: string;
      assetsDir: string;
      canvasW: number;
      canvasH: number;
    }
  ): Promise<void> {
    const {
      charName,
      screenX,
      groundY,
      heightScale,
      facing,
      emotion,
      isSpeaking,
      isCombat,
      combatType,
      assetsDir,
      canvasH
    } = options;

    const profile = this.resolveCharacterProfile(charName);

    // 优先尝试加载高精立绘原画
    let spriteImg: Image | undefined;
    const emotionPath = path.join(assetsDir, profile.spriteDir, `${emotion}.png`);
    const normalPath = path.join(assetsDir, profile.spriteDir, "normal.png");

    spriteImg = (await this.getOrLoadImage(emotionPath)) || (await this.getOrLoadImage(normalPath));

    if (spriteImg) {
      const targetH = canvasH * heightScale;
      const targetW = (spriteImg.width / spriteImg.height) * targetH;

      ctx.save();
      ctx.translate(screenX, groundY);

      // 朝向镜像翻转
      const shouldFlip = facing !== profile.naturalFacing;
      if (shouldFlip) {
        ctx.scale(-1, 1);
      }

      // 打斗动态微倾角
      if (isCombat) {
        const tilt = combatType === "struck" ? -0.10 : 0.08;
        ctx.rotate(tilt);
      }

      // 1. 脚底神兵/飞剑/煞火/法环神通特效
      this.renderMountVFX(ctx, profile.mountType, profile.auraColor, targetH);

      // 2. 角色护体神光
      this.drawBodyAura(ctx, profile.auraColor, targetW, targetH, isSpeaking);

      // 3. 战斗冲刺多重极速残影
      if (isCombat && combatType !== "struck") {
        const ghostOffset = 45;
        const ghosts = [
          { dist: 2, alpha: 0.16 },
          { dist: 1, alpha: 0.28 }
        ];
        for (const g of ghosts) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = g.alpha;
          ctx.drawImage(
            spriteImg,
            -targetW / 2 - g.dist * ghostOffset,
            -targetH + 10,
            targetW,
            targetH
          );
          ctx.restore();
        }
      }

      // 4. 高精角色原画本体绘制
      ctx.drawImage(spriteImg, -targetW / 2, -targetH, targetW, targetH);

      // 5. 对白聚光灯 (精准聚焦面部与胸腔五官光彩)
      if (isSpeaking) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const spotGrad = ctx.createRadialGradient(
          0,
          -targetH * 0.78,
          25,
          0,
          -targetH * 0.78,
          targetH * 0.60
        );
        spotGrad.addColorStop(0, "rgba(255, 245, 200, 0.28)");
        spotGrad.addColorStop(0.5, "rgba(255, 230, 160, 0.10)");
        spotGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(0, -targetH * 0.78, targetH * 0.60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. 前景灵光微粒
      this.renderCharacterSparkles(ctx, profile.auraColor, targetW, targetH);

      ctx.restore();
      return;
    }

    // 回退到 ModularAvatar
    const spec = this.resolveAvatarSpec(charName);
    const avatar = new ModularAvatar({
      spec,
      facing,
      initialAction: isCombat ? "slash_strike" : "hover_flight"
    });
    avatar.setExpression(emotion);
    if (isSpeaking) {
      avatar.setSpeechState(true, "a", 0.75);
    }
    avatar.update(1000, 0.016);

    ctx.save();
    ctx.translate(screenX, groundY);
    avatar.render(ctx, heightScale * 1.05);
    ctx.restore();
  }

  private static renderMountVFX(
    ctx: SKRSContext2D,
    mountType: string,
    auraColor: string,
    targetH: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if (mountType === "flying_sword") {
      // 飞剑与青色/冰蓝色剑芒尾焰
      const swordW = targetH * 0.42;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 28;

      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 10, swordW * 0.5, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 10, swordW * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      const jetGrad = ctx.createLinearGradient(0, 10, -swordW * 0.65, 10);
      jetGrad.addColorStop(0, auraColor);
      jetGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
      jetGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(25, 6);
      ctx.lineTo(-swordW * 0.65, -6);
      ctx.lineTo(-swordW * 0.65, 26);
      ctx.closePath();
      ctx.fill();
    } else if (mountType === "ice_lotus") {
      // 唯美仙子冰晶雪莲光环
      const r = targetH * 0.26;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 32;

      const grad = ctx.createRadialGradient(0, 8, 10, 0, 8, r);
      grad.addColorStop(0, "rgba(224, 231, 255, 0.55)");
      grad.addColorStop(0.5, "rgba(168, 85, 247, 0.35)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 8, r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#e0e7ff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (mountType === "solar_flame") {
      // 赤阳少年焚决烈焰光阵
      const r = targetH * 0.28;
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 35;

      const flameGrad = ctx.createRadialGradient(0, 12, 10, 0, 12, r);
      flameGrad.addColorStop(0, "rgba(254, 240, 138, 0.65)");
      flameGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.40)");
      flameGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(0, 12, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (mountType === "demonic_miasma") {
      // 幽冥魔煞紫黑漩涡
      const r = targetH * 0.30;
      ctx.shadowColor = "#9922ff";
      ctx.shadowBlur = 32;

      const demonGrad = ctx.createRadialGradient(0, 5, 12, 0, 5, r);
      demonGrad.addColorStop(0, "rgba(216, 180, 254, 0.55)");
      demonGrad.addColorStop(0.5, "rgba(126, 34, 206, 0.35)");
      demonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = demonGrad;
      ctx.beginPath();
      ctx.ellipse(0, 5, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (mountType === "earth_shatter") {
      // 蛮神体修碎石金煞神纹
      const r = targetH * 0.32;
      ctx.shadowColor = "#d97706";
      ctx.shadowBlur = 30;

      const earthGrad = ctx.createRadialGradient(0, 10, 15, 0, 10, r);
      earthGrad.addColorStop(0, "rgba(251, 191, 36, 0.50)");
      earthGrad.addColorStop(0.6, "rgba(180, 83, 9, 0.30)");
      earthGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.ellipse(0, 10, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  private static drawBodyAura(
    ctx: SKRSContext2D,
    auraColor: string,
    targetW: number,
    targetH: number,
    isSpeaking: boolean
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = isSpeaking ? 36 : 22;
    ctx.strokeStyle = auraColor;
    ctx.globalAlpha = isSpeaking ? 0.45 : 0.28;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -targetH * 0.52, targetW * 0.52, targetH * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private static renderCharacterSparkles(
    ctx: SKRSContext2D,
    auraColor: string,
    targetW: number,
    targetH: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = auraColor;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 12;

    const sparkleCoords = [
      { x: -targetW * 0.35, y: -targetH * 0.75, r: 2.5 },
      { x: targetW * 0.38, y: -targetH * 0.65, r: 2.0 },
      { x: -targetW * 0.22, y: -targetH * 0.35, r: 3.0 },
      { x: targetW * 0.28, y: -targetH * 0.25, r: 2.2 }
    ];

    for (const s of sparkleCoords) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private static async renderCharacters(
    ctx: SKRSContext2D,
    shot: DramaShot,
    script: DramaScript,
    width: number,
    height: number,
    assetsDir: string
  ): Promise<void> {
    const isHorizontal = width >= height; // 16:9 横屏 vs 9:16 竖屏
    const speakerName = shot.dialogue?.speakerName || "";
    const isCombat = Boolean(shot.combatAction);
    const emotion = shot.dialogue?.emotion || (isCombat ? "battle" : "normal");

    // 智能推断全剧登场的核心角色阵容
    const titleCombined = `${script.title} ${script.genre} ${shot.visualPrompt.positiveCn || ""} ${shot.dialogue?.text || ""}`;
    const isSoloFairy = /寒宫|紫菱|仙子|ziling|fairy/i.test(titleCombined);
    const isShonenDojo = /大比|林飞|蛮神|裂山|焚决|shonen|awakening|dojo/i.test(titleCombined);

    let heroName = "韩立";
    let antagonistName = "极阴祖师";

    if (isSoloFairy) {
      heroName = "紫菱仙子";
      antagonistName = "";
    } else if (isShonenDojo) {
      heroName = "林飞";
      antagonistName = "蛮神裂山";
    } else if (script.characters && script.characters.length > 0) {
      const names = script.characters.map((c) => c.name);
      const ant = names.find((n) => /极阴|魔|煞|反派|老祖|蛮神|裂山|仇/.test(n));
      const hero = names.find((n) => n !== ant);
      if (hero) heroName = hero;
      if (ant) antagonistName = ant;
    }

    // 1. 场景 A: 双雄对峙或打斗镜头 (Medium Shot / Combat)
    if (shot.scale === "medium_shot" || isCombat || (!shot.dialogue && shot.scale !== "wide_establishing")) {
      if (isSoloFairy) {
        // 唯美仙子独立破境 (中心大魄力神姿，顶部留白 50px+)
        const charX = width * 0.50;
        const renderScale = isHorizontal ? 0.90 : 0.80;
        const groundY = isHorizontal ? height * 0.94 : height * 0.88;

        await this.drawCharacterFigure(ctx, {
          charName: heroName,
          screenX: charX,
          groundY,
          heightScale: renderScale,
          facing: "right",
          emotion,
          isSpeaking: false,
          isCombat,
          combatType: shot.combatAction?.actionType,
          assetsDir,
          canvasW: width,
          canvasH: height
        });
        return;
      }

      // 双雄对峙 (比例 0.88，脚踏 0.94，头顶留出 65px+ 充裕留白，高马尾与法冠绝不触顶)
      const leftX = isHorizontal ? width * 0.24 : width * 0.25;
      const rightX = isHorizontal ? width * 0.76 : width * 0.75;
      const renderScale = isHorizontal ? 0.88 : 0.76;
      const groundY = isHorizontal ? height * 0.94 : height * 0.88;

      // 左侧正道/主角 (面向右)
      await this.drawCharacterFigure(ctx, {
        charName: heroName,
        screenX: leftX,
        groundY,
        heightScale: renderScale,
        facing: "right",
        emotion: isCombat ? "battle" : "normal",
        isSpeaking: false,
        isCombat,
        combatType: shot.combatAction?.actionType === "blast" ? "blast" : "slash",
        assetsDir,
        canvasW: width,
        canvasH: height
      });

      // 右侧魔道/反派/对手 (面向左)
      await this.drawCharacterFigure(ctx, {
        charName: antagonistName,
        screenX: rightX,
        groundY,
        heightScale: renderScale,
        facing: "left",
        emotion: isCombat ? (shot.combatAction?.actionType === "struck" ? "hurt" : "battle") : "normal",
        isSpeaking: false,
        isCombat,
        combatType: shot.combatAction?.actionType === "struck" ? "struck" : "slash",
        assetsDir,
        canvasW: width,
        canvasH: height
      });
      return;
    }

    // 2. 场景 B: 对白特写镜头 (Close-Up / Medium Close-Up) -> 电影级胸像特写，头顶绝对留白！
    if (shot.scale === "close_up" || shot.scale === "medium_close_up" || shot.dialogue) {
      const isAntagonistSpeaker = Boolean(antagonistName && (speakerName === antagonistName || /极阴|魔|煞|反派|老祖|蛮神|裂山/.test(speakerName)));
      const activeSpeakerName = isAntagonistSpeaker ? antagonistName : (speakerName || heroName);

      const isCloseUp = shot.scale === "close_up";
      const scaleFactor = isCloseUp ? 1.35 : 1.15;
      // 以顶部安全留白为基准反推 groundY，确保高马尾/飘带/发冠在特写下 100% 留出 40~55px 顶空
      const topMargin = isHorizontal ? (isCloseUp ? height * 0.04 : height * 0.05) : height * 0.06;
      const groundY = topMargin + (height * scaleFactor);

      let charX: number;
      let facing: "left" | "right";

      if (isSoloFairy) {
        charX = width * 0.45;
        facing = "right";
      } else if (isAntagonistSpeaker) {
        charX = isHorizontal ? width * 0.68 : width * 0.50;
        facing = "left"; // 反派居右面向左
      } else {
        charX = isHorizontal ? width * 0.32 : width * 0.50;
        facing = "right"; // 主角居左面向右
      }

      await this.drawCharacterFigure(ctx, {
        charName: activeSpeakerName,
        screenX: charX,
        groundY,
        heightScale: scaleFactor,
        facing,
        emotion,
        isSpeaking: true,
        isCombat: false,
        assetsDir,
        canvasW: width,
        canvasH: height
      });
      return;
    }

    // 3. 场景 C: 全景开场 (Full Shot / Wide Establishing)
    const charX = width * 0.50;
    const renderScale = isHorizontal ? 0.80 : 0.68;
    const groundY = isHorizontal ? height * 0.90 : height * 0.84;

    await this.drawCharacterFigure(ctx, {
      charName: heroName,
      screenX: charX,
      groundY,
      heightScale: renderScale,
      facing: "right",
      emotion: "normal",
      isSpeaking: false,
      isCombat: false,
      assetsDir,
      canvasW: width,
      canvasH: height
    });
  }

  private static drawCharacterGlow(
    ctx: SKRSContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static renderAtmosphereVFX(
    ctx: SKRSContext2D,
    shot: DramaShot,
    width: number,
    height: number
  ): void {
    ctx.save();

    // 1. 电影级暗角 (Cinematic Vignette)
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.35,
      width / 2, height / 2, width * 0.75
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // 2. 战斗剑气与闪电光弧 (Combat Slash & Lightning Glow)
    if (shot.combatAction) {
      if (shot.combatAction.actionType === "blast") {
        // 雷霆炸裂白金光
        ctx.strokeStyle = "rgba(255, 240, 180, 0.85)";
        ctx.lineWidth = 14;
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.moveTo(width * 0.2, 0);
        ctx.lineTo(width * 0.45, height * 0.35);
        ctx.lineTo(width * 0.35, height * 0.55);
        ctx.lineTo(width * 0.65, height * 0.85);
        ctx.stroke();
      } else {
        // 青绿/湛蓝飞剑斩击光弧
        ctx.strokeStyle = "rgba(60, 240, 255, 0.9)";
        ctx.lineWidth = 10;
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, width * 0.32, -Math.PI * 0.25, Math.PI * 0.25);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private static renderSubtitles(
    ctx: SKRSContext2D,
    dialogue: NonNullable<DramaShot["dialogue"]>,
    width: number,
    height: number
  ): void {
    const isHorizontal = width >= height;
    const fontSize = isHorizontal ? 46 : 42;
    const speakerFontSize = isHorizontal ? 36 : 34;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const subtitleY = isHorizontal ? height * 0.88 : height * 0.84;

    // 1. 绘制半透明黑色电影级字幕底框 (Cinema Subtitle Backdrop Bar)
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    const barHeight = fontSize * 2.2;
    ctx.fillRect(0, subtitleY - barHeight / 2, width, barHeight);

    // 2. 绘制说话人标识 【韩立】
    const cleanSpeaker = dialogue.speakerName.replace(/(?:说|道|怒喝|冷笑|喝|大喊)+$/, "").trim() || "角色";
    const speakerText = `【${cleanSpeaker}】`;
    ctx.font = `bold ${speakerFontSize}px "MaShanZheng", "PingFang SC", sans-serif`;
    ctx.fillStyle = "#00FFFF"; // 亮青色说话人
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillText(speakerText, width / 2, subtitleY - fontSize * 0.55);

    // 3. 绘制台词文字 (大字黄金渐变 + 纯黑描边)
    const dialogueText = `“${dialogue.text}”`;
    ctx.font = `bold ${fontSize}px "MaShanZheng", "PingFang SC", sans-serif`;

    // 黑色粗描边
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.strokeText(dialogueText, width / 2, subtitleY + fontSize * 0.45);

    // 金黄色字身填充
    ctx.fillStyle = "#FFD700";
    ctx.fillText(dialogueText, width / 2, subtitleY + fontSize * 0.45);

    ctx.restore();
  }
}
