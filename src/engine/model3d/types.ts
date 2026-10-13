export type Gender3D = "male" | "female";

export type FaceShape3D =
  | "male_heroic"     // 剑眉星目，立体挺拔下颌，正气凛然
  | "male_shonen"     // 俊朗少年，略收下巴，朝气蓬勃
  | "male_muscular"   // 宽阔刚毅，刀削轮廓，霸道粗犷
  | "female_fairy"    // 绝美鹅蛋脸，清丽脱俗，秀雅精巧
  | "female_maiden";  // 娇俏瓜子脸，灵动俏丽，软萌秀美

export type Emotion3D =
  | "neutral"         // 平和自然
  | "battle"          // 战意坚毅 (剑眉紧压，凝神聚气)
  | "angry"           // 震怒叱咤 (眉头深锁，眉峰倒竖)
  | "happy"           // 舒展从容微笑 (眉目舒展，嘴角微扬)
  | "shocked"         // 震惊骇然 (双目圆睁，瞳孔微缩)
  | "smug"            // 从容自信 (单侧眉峰抬起)
  | "hurt";           // 受击吃痛 (眉心上扬，嘴角压低)

export type Viseme3D = "silence" | "a" | "i" | "u" | "e" | "o" | "m";

export type HairStyle3D =
  | "high_ponytail"   // 少年高马尾 + 3D 红发带
  | "daoist_topknot"  // 成男束发道髻 + 3D 碧玉簪
  | "celestial_buns"  // 仙子流仙垂云双髻 + 3D 紫霞飘带
  | "barbarian_wild"  // 蛮荒狂野棘发 + 兽骨发带
  | "flowing_long";   // 飘逸散发

export type Outfit3D =
  | "xianxia_robe"       // 正道仙侠大氅 (青衣交领，金纹滚边)
  | "shonen_battlegarb"  // 赤阳武道战甲 (朱红战袍，皮质束腰，护腕)
  | "barbarian_armor"    // 蛮荒体修兽铠 (兽皮披肩，青铜兽面腰封，战靴)
  | "fairy_silks";       // 紫霞广袖流仙裙 (流光轻纱，环佩束腰，千层锦裙)

export type Weapon3D =
  | "sword_cyan"      // 青竹蜂云剑 (碧翠灵玉剑刃，金色剑格)
  | "sword_flame"     // 赤阳真火神剑 (烈焰炽纹，赤金剑格)
  | "sword_ice"       // 冰魄神剑 (玄冰晶透，雪花护手)
  | "totem_cleaver"   // 蛮神裂山刀 (巨型黑石战刃，金芒图腾)
  | "none";

export type Pose3D =
  | "idle_stand"      // 待机呼吸微动
  | "combat_ready"    // 执刃临敌架势
  | "sword_flight"    // 御剑凌虚浮空
  | "cast_spell"      // 双手结印施法
  | "slash_strike";   // 挥斩突刺瞬间

export interface GameCharacter3DConfig {
  id: string;
  name: string;
  gender: Gender3D;
  faceShape: FaceShape3D;
  hairStyle: HairStyle3D;
  outfit: Outfit3D;
  weapon: Weapon3D;
  emotion?: Emotion3D;
  viseme?: Viseme3D;
  visemeOpenness?: number;
  pose?: Pose3D;
  facing?: "left" | "right";
  /** Uniform scale applied to the shared humanoid rig. */
  heightScale?: number;
  colors?: {
    skinTone?: string;
    hairColor?: string;
    primaryCostume?: string;
    accentCostume?: string;
    weaponGlow?: string;
  };
}
