import { createCanvas, type Canvas, type SKRSContext2D, GlobalFonts, loadImage, type Image } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { ThreeStage } from "../engine/stage/three-stage.js";
import { PuppetCharacter } from "../engine/puppet/puppet-character.js";
import { MemeFaceMaterial } from "../engine/materials/meme-face-material.js";
import { SubtitleMesh } from "../engine/subtitle/subtitle-mesh.js";
import { ScreenFlash } from "../engine/vfx/screen-fx.js";
import { LightningEffect } from "../engine/vfx/lightning-effect.js";
import { SwordTrailParticles } from "../engine/vfx/sword-trail-particles.js";
import { FontRasterizer } from "../engine/subtitle/font-rasterizer.js";
import type { ActionPose } from "../engine/puppet/action-controller.js";
import { SpriteMeshRasterizer } from "./sprite-mesh-rasterizer.js";
import type { ModularAvatar } from "../engine/puppet/avatar/modular-avatar.js";

export interface HeadlessRendererOptions {
  width?: number; // Canvas pixel width (default: 1080)
  height?: number; // Canvas pixel height (default: 1920)
  backgroundColor?: string;
}

/**
 * HeadlessRenderer: Ultra-sharp 2.5D offline rasterizer running entirely in Node.js
 * Draws ThreeStage layered scene hierarchy onto an offscreen Skia Canvas and extracts raw RGBA buffers.
 */
export class HeadlessRenderer {
  readonly width: number;
  readonly height: number;
  private readonly canvas: Canvas;
  private readonly ctx: SKRSContext2D;
  private readonly defaultBgColor: string;
  private readonly loadedImages: Map<string, Image> = new Map();
  private readonly spriteRasterizer = new SpriteMeshRasterizer();

  constructor(options: HeadlessRendererOptions = {}) {
    this.width = options.width ?? 1920;
    this.height = options.height ?? 1080;
    this.defaultBgColor = options.backgroundColor ?? "#0b0f19"; // Deep cultivation nocturnal void

    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d");

    // Ensure TTF fonts are registered
    FontRasterizer.ensureFonts();
  }

  /**
   * Preload image files into memory for zero-latency synchronous frame rendering
   */
  public async preloadImages(paths: string[]): Promise<void> {
    for (const p of paths) {
      if (!p || this.loadedImages.has(p)) continue;
      const resolved = path.resolve(p);
      if (fs.existsSync(resolved)) {
        try {
          const img = await loadImage(resolved);
          this.loadedImages.set(p, img);
          this.loadedImages.set(resolved, img);
        } catch {
          // Ignore loading errors
        }
      }
    }
  }

  /**
   * Projects a 3D world coordinate at Z=0 to 2D Canvas pixel coordinates based on the stage camera
   */
  public projectWorldToScreen(
    stage: ThreeStage,
    worldX: number,
    worldY: number
  ): { x: number; y: number; scaleFactor: number } {
    const cam = stage.camera;
    cam.updateMatrixWorld(true);
    const { width: visW } = stage.getVisibleBoundsAtZ(0);

    const scaleFactor = this.width / Math.max(1, visW);
    const projected = new THREE.Vector3(worldX, worldY, 0).project(cam);
    const screenX = (projected.x + 1) * this.width / 2;
    const screenY = (1 - projected.y) * this.height / 2;

    return { x: screenX, y: screenY, scaleFactor };
  }

  /**
   * Renders a single complete frame from the ThreeStage scene and returns raw RGBA Buffer
   */
  public renderFrame(stage: ThreeStage): Buffer {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.save();
    ctx.fillStyle = this.defaultBgColor;
    ctx.fillRect(0, 0, w, h);

    // Subtle cultivation celestial gradient background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#080c18");
    skyGrad.addColorStop(0.5, "#101828");
    skyGrad.addColorStop(1, "#182236");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 2. Render Layers in Order
    this.renderFarSkyLayer(stage, ctx);
    this.renderMidGroundLayer(stage, ctx);
    this.renderActionSpeedLines(stage, ctx);
    this.renderActorsLayer(stage, ctx);
    this.renderVfxLayer(stage, ctx);
    this.renderForegroundAtmosphere(stage, ctx);
    this.renderSubtitlesLayer(stage, ctx);
    this.renderCinematicVignette(ctx);

    // 3. Extract RGBA Buffer
    const imgData = ctx.getImageData(0, 0, w, h);
    return Buffer.from(imgData.data.buffer, imgData.data.byteOffset, imgData.data.byteLength);
  }

  private renderFarSkyLayer(stage: ThreeStage, ctx: SKRSContext2D): void {
    const bgPath = stage.userData.backgroundPath as string | undefined;
    const bgImg = bgPath
      ? this.loadedImages.get(bgPath) || this.loadedImages.get(path.resolve(bgPath))
      : undefined;

    if (bgImg) {
      ctx.save();
      const w = this.width;
      const h = this.height;

      // 1.15x cover scaling gives rich margin for camera movement
      const bgScale = Math.max(w / bgImg.width, h / bgImg.height) * 1.15;
      const bgW = bgImg.width * bgScale;
      const bgH = bgImg.height * bgScale;

      // Smooth camera parallax
      const cam = stage.camera;
      const camParallaxX = (cam.position.x || 0) * 0.16;
      const camParallaxY = (cam.position.y || 0) * 0.16;

      const bgX = (w - bgW) / 2 - camParallaxX;
      const bgY = (h - bgH) / 2 + camParallaxY;

      ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);

      const timeMs = (stage.userData.timeMs as number) || 0;

      // Dynamic sky lightning illumination bloom on thunder events
      const thunderArc = stage.userData.thunderArc;
      if (thunderArc) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const skyStrobe = ctx.createRadialGradient(w * 0.5, h * 0.25, 40, w * 0.5, h * 0.25, w * 0.75);
        skyStrobe.addColorStop(0, "rgba(230, 210, 255, 0.40)");
        skyStrobe.addColorStop(0.4, "rgba(160, 110, 255, 0.22)");
        skyStrobe.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = skyStrobe;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Floating spiritual light particles (32 floating motes of qi with sinusoidal sway)
      const pCount = 32;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < pCount; i++) {
        const px = (i * 137.5 + Math.sin(timeMs * 0.0012 + i * 1.7) * 35) % w;
        const py = (h - ((timeMs * 0.035 + i * 97) % (h + 50)));
        const pSize = 1.5 + (i % 4) * 0.8;
        const isGold = i % 3 === 0;
        const alpha = 0.25 + (Math.sin(timeMs * 0.003 + i) * 0.5 + 0.5) * 0.45;
        ctx.fillStyle = isGold ? `rgba(255, 235, 120, ${alpha})` : `rgba(100, 255, 210, ${alpha})`;
        ctx.shadowColor = isGold ? "#ffdd44" : "#33ffcc";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Celestial Vignette for cinematic depth
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(4, 7, 18, 0.40)");
      grad.addColorStop(0.3, "rgba(0, 0, 0, 0.0)");
      grad.addColorStop(0.7, "rgba(0, 0, 0, 0.15)");
      grad.addColorStop(1.0, "rgba(4, 8, 22, 0.75)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else {
      const layer = stage.layers.getLayer("far_sky");
      if (!layer || !layer.visible) return;

      ctx.save();
      layer.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.visible) {
          this.renderMeshSprite(stage, obj, ctx);
        }
      });
      ctx.restore();
    }
  }

  private renderMidGroundLayer(stage: ThreeStage, ctx: SKRSContext2D): void {
    const w = this.width;
    const h = this.height;
    const timeMs = (stage.userData.timeMs as number) || 0;
    const cam = stage.camera;

    // Drifting atmospheric mist planes around mountain valleys (仙山浮云)
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const mistY = h * 0.62 + (cam.position.y || 0) * 0.25;
    const camParallax = (cam.position.x || 0) * 0.35;

    for (let m = 0; m < 3; m++) {
      const mistSpeed = (m + 1) * 0.02;
      const mistX = (((timeMs * mistSpeed + m * 450 - camParallax) % (w + 600)) - 300);
      const mistW = 600 + m * 200;
      const mistH = 120 + m * 40;
      const grad = ctx.createRadialGradient(mistX, mistY + m * 30, 20, mistX, mistY + m * 30, mistW * 0.5);
      grad.addColorStop(0, `rgba(180, 220, 255, ${0.12 - m * 0.02})`);
      grad.addColorStop(0.6, `rgba(140, 190, 240, ${0.06 - m * 0.01})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(mistX, mistY + m * 30, mistW * 0.5, mistH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const layer = stage.layers.getLayer("mid_ground");
    if (!layer || !layer.visible) return;

    ctx.save();
    layer.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.visible) {
        this.renderMeshSprite(stage, obj, ctx);
      }
    });
    ctx.restore();
  }

  private renderActionSpeedLines(stage: ThreeStage, ctx: SKRSContext2D): void {
    const actionLines = stage.userData.actionLines as
      | { type: "radial" | "horizontal"; focalX?: number; focalY?: number; color?: string }
      | undefined;
    if (!actionLines) return;

    const w = this.width;
    const h = this.height;
    const timeMs = (stage.userData.timeMs as number) || 0;

    ctx.save();
    if (actionLines.type === "radial") {
      const fx = actionLines.focalX ?? w / 2;
      const fy = actionLines.focalY ?? h * 0.42;
      const count = 38;
      ctx.strokeStyle = actionLines.color || "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 3.5;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.sin(i * 13 + timeMs * 0.02) * 0.06;
        const rInner = 240 + Math.sin(i * 3.7 + timeMs * 0.015) * 60;
        const rOuter = Math.max(w, h) * 1.15;

        const x1 = fx + Math.cos(angle) * rInner;
        const y1 = fy + Math.sin(angle) * rInner;
        const x2 = fx + Math.cos(angle) * rOuter;
        const y2 = fy + Math.sin(angle) * rOuter;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (actionLines.type === "horizontal") {
      ctx.strokeStyle = actionLines.color || "rgba(180, 240, 255, 0.4)";
      ctx.lineWidth = 4;
      const streakCount = 22;

      for (let i = 0; i < streakCount; i++) {
        const y = (i / streakCount) * h;
        const speed = 1.4 + (i % 3) * 0.7;
        const xOffset = ((timeMs * speed + i * 180) % (w + 400)) - 200;
        const len = 160 + (i % 4) * 90;

        ctx.beginPath();
        ctx.moveTo(xOffset, y);
        ctx.lineTo(xOffset + len, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderActorsLayer(stage: ThreeStage, ctx: SKRSContext2D): void {
    const layer = stage.layers.getLayer("actors");
    if (!layer || !layer.visible) return;

    ctx.save();

    for (const child of layer.children) {
      if (!child.visible) continue;
      this.renderActorHierarchy(stage, child, ctx);
    }

    ctx.restore();
  }

  private renderActorHierarchy(stage: ThreeStage, obj: THREE.Object3D, ctx: SKRSContext2D): void {
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);

    const floatOffset = (obj.userData.floatOffsetY as number) ?? 0;
    const motionOffsetX = (obj.userData.motionOffsetX as number) ?? 0;
    const motionOffsetY = (obj.userData.motionOffsetY as number) ?? 0;
    const knockbackX = (obj.userData.knockbackX as number) ?? 0;
    const jitterX = (obj.userData.jitterX as number) ?? 0;
    const jitterY = (obj.userData.jitterY as number) ?? 0;
    const rotationZ = (obj.userData.rotationZ as number) ?? obj.rotation.z ?? 0;
    const motionScale = (obj.userData.motionScale as number) ?? 1.0;

    const currentPose = obj.userData.currentPose as ActionPose | undefined;
    const poseOffsetY = currentPose?.bodyOffsetY ?? 0;
    const poseRotZ = currentPose?.bodyRotationZ ?? 0;

    const finalWorldX = worldPos.x + knockbackX + motionOffsetX + jitterX;
    const finalWorldY = worldPos.y + floatOffset + motionOffsetY + jitterY + poseOffsetY;
    const totalRotationZ = rotationZ + poseRotZ;

    const { x: sx, y: sy, scaleFactor } = this.projectWorldToScreen(
      stage,
      finalWorldX,
      finalWorldY
    );

    ctx.save();
    ctx.translate(sx, sy);

    const targetFacing = obj.scale.x < 0 || obj.userData.facing === "left" ? "left" : "right";
    const spriteNaturalFacing = (obj.userData.defaultFacing as "left" | "right") || "left";
    const shouldFlipSprite = targetFacing !== spriteNaturalFacing;
    const actorScale = Math.abs(obj.scale.x || 1.0) * scaleFactor * motionScale;

    // Apply combined rotation angle (e.g. flight tilt, sword slash lunge, hit tumble)
    if (totalRotationZ !== 0) {
      ctx.rotate(targetFacing === "left" ? totalRotationZ : -totalRotationZ);
    }

    // Pass timeMs for face animation
    obj.userData.timeMs = stage.userData.timeMs;

    if (shouldFlipSprite) {
      ctx.scale(-1, 1);
    }

    // Check if character has spriteMap attached
    const spriteMap = obj.userData.spriteMap as Record<string, string> | undefined;
    const currentExpr = (obj.userData.currentExpression as string) || "normal";
    const spritePath = spriteMap
      ? spriteMap[currentExpr] || spriteMap["normal"] || Object.values(spriteMap)[0]
      : undefined;
    const spriteImg = spritePath
      ? this.loadedImages.get(spritePath) || this.loadedImages.get(path.resolve(spritePath))
      : undefined;

    // Motion dash afterimage trail (3-ghost anime flash-step)
    const targetH = this.height * (this.width > this.height ? 0.52 : 0.375) * actorScale;
    const targetW = spriteImg ? (spriteImg.width / spriteImg.height) * targetH : targetH;
    if (obj.userData.dashTrail && spriteImg) {
      const trailX = targetFacing === "left" ? 45 : -45;
      const ghosts = [
        { mult: 1, alpha: 0.36 },
        { mult: 2, alpha: 0.22 },
        { mult: 3, alpha: 0.10 }
      ];
      for (const g of ghosts) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = g.alpha;
        ctx.drawImage(spriteImg, -targetW / 2 + trailX * g.mult, -targetH + 12, targetW, targetH);
        ctx.restore();
      }
    }

    // Speaker focus spotlight to make the active speaker visually pop
    if (obj.userData.speakerFocus || obj.userData.isSpeaking) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const spotGrad = ctx.createRadialGradient(0, -targetH * 0.5, 30 * actorScale, 0, -targetH * 0.5, targetH * 0.75);
      spotGrad.addColorStop(0, "rgba(255, 245, 190, 0.20)");
      spotGrad.addColorStop(0.5, "rgba(255, 230, 150, 0.08)");
      spotGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(0, -targetH * 0.5, targetH * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const modularAvatar = obj.userData.modularAvatar as ModularAvatar | undefined;
    if (modularAvatar) {
      modularAvatar.facing = targetFacing;
      modularAvatar.setSpeechState(!!obj.userData.isSpeaking, obj.userData.isSpeaking ? "a" : "silence", obj.userData.isSpeaking ? 0.75 : 0);
      modularAvatar.setExpression((obj.userData.currentExpression as string) || "normal");
      modularAvatar.update(stage.userData.timeMs || 0, 0.016);
      modularAvatar.render(ctx, actorScale * 0.75);
    } else if (spriteImg) {
      this.renderCharacterSprite(obj, ctx, actorScale, spriteImg, currentExpr);
    } else {
      this.renderPuppetGroups(obj, ctx, actorScale);
    }

    ctx.restore();
  }

  private renderCharacterSprite(
    obj: THREE.Object3D,
    ctx: SKRSContext2D,
    scale: number,
    spriteImg: Image,
    _expression: string
  ): void {
    const isDemonic = obj.name.includes("evil");
    const isRooster = obj.name.includes("rooster");
    const isHero = obj.name.includes("hero_m") || obj.name.includes("yunfei");
    const auraColor =
      (obj.userData.auraColor as string) ||
      (isDemonic ? "#9922ff" : isRooster ? "#ffd700" : isHero ? "#33bbff" : "#00ffaa");

    const auraIntensity = (obj.userData.auraPulse as number) || 1.0;
    const timeMs = (obj.userData.timeMs as number) ?? 0;

    // 1. Cultivator Under-feet Spiritual Energy / Flying Sword Aura
    if (!isRooster && !isDemonic) {
      // Han Li / Hero sword aura and jet
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const swordColor = isHero ? "#33c8ff" : "#00ffaa";
      const hoverPulse = Math.sin(timeMs * 0.005) * 0.18 + 0.95;
      ctx.shadowColor = swordColor;
      ctx.shadowBlur = 24 * scale * hoverPulse;
      ctx.strokeStyle = swordColor;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 6 * scale, 130 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Trailing sword energy jet
      const trailLen = 150 * scale;
      const jetGrad = ctx.createLinearGradient(0, 6 * scale, -trailLen, 6 * scale);
      jetGrad.addColorStop(0, swordColor);
      jetGrad.addColorStop(0.5, "rgba(80, 255, 200, 0.45)");
      jetGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(20 * scale, 2 * scale);
      ctx.lineTo(-trailLen, -4 * scale);
      ctx.lineTo(-trailLen, 14 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (isDemonic) {
      // Demonic purple miasma under Evil Lord
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const miasmaPulse = Math.sin(timeMs * 0.005) * 0.2 + 0.95;
      ctx.shadowColor = "#9922ff";
      ctx.shadowBlur = 28 * scale * miasmaPulse;
      const demonGrad = ctx.createRadialGradient(0, -5 * scale, 10 * scale, 0, -5 * scale, 110 * scale);
      demonGrad.addColorStop(0, "rgba(220, 50, 255, 0.55)");
      demonGrad.addColorStop(0.5, "rgba(130, 20, 200, 0.32)");
      demonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = demonGrad;
      ctx.beginPath();
      ctx.ellipse(0, -5 * scale, 115 * scale, 28 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Body Spiritual Aura
    if (auraIntensity > 1.15 || obj.userData.speakerFocus) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(0.45, (auraIntensity - 1.0) * 0.6 + (obj.userData.speakerFocus ? 0.22 : 0));
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 3.5 * scale;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 20 * scale;
      ctx.beginPath();
      ctx.ellipse(0, -180 * scale, 85 * scale, 180 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw High-Res Character Sprite Image with Kinematic Breathing Deformation
    const currentPose = obj.userData.currentPose as ActionPose | undefined;
    const poseScaleY = currentPose?.bodyScaleY ?? 1.0;
    const poseScaleX = currentPose?.bodyScaleX ?? 1.0;
    const baseH = this.height * (this.width > this.height ? 0.52 : 0.375);
    const targetH = baseH * scale * poseScaleY;
    const targetW = (spriteImg.width / spriteImg.height) * targetH * poseScaleX;

    const isSpeaking = !!obj.userData.isSpeaking;
    this.spriteRasterizer.render(ctx, spriteImg, (obj.userData.rigId as string) || obj.name,
      currentPose, timeMs, isSpeaking, _expression, targetW, targetH);

    // 5. Sword Slash Arc VFX when executing attack_slash
    if (currentPose?.slashArc?.active) {
      this.renderSlashArc(ctx, currentPose, scale * baseH / 720, auraColor);
    }
  }

  private renderSlashArc(
    ctx: SKRSContext2D,
    pose: ActionPose,
    scale: number,
    auraColor: string
  ): void {
    if (!pose.slashArc || !pose.slashArc.active) return;
    const { progress, arcAngle, arcRadius } = pose.slashArc;
    ctx.save();
    ctx.translate(60 * scale, -320 * scale);
    ctx.rotate(arcAngle);

    const r = arcRadius * scale;
    const grad = ctx.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    grad.addColorStop(0.35, auraColor);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.strokeStyle = grad;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 32 * scale;
    ctx.lineWidth = 16 * scale * (1 - progress * 0.45);
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.48, Math.PI * 0.48, false);
    ctx.stroke();

    // Sharp white core blade edge
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2 * scale, -Math.PI * 0.35, Math.PI * 0.35, false);
    ctx.stroke();

    ctx.restore();
  }

  private renderComicBubble(
    ctx: SKRSContext2D,
    targetH: number,
    _targetW: number,
    bubbleType: string,
    scale: number
  ): void {
    const bubbleY = -targetH - 35 * scale;
    const bubbleX = 35 * scale;

    ctx.save();
    ctx.translate(bubbleX, bubbleY);

    if (bubbleType === "shocked" || bubbleType === "exclamation") {
      // Golden/Red Circle Badge with bold Exclamation ❗
      const badgeR = 36 * scale;
      ctx.shadowColor = "rgba(255, 60, 0, 0.85)";
      ctx.shadowBlur = 22 * scale;
      ctx.fillStyle = "#ff2200";
      ctx.beginPath();
      ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4 * scale;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(44 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, 2 * scale);
    } else if (bubbleType === "sweat") {
      // Cartoon Blue Sweat Drop 💧
      ctx.shadowColor = "rgba(0, 180, 255, 0.75)";
      ctx.shadowBlur = 15 * scale;
      ctx.fillStyle = "#33ccff";
      ctx.beginPath();
      ctx.moveTo(0, -35 * scale);
      ctx.bezierCurveTo(-20 * scale, -10 * scale, -20 * scale, 20 * scale, 0, 20 * scale);
      ctx.bezierCurveTo(20 * scale, 20 * scale, 20 * scale, -10 * scale, 0, -35 * scale);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    } else if (bubbleType === "anger") {
      // Cartoon Red Anger Vein 💢
      ctx.strokeStyle = "#ff0000";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 15 * scale;
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      const s = 18 * scale;
      ctx.moveTo(-s, -s / 2);
      ctx.lineTo(-s / 2, -s / 2);
      ctx.lineTo(-s / 2, -s);
      ctx.moveTo(s, -s / 2);
      ctx.lineTo(s / 2, -s / 2);
      ctx.lineTo(s / 2, -s);
      ctx.moveTo(-s, s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.lineTo(-s / 2, s);
      ctx.moveTo(s, s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(s / 2, s);
      ctx.stroke();
    } else if (bubbleType === "glint") {
      // 4-point golden star glint ✨
      ctx.fillStyle = "#fff8aa";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 25 * scale;
      const s = 30 * scale;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderPuppetGroups(root: THREE.Object3D, ctx: SKRSContext2D, scale: number): void {
    // 1. Aura glow
    const auraGroup = root.getObjectByName(`${root.name.replace("Puppet_", "")}_Aura`) || root.getObjectByName("AuraMesh");
    ctx.save();
    ctx.fillStyle = "rgba(68, 255, 170, 0.22)";
    ctx.shadowColor = "#44ffaa";
    ctx.shadowBlur = 40 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, 160 * scale, 240 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Flying Sword (Weapon)
    const weaponGroup = root.getObjectByName(`${root.name.replace("Puppet_", "")}_Weapon`);
    ctx.save();
    const swordOffsetY = weaponGroup ? weaponGroup.position.y * scale : -40 * scale;
    const swordOffsetX = weaponGroup ? weaponGroup.position.x * scale : 0;
    const swordRot = weaponGroup ? weaponGroup.rotation.z : 0.15;

    ctx.translate(swordOffsetX, -swordOffsetY);
    ctx.rotate(-swordRot);

    // Glowing sword blade
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 20 * scale;
    ctx.fillStyle = "#33ddaa";
    ctx.fillRect(-160 * scale, -10 * scale, 320 * scale, 20 * scale);

    // Golden sword hilt
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(-175 * scale, -18 * scale, 25 * scale, 36 * scale);
    ctx.restore();

    // 3. Robe Body (5.5 Heads tall cultivator physique)
    const bodyGroup = root.getObjectByName(`${root.name.replace("Puppet_", "")}_Body`);
    const bodyOffsetY = bodyGroup ? bodyGroup.position.y * scale : 0;

    ctx.save();
    ctx.translate(0, -bodyOffsetY);

    // Robe outer contour
    const bodyW = 140 * scale;
    const bodyH = 260 * scale;
    const bodyGrad = ctx.createLinearGradient(0, -bodyH / 2, 0, bodyH / 2);
    bodyGrad.addColorStop(0, "#f0f8ff");
    bodyGrad.addColorStop(0.6, "#c0d4ec");
    bodyGrad.addColorStop(1, "#3c5070");

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#1a2536";
    ctx.lineWidth = 4 * scale;

    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.45, -bodyH * 0.4);
    ctx.lineTo(bodyW * 0.45, -bodyH * 0.4);
    ctx.lineTo(bodyW * 0.7, bodyH * 0.5);
    ctx.lineTo(-bodyW * 0.7, bodyH * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cyan taoist sash
    ctx.fillStyle = "#00d0aa";
    ctx.fillRect(-bodyW * 0.5, 0, bodyW, 16 * scale);
    ctx.restore();

    // 4. Arms / Sleeves
    const armsGroup = root.getObjectByName(`${root.name.replace("Puppet_", "")}_Arms`);
    const armsOffsetY = armsGroup ? armsGroup.position.y * scale : 0;
    ctx.save();
    ctx.translate(0, -armsOffsetY);
    ctx.fillStyle = "#ddeeff";
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.5, -bodyH * 0.15, 30 * scale, 80 * scale, -0.2, 0, Math.PI * 2);
    ctx.ellipse(bodyW * 0.5, -bodyH * 0.15, 30 * scale, 80 * scale, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Head and Face Mount (Jacky Cheung Meme Face)
    const headGroup = root.getObjectByName(`${root.name.replace("Puppet_", "")}_Head`);
    const headOffsetY = headGroup ? headGroup.position.y * scale : 190 * scale;

    ctx.save();
    ctx.translate(0, -headOffsetY);

    // Head base (cultivator hair & face outline)
    const headW = 90 * scale;
    const headH = 100 * scale;

    // Black Topknot Hair
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(0, -headH * 0.5, headW * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Jade Hairpin
    ctx.fillStyle = "#44ffaa";
    ctx.fillRect(-headW * 0.6, -headH * 0.55, headW * 1.2, 8 * scale);

    // Check for Meme Face Plane with dynamic texture
    let drawnMemeFace = false;
    root.traverse((node) => {
      if (node.name === "MemeFacePlane" && node instanceof THREE.Mesh) {
        const mat = node.material as THREE.MeshBasicMaterial;
        if (
          mat &&
          mat.map &&
          mat.map.image &&
          mat.map.name !== "procedural_fallback" &&
          !mat.map.name?.startsWith("procedural_")
        ) {
          try {
            this.renderTextureOntoCanvas(mat.map, ctx, 0, 0, headW, headH);
            drawnMemeFace = true;
          } catch {
            // fallback
          }
        }
      }
    });

    if (!drawnMemeFace) {
      // Procedural expressive comic face (Jacky Cheung screaming / smirking eyebrow style)
      ctx.fillStyle = "#ffe4cf";
      ctx.beginPath();
      ctx.ellipse(0, 0, headW * 0.45, headH * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#331a00";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();

      // Sharp comic eyes & eyebrows
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(-headW * 0.35, -headH * 0.2);
      ctx.lineTo(-headW * 0.08, -headH * 0.08);
      ctx.moveTo(headW * 0.08, -headH * 0.08);
      ctx.lineTo(headW * 0.35, -headH * 0.2);
      ctx.stroke();

      // Magic meme mouth (wide grin / shout)
      ctx.fillStyle = "#881111";
      ctx.beginPath();
      ctx.arc(0, headH * 0.15, headW * 0.25, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderTextureOntoCanvas(
    texture: THREE.Texture,
    ctx: SKRSContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ): void {
    const img = (texture as any).image;
    if (!img) return;

    if (img.data && img.width && img.height) {
      // DataTexture (Uint8Array RGBA)
      const subCanvas = createCanvas(img.width, img.height);
      const subCtx = subCanvas.getContext("2d");
      const imgData = subCtx.createImageData(img.width, img.height);
      imgData.data.set(img.data);
      subCtx.putImageData(imgData, 0, 0);

      ctx.drawImage(subCanvas, cx - w / 2, cy - h / 2, w, h);
    } else if (typeof img === "object" && "width" in img && "height" in img) {
      ctx.drawImage(img as any, cx - w / 2, cy - h / 2, w, h);
    }
  }

  private renderVfxLayer(stage: ThreeStage, ctx: SKRSContext2D): void {
    const timeMs = (stage.userData.timeMs as number) || 0;

    // 1. Divine Thunderbolt arc (九天玄雷 / 混沌神劫)
    const thunderArc = stage.userData.thunderArc as
      | { startX: number; startY: number; targetX: number; targetY: number }
      | undefined;
    if (thunderArc) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const p1 = this.projectWorldToScreen(stage, thunderArc.startX, thunderArc.startY);
      const p2 = this.projectWorldToScreen(stage, thunderArc.targetX, thunderArc.targetY);

      const seed = Math.floor(timeMs / 35);
      const numSegments = 14;
      const points: Array<{ x: number; y: number }> = [{ x: p1.x, y: p1.y }];

      for (let i = 1; i < numSegments; i++) {
        const t = i / numSegments;
        const lx = p1.x + (p2.x - p1.x) * t;
        const ly = p1.y + (p2.y - p1.y) * t;
        const jitter = Math.sin(seed * 7 + i * 11) * 50 + Math.cos(seed * 3 + i * 5) * 35;
        points.push({ x: lx + jitter, y: ly });
      }
      points.push({ x: p2.x, y: p2.y });

      // Outer violet-gold divine lightning halo
      ctx.shadowColor = "#bb44ff";
      ctx.shadowBlur = 55;
      ctx.strokeStyle = "rgba(180, 60, 255, 0.85)";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();

      // Mid electric-cyan energy beam
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 30;
      ctx.strokeStyle = "rgba(100, 240, 255, 0.95)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();

      // White-hot core lightning arc
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();

      // Branching tributary lightning forks
      for (let b = 0; b < 5; b++) {
        const forkIdx = 2 + (b * 2) % (points.length - 3);
        const forkPt = points[forkIdx];
        const dir = (b % 2 === 0 ? 1 : -1);
        ctx.strokeStyle = "rgba(255, 230, 140, 0.85)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(forkPt.x, forkPt.y);
        let curX = forkPt.x;
        let curY = forkPt.y;
        for (let s = 0; s < 4; s++) {
          curX += dir * (35 + s * 18) + Math.sin(seed + b + s) * 22;
          curY += 28 + s * 16;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      }

      // Target impact plasma explosion orb
      const plasmaGrad = ctx.createRadialGradient(p2.x, p2.y, 4, p2.x, p2.y, 75);
      plasmaGrad.addColorStop(0, "#ffffff");
      plasmaGrad.addColorStop(0.25, "#ffee66");
      plasmaGrad.addColorStop(0.65, "#9933ff");
      plasmaGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = plasmaGrad;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 75, 0, Math.PI * 2);
      ctx.fill();

      // Ground Impact Shockwave Rings (Cyan & Golden electric ripples)
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 35;
      ctx.strokeStyle = "#44ffee";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(p2.x, p2.y, 130, 38, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(p2.x, p2.y, 75, 22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Exploding impact sparks
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffdd44";
      ctx.shadowBlur = 25;
      for (let sp = 0; sp < 22; sp++) {
        const ang = (sp / 22) * Math.PI * 2 + seed * 1.5;
        const dist = 35 + (sp % 5) * 32;
        const spx = p2.x + Math.cos(ang) * dist;
        const spy = p2.y + Math.sin(ang) * dist * 0.55;
        const sparkR = 2.2 + (sp % 3) * 1.2;
        ctx.beginPath();
        ctx.arc(spx, spy, sparkR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Flying swords stream (七十二柄青竹蜂云剑阵 / 万剑归宗)
    const swordStream = stage.userData.swordStream as
      | { active: boolean; count?: number; originX: number; originY: number; targetX: number; targetY: number; elapsedMs?: number; travelMs?: number }
      | undefined;
    if (swordStream && swordStream.active) {
      ctx.save();
      const origin = this.projectWorldToScreen(stage, swordStream.originX, swordStream.originY);
      const target = this.projectWorldToScreen(stage, swordStream.targetX, swordStream.targetY);
      const count = swordStream.count || 24;

      // Swarm of flying swords streaming through curved arcs
      for (let s = 0; s < count; s++) {
        const travelMs = swordStream.travelMs ?? 1000;
        const elapsedMs = swordStream.elapsedMs ?? timeMs;
        const progress = (elapsedMs - s * 14) / travelMs;
        if (progress < 0 || progress > 1) continue;

        const arcSpread = ((s % 5) - 2) * 170;
        const midX = (origin.x + target.x) / 2 + arcSpread * 0.45;
        const midY = Math.min(origin.y, target.y) - 190 + arcSpread * 0.85;

        const t = progress;
        const invT = 1 - t;
        const sx = invT * invT * origin.x + 2 * invT * t * midX + t * t * target.x;
        const sy = invT * invT * origin.y + 2 * invT * t * midY + t * t * target.y;

        const dx = 2 * invT * (midX - origin.x) + 2 * t * (target.x - midX);
        const dy = 2 * invT * (midY - origin.y) + 2 * t * (target.y - midY);
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);

        // Luminous trailing sword energy streak (additive glow ribbon)
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const trailLen = 160;
        const trailGrad = ctx.createLinearGradient(0, 0, -trailLen, 0);
        trailGrad.addColorStop(0, "rgba(90, 255, 210, 0.95)");
        trailGrad.addColorStop(0.35, "rgba(50, 210, 255, 0.6)");
        trailGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-trailLen, -6);
        ctx.lineTo(-trailLen, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Flying Jade Sword Blade
        ctx.shadowColor = s % 2 === 0 ? "#00ffcc" : "#ffd700";
        ctx.shadowBlur = 22;
        ctx.fillStyle = s % 2 === 0 ? "#70ffcc" : "#fffaaa";
        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.lineTo(12, -5.5);
        ctx.lineTo(-28, -4.5);
        ctx.lineTo(-28, 4.5);
        ctx.lineTo(12, 5.5);
        ctx.closePath();
        ctx.fill();

        // Sword core spine
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-22, -1.5, 45, 3);

        // Gold Hilt guard
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(-28, -10, 6, 20);

        ctx.restore();
      }

      // Target sparks appear when swords arrive
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#33ffcc";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#ffffff";
      const sparkCount = (swordStream.elapsedMs ?? 0) >= (swordStream.travelMs ?? 1000) * 0.7 ? 16 : 0;
      for (let k = 0; k < sparkCount; k++) {
        const sparkAngle = (k / sparkCount) * Math.PI * 2 + timeMs * 0.012;
        const dist = 30 + Math.sin(timeMs * 0.02 + k) * 20;
        const spkX = Math.cos(sparkAngle) * dist;
        const spy = Math.sin(sparkAngle) * dist;
        const sparkR = 2.2 + (k % 3) * 1.0;
        ctx.beginPath();
        ctx.arc(spkX, spy, sparkR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
    }

    // 3. Crescent Slash Wave VFX (破空月牙剑气波)
    const slashWave = stage.userData.slashWave as
      | { active: boolean; originX: number; originY: number; targetX: number; targetY: number; progress: number; direction: number; color: string }
      | undefined;
    if (slashWave && slashWave.active && slashWave.progress >= 0 && slashWave.progress <= 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const origin = this.projectWorldToScreen(stage, slashWave.originX, slashWave.originY);
      const target = this.projectWorldToScreen(stage, slashWave.targetX, slashWave.targetY);
      const t = Math.max(0, Math.min(1, slashWave.progress));
      const curX = origin.x + (target.x - origin.x) * t;
      const curY = origin.y + (target.y - origin.y) * t;

      ctx.translate(curX, curY);
      if (slashWave.direction < 0) ctx.scale(-1, 1);

      const waveRadius = 140 * (0.8 + t * 0.4);
      const waveGrad = ctx.createRadialGradient(0, 0, waveRadius * 0.6, 0, 0, waveRadius);
      waveGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      waveGrad.addColorStop(0.3, slashWave.color || "#00ffaa");
      waveGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.shadowColor = slashWave.color || "#00ffaa";
      ctx.shadowBlur = 35;
      ctx.strokeStyle = waveGrad;
      ctx.lineWidth = 22 * (1 - t * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, -Math.PI * 0.42, Math.PI * 0.42, false);
      ctx.stroke();

      // Razor-sharp white crest
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius + 3, -Math.PI * 0.32, Math.PI * 0.32, false);
      ctx.stroke();

      // Trailing blade sparks
      ctx.fillStyle = "#ffffff";
      for (let s = 0; s < 8; s++) {
        const ang = -Math.PI * 0.35 + s * 0.1;
        const spx = Math.cos(ang) * (waveRadius - 15);
        const spy = Math.sin(ang) * (waveRadius - 15);
        ctx.beginPath();
        ctx.arc(spx, spy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    const layer = stage.layers.getLayer("vfx");
    if (!layer || !layer.visible) return;

    ctx.save();
    layer.traverse((obj) => {
      // Screen Flash Quad (pure additive high-exposure bloom)
      if (obj.name === "ScreenFlashQuad" && obj instanceof THREE.Mesh && obj.visible) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        if (mat.opacity > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          const hex = mat.color.getHexString();
          ctx.fillStyle = `#${hex}`;
          ctx.globalAlpha = Math.min(1.0, mat.opacity);
          ctx.fillRect(0, 0, this.width, this.height);
          ctx.restore();
        }
      }

      // Lightning lines
      if (obj instanceof THREE.LineSegments && obj.visible) {
        const geo = obj.geometry;
        const posAttr = geo.getAttribute("position");
        if (posAttr && posAttr.count > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "#cc99ff";
          ctx.shadowColor = "#8822ff";
          ctx.shadowBlur = 28;
          ctx.lineWidth = 8;
          ctx.beginPath();
          for (let i = 0; i < posAttr.count; i += 2) {
            const p1 = this.projectWorldToScreen(stage, posAttr.getX(i), posAttr.getY(i));
            const p2 = this.projectWorldToScreen(stage, posAttr.getX(i + 1), posAttr.getY(i + 1));
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // Particle Points (filtered and softly blended)
      if (obj instanceof THREE.Points && obj.visible) {
        const geo = obj.geometry;
        const posAttr = geo.getAttribute("position");
        const colAttr = geo.getAttribute("color");
        if (posAttr && posAttr.count > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < posAttr.count; i++) {
            const z = posAttr.getZ(i);
            // Ignore inactive particles in pool
            if (z < -500) continue;
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            if (colAttr) {
              const r = colAttr.getX(i);
              const g = colAttr.getY(i);
              const b = colAttr.getZ(i);
              if (r === 0 && g === 0 && b === 0) continue;
              ctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
              ctx.shadowColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
            } else {
              if (x === 0 && y === 0 && z === 0) continue;
              ctx.fillStyle = "#33ffcc";
              ctx.shadowColor = "#00ffaa";
            }
            ctx.shadowBlur = 12;
            const pt = this.projectWorldToScreen(stage, x, y);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    });
    ctx.restore();
  }

  private renderSubtitlesLayer(stage: ThreeStage, ctx: SKRSContext2D): void {
    const activeSub = stage.userData.activeSubtitle as
      | { text: string; style?: string; speakerName?: string; popScale?: number }
      | undefined;
    if (activeSub && activeSub.text) {
      this.renderCalligraphySubtitle(ctx, activeSub.text, activeSub.style, activeSub.speakerName, activeSub.popScale);
      return;
    }

    const layer = stage.layers.getLayer("subtitles");
    if (!layer || !layer.visible) return;

    ctx.save();
    layer.traverse((obj) => {
      if (obj.name === "CalligraphySubtitleMesh" && obj instanceof THREE.Mesh && obj.visible) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        if (mat.map && mat.map.image) {
          const img = (mat.map as any).image;
          if (img.data && img.width && img.height) {
            const subW = Math.min(this.width * 0.92, 1000);
            const subH = (subW / img.width) * img.height;

            const worldPos = new THREE.Vector3();
            obj.getWorldPosition(worldPos);
            const { x: sx, y: sy } = this.projectWorldToScreen(stage, worldPos.x, worldPos.y);

            const subCanvas = createCanvas(img.width, img.height);
            const subCtx = subCanvas.getContext("2d");
            const imgData = subCtx.createImageData(img.width, img.height);
            imgData.data.set(img.data);
            subCtx.putImageData(imgData, 0, 0);

            ctx.drawImage(subCanvas, sx - subW / 2, sy - subH / 2, subW, subH);
          }
        }
      }
    });
    ctx.restore();
  }

  private splitSubtitleLines(fullText: string, maxCharsPerLine = 16): string[] {
    if (fullText.length <= maxCharsPerLine) {
      return [fullText];
    }

    const parts: string[] = [];
    let buffer = "";
    for (let i = 0; i < fullText.length; i++) {
      const ch = fullText[i];
      buffer += ch;
      if ("，,！!？?。；;\n".includes(ch)) {
        parts.push(buffer);
        buffer = "";
      }
    }
    if (buffer) {
      parts.push(buffer);
    }

    const lines: string[] = [];
    let current = "";
    for (const part of parts) {
      if (!current) {
        current = part;
      } else if (current.length + part.length <= maxCharsPerLine + 2) {
        current += part;
      } else {
        lines.push(current);
        current = part;
      }
    }
    if (current) {
      lines.push(current);
    }

    const result: string[] = [];
    for (const l of lines) {
      if (l.length <= maxCharsPerLine + 3) {
        result.push(l);
      } else {
        const mid = Math.ceil(l.length / 2);
        result.push(l.slice(0, mid));
        result.push(l.slice(mid));
      }
    }

    return result.length > 0 ? result : [fullText];
  }

  private renderCalligraphySubtitle(
    ctx: SKRSContext2D,
    text: string,
    style = "calligraphy_gold",
    speakerName?: string,
    popScale = 1.0
  ): void {
    const fullText = speakerName ? `【${speakerName}】${text}` : text;
    const w = this.width;
    const subY = Math.round(this.height * 0.88);
    let fontSize = Math.max(10, Math.round(this.height * (this.width > this.height ? 0.041 : 0.026) * (popScale || 1.0)));

    // Multi-line smart wrapping (wider in landscape)
    const maxChars = this.width >= 1600 ? 26 : 16;
    const lines = this.splitSubtitleLines(fullText, maxChars);

    // Measure and scale font size to fit within screen boundaries with generous margins
    const maxAvailableWidth = w * 0.88;
    ctx.save();
    ctx.font = `bold ${fontSize}px "MaShanZheng", sans-serif`;
    let maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (maxLineWidth > maxAvailableWidth) {
      const scale = maxAvailableWidth / maxLineWidth;
      fontSize = Math.max(10, Math.floor(fontSize * scale));
    }
    ctx.font = `bold ${fontSize}px "MaShanZheng", sans-serif`;
    maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.restore();

    const lineHeight = Math.round(fontSize * 1.35);
    const padding = this.height * 0.017;
    const boxH = lines.length * lineHeight + padding * 2;
    const boxW = Math.min(w * 0.94, maxLineWidth + padding * 4);

    // Subtitle card plate
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.roundRect((w - boxW) / 2, subY - boxH / 2, boxW, boxH, 10);
    ctx.fill();

    // Dynamic faction/style border
    let borderStroke = "rgba(255, 215, 0, 0.65)";
    if (style === "shout_red") {
      borderStroke = "rgba(255, 60, 60, 0.8)";
    } else if (speakerName?.includes("极阴") || speakerName?.includes("魔")) {
      borderStroke = "rgba(180, 50, 255, 0.75)";
    } else if (speakerName?.includes("韩立") || speakerName?.includes("云飞")) {
      borderStroke = "rgba(0, 255, 200, 0.75)";
    }
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Refined inner corner accents
    const bx = (w - boxW) / 2;
    const by = subY - boxH / 2;
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 1.5;
    const cornerLen = 12;
    ctx.beginPath();
    // top-left
    ctx.moveTo(bx + 4, by + 4 + cornerLen);
    ctx.lineTo(bx + 4, by + 4);
    ctx.lineTo(bx + 4 + cornerLen, by + 4);
    // top-right
    ctx.moveTo(bx + boxW - 4 - cornerLen, by + 4);
    ctx.lineTo(bx + boxW - 4, by + 4);
    ctx.lineTo(bx + boxW - 4, by + 4 + cornerLen);
    // bottom-left
    ctx.moveTo(bx + 4, by + boxH - 4 - cornerLen);
    ctx.lineTo(bx + 4, by + boxH - 4);
    ctx.lineTo(bx + 4 + cornerLen, by + boxH - 4);
    // bottom-right
    ctx.moveTo(bx + boxW - 4 - cornerLen, by + boxH - 4);
    ctx.lineTo(bx + boxW - 4, by + boxH - 4);
    ctx.lineTo(bx + boxW - 4, by + boxH - 4 - cornerLen);
    ctx.stroke();
    ctx.restore();

    // Render each line of text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = subY - ((lines.length - 1) * lineHeight) / 2 + i * lineHeight;

      // Text Shadow
      ctx.save();
      ctx.font = `bold ${fontSize}px "MaShanZheng", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 12;
      ctx.strokeText(line, w / 2, lineY);
      ctx.restore();

      // Thick outline
      ctx.save();
      ctx.font = `bold ${fontSize}px "MaShanZheng", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = style === "shout_red" ? "#2a0000" : "#1a0800";
      ctx.lineWidth = 10;
      ctx.strokeText(line, w / 2, lineY);

      // Gradient fill
      const textGrad = ctx.createLinearGradient(0, lineY - fontSize / 2, 0, lineY + fontSize / 2);
      if (style === "shout_red") {
        textGrad.addColorStop(0, "#FFAAAA");
        textGrad.addColorStop(0.4, "#FF2222");
        textGrad.addColorStop(1.0, "#990000");
      } else if (style === "narration_white") {
        textGrad.addColorStop(0, "#FFFFFF");
        textGrad.addColorStop(0.5, "#E6F0FA");
        textGrad.addColorStop(1.0, "#A0B8D0");
      } else {
        textGrad.addColorStop(0, "#FFFCE0");
        textGrad.addColorStop(0.35, "#FFD700");
        textGrad.addColorStop(1.0, "#FF8800");
      }

      ctx.fillStyle = textGrad;
      ctx.fillText(line, w / 2, lineY);
      ctx.restore();
    }
  }

  private renderForegroundAtmosphere(stage: ThreeStage, ctx: SKRSContext2D): void {
    const timeMs = (stage.userData.timeMs as number) ?? 0;
    const w = this.width;
    const h = this.height;

    ctx.save();
    // 1. Drifting foreground mist plumes (slow cinematic flow)
    ctx.globalCompositeOperation = "screen";
    for (let layer = 0; layer < 3; layer++) {
      const mistOffset = ((timeMs * (0.015 + layer * 0.01) + layer * 300) % (w * 1.6)) - w * 0.3;
      const mistY = h * (0.80 + layer * 0.07);
      const mistW = w * 0.8;
      const mistH = h * 0.26;

      const grad = ctx.createRadialGradient(
        mistOffset,
        mistY,
        mistH * 0.15,
        mistOffset,
        mistY,
        mistW * 0.55
      );
      const alpha = 0.06 + layer * 0.035;
      grad.addColorStop(0, `rgba(180, 225, 255, ${alpha})`);
      grad.addColorStop(0.6, `rgba(130, 190, 235, ${alpha * 0.45})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(mistOffset, mistY, mistW * 0.5, mistH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Out-of-focus floating foreground spiritual chi motes (bokeh)
    for (let i = 0; i < 18; i++) {
      const seed = i * 377.19;
      const cycle = ((timeMs * (0.02 + (i % 5) * 0.006) + seed) % (h * 1.25)) - h * 0.1;
      const px = ((seed * 23.7) % w + Math.sin(timeMs * 0.002 + i) * 40 + w) % w;
      const py = h - cycle;
      const radius = 5 + (i % 5) * 4;
      const alpha = (Math.sin(timeMs * 0.003 + i) * 0.5 + 0.5) * 0.16 + 0.05;

      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      pGrad.addColorStop(0, `rgba(230, 250, 255, ${alpha * 1.3})`);
      pGrad.addColorStop(0.4, `rgba(140, 220, 255, ${alpha * 0.7})`);
      pGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCinematicVignette(ctx: SKRSContext2D): void {
    const w = this.width;
    const h = this.height;
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, maxR * 0.45, cx, cy, maxR);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.7, "rgba(2, 5, 12, 0.25)");
    grad.addColorStop(1, "rgba(2, 5, 12, 0.68)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private renderMeshSprite(stage: ThreeStage, mesh: THREE.Mesh, ctx: SKRSContext2D): void {
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const { x: sx, y: sy, scaleFactor } = this.projectWorldToScreen(stage, worldPos.x, worldPos.y);

    const mat = mesh.material as THREE.MeshBasicMaterial;
    if (mat && mat.map) {
      this.renderTextureOntoCanvas(mat.map, ctx, sx, sy, 300 * scaleFactor, 300 * scaleFactor);
    }
  }

  public dispose(): void {
    this.spriteRasterizer.dispose();
    this.loadedImages.clear();
  }
}
