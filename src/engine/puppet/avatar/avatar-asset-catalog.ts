import type { SKRSContext2D } from "@napi-rs/canvas";
import type { ArchetypeProportions } from "./universal-skeleton.js";

export type AssetCategory =
  | "outer"
  | "inner"
  | "sash"
  | "cloak"
  | "bottom"
  | "shoes"
  | "hair_front"
  | "hair_back"
  | "prop"
  | "headwear";

export interface PartPalette {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  opacity?: number;
}

export interface PartRenderProps {
  proportions: ArchetypeProportions;
  palette: PartPalette;
  timeMs: number;
  physicsOffset?: number;
  facing: "left" | "right";
}

export interface PartDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  tags: string[];
  render: (ctx: SKRSContext2D, props: PartRenderProps) => void;
}

/**
 * AvatarAssetCatalog:
 * Central decoupled asset component registry for modular clothing, hairstyles, and props.
 * Enables zero-touch hot-swapping and endless library extensions.
 */
export class AvatarAssetCatalog {
  private static readonly catalog = new Map<string, PartDefinition>();

  static {
    this.registerBuiltinParts();
  }

  static getKey(category: AssetCategory, id: string): string {
    return `${category}:${id}`;
  }

  static register(part: PartDefinition): void {
    const key = this.getKey(part.category, part.id);
    this.catalog.set(key, part);
    // Also index by ID directly for convenience
    this.catalog.set(part.id, part);
  }

  static get(category: AssetCategory, id: string): PartDefinition | undefined {
    return this.catalog.get(this.getKey(category, id)) || this.catalog.get(id);
  }

  static has(category: AssetCategory, id: string): boolean {
    return this.catalog.has(this.getKey(category, id)) || this.catalog.has(id);
  }

  static listByCategory(category: AssetCategory): PartDefinition[] {
    const res: PartDefinition[] = [];
    const prefix = `${category}:`;
    for (const [k, v] of this.catalog.entries()) {
      if (k.startsWith(prefix)) res.push(v);
    }
    return res;
  }

  static listAll(): PartDefinition[] {
    const set = new Set<PartDefinition>(this.catalog.values());
    return Array.from(set);
  }

  // ---------------------------------------------------------------------------
  // Builtin Asset Components Library
  // ---------------------------------------------------------------------------
  private static registerBuiltinParts(): void {
    // 1. Outer Robe: 苍青行云大袖仙袍 (Daoist Cyan Cloud Robe)
    this.register({
      id: "robe_outer_cyan_cloud",
      name: "苍青行云大袖仙袍",
      category: "outer",
      tags: ["xianxia", "daoist", "cyan"],
      render: (ctx, { proportions: p, palette }) => {
        ctx.fillStyle = palette.primaryColor || "#0f766e";
        ctx.strokeStyle = palette.secondaryColor || "#2dd4bf";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(-p.shoulderWidth * 0.48, p.chestLength * 0.45);
        ctx.lineTo(-p.shoulderWidth * 0.35, -p.chestLength * 0.5);
        ctx.lineTo(p.shoulderWidth * 0.35, -p.chestLength * 0.5);
        ctx.lineTo(p.shoulderWidth * 0.48, p.chestLength * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Auspicious cloud embroidery
        ctx.strokeStyle = palette.accentColor || "#fbbf24";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-p.shoulderWidth * 0.45, p.chestLength * 0.45);
        ctx.lineTo(0, -p.chestLength * 0.25);
        ctx.lineTo(p.shoulderWidth * 0.2, -p.chestLength * 0.5);
        ctx.stroke();
      }
    });

    // 2. Outer Robe: 幽冥玄阴黑金重袍 (Demonic Shadow Gold Robe)
    this.register({
      id: "robe_outer_shadow_gold",
      name: "幽冥玄阴黑金重袍",
      category: "outer",
      tags: ["demonic", "dark", "gold"],
      render: (ctx, { proportions: p, palette }) => {
        ctx.fillStyle = palette.primaryColor || "#09090b";
        ctx.strokeStyle = palette.accentColor || "#a855f7";
        ctx.lineWidth = 3.5;

        ctx.beginPath();
        ctx.moveTo(-p.shoulderWidth * 0.52, p.chestLength * 0.5);
        ctx.lineTo(-p.shoulderWidth * 0.38, -p.chestLength * 0.5);
        ctx.lineTo(p.shoulderWidth * 0.38, -p.chestLength * 0.5);
        ctx.lineTo(p.shoulderWidth * 0.52, p.chestLength * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jagged demonic soul runes
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, p.chestLength * 0.4);
        ctx.lineTo(-p.shoulderWidth * 0.15, 0);
        ctx.lineTo(0, -p.chestLength * 0.3);
        ctx.lineTo(p.shoulderWidth * 0.15, 0);
        ctx.closePath();
        ctx.stroke();
      }
    });

    // 3. Outer Robe: 流云紫霓羽衣 (Fairy Purple Ribbon Robe)
    this.register({
      id: "robe_outer_purple_cloud",
      name: "流云紫霓羽衣",
      category: "outer",
      tags: ["fairy", "female", "purple"],
      render: (ctx, { proportions: p, palette }) => {
        ctx.fillStyle = palette.primaryColor || "#7e22ce";
        ctx.strokeStyle = palette.secondaryColor || "#c084fc";
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(-p.shoulderWidth * 0.44, p.chestLength * 0.42);
        ctx.quadraticCurveTo(-p.shoulderWidth * 0.2, 0, -p.shoulderWidth * 0.3, -p.chestLength * 0.48);
        ctx.lineTo(p.shoulderWidth * 0.3, -p.chestLength * 0.48);
        ctx.quadraticCurveTo(p.shoulderWidth * 0.2, 0, p.shoulderWidth * 0.44, p.chestLength * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // 4. Cloak: 御风青羽大氅 (Wind Strider Mantle)
    this.register({
      id: "cloak_wind_strider",
      name: "御风青羽大氅",
      category: "cloak",
      tags: ["cloak", "flowing"],
      render: (ctx, { proportions: p, palette, physicsOffset = 0 }) => {
        ctx.fillStyle = palette.primaryColor || "#134e4a";
        ctx.strokeStyle = palette.accentColor || "#5eead4";
        ctx.lineWidth = 3;

        const cloakLen = p.totalHeight * 0.55;
        ctx.beginPath();
        ctx.moveTo(-p.shoulderWidth * 0.52, 0);
        ctx.quadraticCurveTo(
          -p.shoulderWidth * 0.7 + physicsOffset * 0.5,
          cloakLen * 0.6,
          -p.shoulderWidth * 0.6 + physicsOffset,
          cloakLen
        );
        ctx.lineTo(p.shoulderWidth * 0.6 + physicsOffset, cloakLen);
        ctx.quadraticCurveTo(
          p.shoulderWidth * 0.7 + physicsOffset * 0.5,
          cloakLen * 0.6,
          p.shoulderWidth * 0.52,
          0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // 5. Hair Back: 凌云垂腰长发 (Flowing Waist Hair Back)
    this.register({
      id: "hair_back_flowing",
      name: "凌云垂腰长发",
      category: "hair_back",
      tags: ["hair", "long"],
      render: (ctx, { proportions: p, palette, physicsOffset = 0 }) => {
        ctx.fillStyle = palette.primaryColor || "#141721";
        const hairLen = p.totalHeight * 0.44;

        ctx.beginPath();
        ctx.moveTo(-p.headScale * 0.42, 0);
        ctx.quadraticCurveTo(
          -p.headScale * 0.55 + physicsOffset * 0.4,
          hairLen * 0.5,
          -p.headScale * 0.35 + physicsOffset,
          hairLen
        );
        ctx.lineTo(p.headScale * 0.35 + physicsOffset, hairLen);
        ctx.quadraticCurveTo(
          p.headScale * 0.55 + physicsOffset * 0.4,
          hairLen * 0.5,
          p.headScale * 0.42,
          0
        );
        ctx.closePath();
        ctx.fill();
      }
    });

    // 6. Prop: 青竹蜂云剑 (Bamboo Cloud Sword)
    this.register({
      id: "weapon_bamboo_cloud_sword",
      name: "青竹蜂云剑",
      category: "prop",
      tags: ["weapon", "sword", "xianxia"],
      render: (ctx, { palette }) => {
        const swordLen = 220;
        ctx.fillStyle = palette.primaryColor || "#34d399";
        ctx.shadowColor = palette.accentColor || "#00ffcc";
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(8, -25);
        ctx.lineTo(5, -swordLen);
        ctx.lineTo(0, -swordLen - 18);
        ctx.lineTo(-5, -swordLen);
        ctx.lineTo(-8, -25);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-18, -25, 36, 8);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-4, -25, 8, 35);
      }
    });
  }
}
