import type { SKRSContext2D } from "@napi-rs/canvas";
import type { CostumeSpec, HairSpec, SocketsSpec, BodyArchetype } from "../../../core/models/modular-character.js";
import { UniversalSkeleton, type BoneName } from "./universal-skeleton.js";

export interface CostumeRenderContext {
  timeMs: number;
  skeleton: UniversalSkeleton;
  facing: "left" | "right";
  isFlying?: boolean;
}

/**
 * Spring-Damper Point for secondary cloth/hair physics
 */
export class SpringPoint {
  position = 0;
  velocity = 0;
  target = 0;

  constructor(
    public stiffness = 0.65, // Elastic tension
    public damping = 0.72    // Damping resistance
  ) {}

  update(dtSec: number, externalForce = 0): void {
    const force = -this.stiffness * (this.position - this.target) + externalForce;
    const accel = force;
    this.velocity = (this.velocity + accel * dtSec) * Math.pow(this.damping, dtSec * 60);
    this.position += this.velocity * dtSec;
  }
}

/**
 * Modular Costume Rig:
 * Assembles and renders decoupled clothing layers, hair, accessories, and props
 * onto the UniversalSkeleton with procedural aesthetics and secondary physics.
 */
export class ModularCostumeRig {
  readonly hairSpring = new SpringPoint(0.55, 0.75);
  readonly cloakSpring = new SpringPoint(0.45, 0.70);
  readonly sleeveLSpring = new SpringPoint(0.60, 0.72);
  readonly sleeveRSpring = new SpringPoint(0.60, 0.72);

  private lastTimeMs = 0;

  /**
   * Update secondary cloth & hair dynamics
   */
  updateDynamics(timeMs: number, windX = 0): void {
    if (this.lastTimeMs === 0) this.lastTimeMs = timeMs - 16;
    const dt = Math.min(0.05, Math.max(0.001, (timeMs - this.lastTimeMs) / 1000));
    this.lastTimeMs = timeMs;

    const swayWave = Math.sin(timeMs * 0.003) * 15;

    // Apply forces
    this.hairSpring.target = swayWave * 0.6;
    this.hairSpring.update(dt, windX * 0.5);

    this.cloakSpring.target = swayWave * 1.2;
    this.cloakSpring.update(dt, windX * 1.2);

    this.sleeveLSpring.target = swayWave * 0.8;
    this.sleeveLSpring.update(dt, windX * 0.7);

    this.sleeveRSpring.target = swayWave * 0.8;
    this.sleeveRSpring.update(dt, windX * 0.7);
  }

  /**
   * Render back layers (Behind body: back weapon, back hair, cloak)
   */
  renderBackLayers(
    ctx: SKRSContext2D,
    costume: CostumeSpec,
    hair: HairSpec,
    sockets: SocketsSpec,
    context: CostumeRenderContext
  ): void {
    const { skeleton } = context;

    // 1. Back Prop (Sword scabbard / wings / golden wheel)
    if (sockets.back && sockets.back.visible) {
      this.renderBackProp(ctx, sockets.back, skeleton);
    }

    // 2. Back Hair (Long flowing hair behind torso)
    this.renderHairBack(ctx, hair, skeleton);

    // 3. Cloak / Mantle
    if (costume.cloak) {
      this.renderCloak(ctx, costume.cloak, skeleton);
    }
  }

  /**
   * Render mid layers (Inner tunic, pants, outer robe, sash)
   */
  renderBodyCostume(
    ctx: SKRSContext2D,
    costume: CostumeSpec,
    context: CostumeRenderContext
  ): void {
    const { skeleton } = context;

    // 1. Bottom Pants & Boots
    this.renderLegsAndShoes(ctx, costume, skeleton);

    // 2. Inner Robe (素白内衬交领)
    this.renderInnerRobe(ctx, costume.inner, skeleton);

    // 3. Outer Robe (苍青仙袍)
    this.renderOuterRobe(ctx, costume.outer, skeleton);

    // 4. Waist Sash & Jade Belt
    this.renderSash(ctx, costume.sash, skeleton);

    // 5. Flowing Sleeves on Arms
    this.renderSleeves(ctx, costume.outer, skeleton);
  }

  /**
   * Render front layers (Front hair bun/bangs, hand props, aura)
   */
  renderFrontLayers(
    ctx: SKRSContext2D,
    hair: HairSpec,
    sockets: SocketsSpec,
    context: CostumeRenderContext
  ): void {
    const { skeleton } = context;

    // 1. Front Hair (Bangs, Bun, Crown Hairpin)
    this.renderHairFront(ctx, hair, skeleton);

    // 2. Head Top Socket (Crown / Hairpin)
    if (sockets.head_top && sockets.head_top.visible) {
      this.renderHeadTopProp(ctx, sockets.head_top, skeleton);
    }

    // 3. Hand Sockets (Right weapon sword / Left talisman)
    if (sockets.hand_r && sockets.hand_r.visible) {
      this.renderHandProp(ctx, sockets.hand_r, skeleton, "hand_r");
    }
    if (sockets.hand_l && sockets.hand_l.visible) {
      this.renderHandProp(ctx, sockets.hand_l, skeleton, "hand_l");
    }

    // 4. Aura
    if (sockets.aura && sockets.aura.enabled) {
      this.renderAura(ctx, sockets.aura, skeleton, context.timeMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Layer Renderers
  // ---------------------------------------------------------------------------

  private renderBackProp(ctx: SKRSContext2D, prop: any, skel: UniversalSkeleton): void {
    const chestT = skel.getBoneTransform2D("chest");
    ctx.save();
    ctx.translate(chestT.x + prop.offsetX, chestT.y + prop.offsetY);
    ctx.rotate(chestT.rotZ + prop.rotationZ);

    const s = prop.scale || 1.0;
    ctx.scale(s, s);

    // Render sword scabbard / wings
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5;

    // Slanted scabbard
    ctx.save();
    ctx.rotate(0.35);
    ctx.fillRect(-8, -120, 16, 240);
    ctx.strokeRect(-8, -120, 16, 240);
    // Gold ornamental bands
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-10, -80, 20, 12);
    ctx.fillRect(-10, 20, 20, 12);
    ctx.restore();

    ctx.restore();
  }

  private renderHairBack(ctx: SKRSContext2D, hair: HairSpec, skel: UniversalSkeleton): void {
    const headT = skel.getBoneTransform2D("head");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(headT.x, headT.y - p.headScale * 0.1);
    ctx.rotate(headT.rotZ);

    const hairOffset = this.hairSpring.position;

    ctx.fillStyle = hair.baseColor || "#141721";
    ctx.beginPath();
    // Flowing hair strands down past shoulders
    const hairLen = p.totalHeight * 0.42;
    ctx.moveTo(-p.headScale * 0.42, 0);
    ctx.quadraticCurveTo(-p.headScale * 0.55 + hairOffset * 0.4, hairLen * 0.5, -p.headScale * 0.35 + hairOffset, hairLen);
    ctx.lineTo(p.headScale * 0.35 + hairOffset, hairLen);
    ctx.quadraticCurveTo(p.headScale * 0.55 + hairOffset * 0.4, hairLen * 0.5, p.headScale * 0.42, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderCloak(ctx: SKRSContext2D, cloak: any, skel: UniversalSkeleton): void {
    const chestT = skel.getBoneTransform2D("chest");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(chestT.x, chestT.y);
    ctx.rotate(chestT.rotZ);

    const cloakOffset = this.cloakSpring.position;

    ctx.fillStyle = cloak.primaryColor || "#0f172a";
    ctx.strokeStyle = cloak.accentColor || "#38bdf8";
    ctx.lineWidth = 3;

    const cloakLen = p.totalHeight * 0.55;
    ctx.beginPath();
    ctx.moveTo(-p.shoulderWidth * 0.52, 0);
    ctx.quadraticCurveTo(-p.shoulderWidth * 0.7 + cloakOffset * 0.5, cloakLen * 0.6, -p.shoulderWidth * 0.6 + cloakOffset, cloakLen);
    ctx.lineTo(p.shoulderWidth * 0.6 + cloakOffset, cloakLen);
    ctx.quadraticCurveTo(p.shoulderWidth * 0.7 + cloakOffset * 0.5, cloakLen * 0.6, p.shoulderWidth * 0.52, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderLegsAndShoes(ctx: SKRSContext2D, costume: CostumeSpec, skel: UniversalSkeleton): void {
    const p = skel.proportions;
    const pelvisT = skel.getBoneTransform2D("pelvis");

    ctx.save();
    ctx.translate(pelvisT.x, pelvisT.y);
    ctx.rotate(pelvisT.rotZ);

    // Loose cultivation pants / skirt (下裳)
    ctx.fillStyle = costume.bottom.primaryColor || "#0f766e";
    const skirtW = p.shoulderWidth * 0.75;
    const skirtH = p.thighLength + p.calfLength * 0.85;

    ctx.beginPath();
    ctx.moveTo(-p.stanceWidth * 0.8, 0);
    ctx.lineTo(-skirtW * 0.6, skirtH);
    ctx.lineTo(skirtW * 0.6, skirtH);
    ctx.lineTo(p.stanceWidth * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    // Cloud Stepper Boots (踏云灵履)
    ctx.fillStyle = costume.shoes.primaryColor || "#18181b";
    ctx.strokeStyle = costume.shoes.secondaryColor || "#cbd5e1";
    ctx.lineWidth = 2;

    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * p.stanceWidth * 0.5, skirtH);
      ctx.beginPath();
      ctx.roundRect(-16, -10, 32, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  private renderInnerRobe(ctx: SKRSContext2D, inner: any, skel: UniversalSkeleton): void {
    const chestT = skel.getBoneTransform2D("chest");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(chestT.x, chestT.y);
    ctx.rotate(chestT.rotZ);

    // Crisp white inner collar (交领)
    ctx.fillStyle = inner.primaryColor || "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(-p.shoulderWidth * 0.25, -p.chestLength * 0.35);
    ctx.lineTo(0, p.chestLength * 0.25);
    ctx.lineTo(p.shoulderWidth * 0.25, -p.chestLength * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderOuterRobe(ctx: SKRSContext2D, outer: any, skel: UniversalSkeleton): void {
    const chestT = skel.getBoneTransform2D("chest");
    const pelvisT = skel.getBoneTransform2D("pelvis");
    const p = skel.proportions;

    ctx.save();

    // Torso robe body bridging chest and pelvis
    ctx.fillStyle = outer.primaryColor || "#0f766e";
    ctx.strokeStyle = outer.secondaryColor || "#2dd4bf";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(chestT.x - p.shoulderWidth * 0.48, chestT.y - p.chestLength * 0.35);
    ctx.lineTo(chestT.x + p.shoulderWidth * 0.48, chestT.y - p.chestLength * 0.35);
    ctx.lineTo(pelvisT.x + p.shoulderWidth * 0.38, pelvisT.y);
    ctx.lineTo(pelvisT.x - p.shoulderWidth * 0.38, pelvisT.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Auspicious cloud embroidery border (祥云暗纹金边)
    ctx.strokeStyle = outer.accentColor || "#fbbf24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(chestT.x - p.shoulderWidth * 0.42, chestT.y - p.chestLength * 0.2);
    ctx.lineTo(chestT.x, chestT.y + p.chestLength * 0.25);
    ctx.lineTo(pelvisT.x + p.shoulderWidth * 0.25, pelvisT.y);
    ctx.stroke();

    ctx.restore();
  }

  private renderSash(ctx: SKRSContext2D, sash: any, skel: UniversalSkeleton): void {
    const pelvisT = skel.getBoneTransform2D("pelvis");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(pelvisT.x, pelvisT.y);
    ctx.rotate(pelvisT.rotZ);

    // Wide silk sash
    ctx.fillStyle = sash.primaryColor || "#1e293b";
    ctx.strokeStyle = sash.accentColor || "#facc15";
    ctx.lineWidth = 2.5;

    const beltW = p.shoulderWidth * 0.72;
    ctx.fillRect(-beltW * 0.5, -14, beltW, 28);
    ctx.strokeRect(-beltW * 0.5, -14, beltW, 28);

    // Hanging jade pendant & sash tassel (环佩灵玉)
    ctx.fillStyle = sash.secondaryColor || "#34d399";
    ctx.beginPath();
    ctx.arc(beltW * 0.25, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tassel hanging down
    ctx.strokeStyle = sash.accentColor || "#facc15";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(beltW * 0.25, 9);
    ctx.lineTo(beltW * 0.25, 45);
    ctx.stroke();

    ctx.restore();
  }

  private renderSleeves(ctx: SKRSContext2D, outer: any, skel: UniversalSkeleton): void {
    const p = skel.proportions;

    // Render left & right flowing sleeves
    [
      { armName: "arm_upper_l" as BoneName, spring: this.sleeveLSpring, dir: -1 },
      { armName: "arm_upper_r" as BoneName, spring: this.sleeveRSpring, dir: 1 }
    ].forEach(({ armName, spring, dir }) => {
      const armT = skel.getBoneTransform2D(armName);

      ctx.save();
      ctx.translate(armT.x, armT.y);
      ctx.rotate(armT.rotZ);

      // Flowing sleeve polygon
      ctx.fillStyle = outer.primaryColor || "#0f766e";
      ctx.strokeStyle = outer.accentColor || "#fbbf24";
      ctx.lineWidth = 2.5;

      const sleeveOffset = spring.position * dir;
      const sleeveLen = p.upperArmLength + p.forearmLength;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dir * 25, sleeveLen * 0.4);
      ctx.lineTo(dir * 55 + sleeveOffset, sleeveLen * 0.85);
      ctx.lineTo(0, sleeveLen * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  private renderHairFront(ctx: SKRSContext2D, hair: HairSpec, skel: UniversalSkeleton): void {
    const headT = skel.getBoneTransform2D("head");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(headT.x, headT.y);
    ctx.rotate(headT.rotZ);

    ctx.fillStyle = hair.baseColor || "#141721";

    // Top Bun (凌云高发髻)
    if (hair.backStyle === "top_bun_tied" || hair.id.includes("bun")) {
      ctx.beginPath();
      ctx.ellipse(0, -p.headScale * 0.55, p.headScale * 0.22, p.headScale * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hairpin (碧玉簪)
      if (hair.hasHairpin) {
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-p.headScale * 0.32, -p.headScale * 0.55);
        ctx.lineTo(p.headScale * 0.32, -p.headScale * 0.55);
        ctx.stroke();
      }
    }

    // Bangs / Front Strands (额前飞扬刘海)
    ctx.beginPath();
    ctx.moveTo(-p.headScale * 0.42, -p.headScale * 0.35);
    ctx.quadraticCurveTo(-p.headScale * 0.25, -p.headScale * 0.1, -p.headScale * 0.32, p.headScale * 0.1);
    ctx.quadraticCurveTo(-p.headScale * 0.1, -p.headScale * 0.2, 0, -p.headScale * 0.35);
    ctx.quadraticCurveTo(p.headScale * 0.1, -p.headScale * 0.2, p.headScale * 0.32, p.headScale * 0.1);
    ctx.quadraticCurveTo(p.headScale * 0.25, -p.headScale * 0.1, p.headScale * 0.42, -p.headScale * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderHeadTopProp(ctx: SKRSContext2D, prop: any, skel: UniversalSkeleton): void {
    const headT = skel.getBoneTransform2D("head");
    const p = skel.proportions;

    ctx.save();
    ctx.translate(headT.x, headT.y - p.headScale * 0.6);
    ctx.rotate(headT.rotZ);
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Golden / Jade Crown
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-12, -18);
    ctx.lineTo(0, -24);
    ctx.lineTo(12, -18);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderHandProp(
    ctx: SKRSContext2D,
    prop: any,
    skel: UniversalSkeleton,
    socketName: "hand_r" | "hand_l"
  ): void {
    const handT = skel.getBoneTransform2D(socketName);

    ctx.save();
    ctx.translate(handT.x + prop.offsetX, handT.y + prop.offsetY);
    ctx.rotate(handT.rotZ + prop.rotationZ);

    const s = prop.scale || 1.0;
    ctx.scale(s, s);

    if (prop.propType === "weapon_sword") {
      // Qingzhu Fengyun Flying Sword (青竹蜂云剑)
      const swordLen = 220;
      // Blade pointing upward
      ctx.fillStyle = "#34d399";
      ctx.shadowColor = prop.glowColor || "#00ffcc";
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 25);
      ctx.lineTo(5, -swordLen);
      ctx.lineTo(0, -swordLen - 18); // Sharp tip
      ctx.lineTo(-5, -swordLen);
      ctx.lineTo(-8, 25);
      ctx.closePath();
      ctx.fill();

      // Guard (剑格)
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-18, 20, 36, 8);

      // Hilt (剑柄)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-4, 28, 8, 35);
    } else if (prop.propType === "talisman") {
      // Golden Daoist Talisman (太清降魔符)
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.fillRect(-15, -35, 30, 50);
      ctx.strokeRect(-15, -35, 30, 50);
    }

    ctx.restore();
  }

  private renderAura(ctx: SKRSContext2D, aura: any, skel: UniversalSkeleton, timeMs: number): void {
    const pelvisT = skel.getBoneTransform2D("pelvis");
    const p = skel.proportions;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const pulse = Math.sin(timeMs * 0.004) * 0.15 + 0.95;
    const intensity = (aura.intensity || 1.0) * pulse;
    const auraColor = aura.color || "#00ffcc";

    ctx.translate(pelvisT.x, pelvisT.y - p.chestLength * 0.2);

    const grad = ctx.createRadialGradient(0, 0, 60, 0, 0, p.totalHeight * 0.55);
    grad.addColorStop(0, auraColor);
    grad.addColorStop(0.4, "rgba(0, 255, 200, 0.25)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.globalAlpha = Math.min(0.65, 0.35 * intensity);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.shoulderWidth * 1.2 * pulse, p.totalHeight * 0.55 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
