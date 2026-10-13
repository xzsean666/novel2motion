import {
  type ModularAvatarSpec,
  type BodyArchetype,
  ModularAvatarSpecSchema
} from "../../../core/models/modular-character.js";

export type SectAlignment =
  | "righteous_sword"  // 正道剑宗 (青/白/金剑气)
  | "demonic_sect"     // 幽冥魔宗 (黑/紫/血煞)
  | "ice_palace"       // 极寒雪宫 (冰蓝/雪白)
  | "flame_warrior"    // 赤炎武修 (赤红/烈火)
  | "beast_cult"       // 蛮荒体修 (兽甲/金刚)
  | "chibi_comic";     // 搞笑沙雕门

export type CultivationRank =
  | "disciple"         // 初入门弟子
  | "core_master"      // 金丹核心修士
  | "ancestor_elder";   // 元婴/化神老怪

export interface CultivatorRecipeOptions {
  id?: string;
  name: string;
  gender?: "male" | "female";
  sect?: SectAlignment;
  rank?: CultivationRank;
  customDescription?: string;
}

/**
 * Keep generated recipe IDs stable so the same input can be cached and
 * rendered again without changing character identity between runs.
 */
function stableRecipeId(name: string, gender: string, sect: SectAlignment, rank: CultivationRank): string {
  const input = `${name}\u001f${gender}\u001f${sect}\u001f${rank}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `char_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * AvatarFactory:
 * Procedural recipe generator for novel characters and background NPCs.
 * Synthesizes valid ModularAvatarSpec JSON directly from high-level story descriptors.
 */
export class AvatarFactory {
  /**
   * Create a cultivation character JSON specification from high-level recipe parameters
   */
  static createCultivator(options: CultivatorRecipeOptions): ModularAvatarSpec {
    const {
      name,
      gender = "male",
      sect = "righteous_sword",
      rank = "core_master"
    } = options;
    const id = options.id ?? stableRecipeId(name, gender, sect, rank);

    let archetype: BodyArchetype = gender === "male" ? "male_adult" : "female_adult";
    if (rank === "ancestor_elder" && gender === "male") {
      archetype = "male_elder";
    }

    // Default themes
    let outerColor = "#0f766e";
    let accentColor = "#fbbf24";
    let auraColor = "#00ffcc";
    let auraType: "cyan_sword_qi" | "purple_demonic" | "ice_frost" | "crimson_blood" | "golden_buddha" = "cyan_sword_qi";
    let weaponProp = "weapon_bamboo_cloud_sword";

    switch (sect) {
      case "demonic_sect":
        outerColor = "#09090b";
        accentColor = "#a855f7";
        auraColor = "#9333ea";
        auraType = "purple_demonic";
        weaponProp = "talisman_nether_fire";
        break;
      case "ice_palace":
        outerColor = "#1e1b4b";
        accentColor = "#c084fc";
        auraColor = "#38bdf8";
        auraType = "ice_frost";
        weaponProp = "weapon_ice_soul_sword";
        break;
      case "flame_warrior":
        outerColor = "#dc2626";
        accentColor = "#facc15";
        auraColor = "#ef4444";
        auraType = "crimson_blood";
        weaponProp = "weapon_heavy_claymore";
        break;
      case "beast_cult":
        archetype = "male_muscular";
        outerColor = "#292524";
        accentColor = "#d97706";
        auraColor = "#f59e0b";
        auraType = "golden_buddha";
        break;
      case "chibi_comic":
        archetype = "chibi_universal";
        outerColor = "#1e293b";
        accentColor = "#dc2626";
        auraColor = "#facc15";
        auraType = "golden_buddha";
        break;
      default:
        outerColor = rank === "ancestor_elder" ? "#1e293b" : "#0f766e";
        break;
    }

    const spec: ModularAvatarSpec = {
      schemaVersion: "2.0",
      id,
      name,
      gender,
      archetype,
      description: options.customDescription || `${name}，${sect}之${rank}`,
      heightScale: 1.0,

      face: {
        style: sect === "chibi_comic" ? "chibi_comedy" : sect === "demonic_sect" ? "donghua_action" : "xianxia_real",
        skinTone: gender === "female" ? "#fff1f2" : "#f5dfd2",
        shape: archetype === "chibi_universal" ? "chibi_round" : "oval_sharp",
        eyes: {
          type: gender === "female" ? "gentle_almond" : "resolute_phoenix",
          irisColor: auraColor,
          scleraColor: "#ffffff",
          highlightIntensity: 0.85
        },
        eyebrows: {
          type: rank === "ancestor_elder" ? "thick_heroic" : "sword_sharp",
          color: rank === "ancestor_elder" ? "#ffffff" : "#141721"
        },
        nose: { visible: true, type: "sharp_bridge" },
        mouth: {
          type: "disciplined_neutral",
          lipColor: gender === "female" ? "#f43f5e" : "#bd6666",
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
        id: "daoist_bun",
        name: "修真髻",
        baseColor: rank === "ancestor_elder" ? "#ffffff" : "#141721",
        highlightColor: rank === "ancestor_elder" ? "#e2e8f0" : "#2c3445",
        frontStyle: "flowing_strands",
        backStyle: "waist_flowing",
        hasHairpin: true,
        hairpinType: "jade_pin",
        physicsDynamics: { enabled: true, stiffness: 0.65, flutterAmp: 1.2, damping: 0.7 }
      },

      costume: {
        inner: {
          assetId: "inner_standard_white",
          name: "素雅内衬",
          primaryColor: "#f8fafc",
          secondaryColor: "#e2e8f0",
          accentColor: "#f59e0b",
          opacity: 1.0,
          pattern: "none",
          physicsEnabled: false
        },
        outer: {
          assetId: `robe_outer_${sect}`,
          name: "宗门法袍",
          primaryColor: outerColor,
          secondaryColor: accentColor,
          accentColor,
          opacity: 1.0,
          pattern: "clouds_auspicious",
          physicsEnabled: true
        },
        sash: {
          assetId: "sash_sect_belt",
          name: "灵玉系带",
          primaryColor: "#1e293b",
          secondaryColor: "#34d399",
          accentColor: "#facc15",
          opacity: 1.0,
          pattern: "none",
          physicsEnabled: false
        },
        bottom: {
          assetId: "pants_sect_bottom",
          name: "齐云下裳",
          primaryColor: outerColor,
          secondaryColor: "#1e293b",
          accentColor: "#f59e0b",
          opacity: 1.0,
          pattern: "none",
          physicsEnabled: false
        },
        shoes: {
          assetId: "boots_cloud_stepper",
          name: "踏云灵履",
          primaryColor: "#18181b",
          secondaryColor: "#cbd5e1",
          accentColor: "#38bdf8",
          opacity: 1.0,
          pattern: "none",
          physicsEnabled: false
        }
      },

      sockets: {
        hand_r: {
          propId: weaponProp,
          name: "随身灵宝",
          propType: "weapon_sword",
          offsetX: 0,
          offsetY: -10,
          rotationZ: 0,
          scale: 1.0,
          visible: true,
          glowColor: auraColor
        },
        aura: {
          enabled: true,
          type: auraType,
          color: auraColor,
          intensity: rank === "ancestor_elder" ? 1.6 : 1.1
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
        voiceId: gender === "female" ? "zh-CN-XiaoxiaoNeural" : "zh-CN-YunxiNeural",
        rate: 1.0,
        pitch: 0
      },

      tags: [sect, rank, gender],
      metadata: {}
    };

    return ModularAvatarSpecSchema.parse(spec);
  }

  /**
   * Automatically generate avatar JSON from novel text description (NLP heuristic parser)
   */
  static createFromStoryDescription(name: string, description: string): ModularAvatarSpec {
    const d = description.toLowerCase();

    const isFemale = d.includes("女") || d.includes("师妹") || d.includes("仙子") || d.includes("姑娘") || d.includes("夫人");
    const isElder = d.includes("老") || d.includes("长老") || d.includes("祖师") || d.includes("尊者") || d.includes("道长");
    const isMuscular = d.includes("壮汉") || d.includes("魁梧") || d.includes("力士") || d.includes("巨汉");
    const isYouth = d.includes("少年") || d.includes("青年") || d.includes("小厮");

    let sect: SectAlignment = "righteous_sword";
    if (d.includes("魔") || d.includes("煞") || d.includes("冥") || d.includes("骨") || d.includes("血")) {
      sect = "demonic_sect";
    } else if (d.includes("冰") || d.includes("雪") || d.includes("寒") || d.includes("广寒")) {
      sect = "ice_palace";
    } else if (d.includes("火") || d.includes("赤") || d.includes("炎") || d.includes("烈")) {
      sect = "flame_warrior";
    } else if (isMuscular) {
      sect = "beast_cult";
    }

    const rank: CultivationRank = isElder ? "ancestor_elder" : isYouth ? "disciple" : "core_master";

    return this.createCultivator({
      name,
      gender: isFemale ? "female" : "male",
      sect,
      rank,
      customDescription: description
    });
  }
}
