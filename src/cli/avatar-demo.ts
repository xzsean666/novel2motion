import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { StreamEncoder } from "../renderer/stream-encoder.js";
import { Simple3DRasterizer } from "../engine/model3d/rasterizer-3d.js";
import { UniversalAvatar3D } from "../engine/model3d/universal-avatar-3d.js";
import { PRESET_HAN_LI, PRESET_ZI_LING } from "../engine/puppet/avatar/preset-avatars.js";

const width = 960;
const height = 540;
const fps = 24;
const durationMs = 9000;
const outputPath = path.resolve("output/universal_avatar_demo.mp4");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#080d1e");
const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
camera.position.set(0, 1.02, 5.4);
camera.lookAt(0, 0.92, 0);
camera.updateProjectionMatrix();

const han = new UniversalAvatar3D({
  spec: PRESET_HAN_LI,
  facing: "right",
  timeline: {
    characterId: PRESET_HAN_LI.id,
    commands: [
      { id: "han-talk", type: "speak", at: 700, duration: 2200, text: "道友，接我这一剑。" },
      { id: "han-cast", type: "play", at: 3200, duration: 1800, clip: "cast", layer: "fullBody" },
      { id: "han-slash", type: "play", at: 5400, duration: 900, clip: "slash_strike", layer: "fullBody" },
      { id: "han-battle", type: "expression", at: 3100, duration: 3300, name: "battle", weight: 1 }
    ]
  }
});
han.root.position.set(-0.85, 0, 0);
han.root.scale.multiplyScalar(1.12);

const ziLing = new UniversalAvatar3D({
  spec: PRESET_ZI_LING,
  facing: "left",
  timeline: {
    characterId: PRESET_ZI_LING.id,
    commands: [
      { id: "zi-look", type: "lookAt", at: 0, duration: 900, target: "char_han_li", weight: 0.8 },
      { id: "zi-talk", type: "speak", at: 3500, duration: 1900, text: "剑起，风雪入阵。" },
      { id: "zi-attack", type: "play", at: 5850, duration: 1000, clip: "attack", layer: "fullBody" },
      { id: "zi-happy", type: "expression", at: 0, duration: 2800, name: "happy", weight: 0.7 },
      { id: "zi-battle", type: "expression", at: 3000, duration: 5000, name: "battle", weight: 1 }
    ]
  }
});
ziLing.root.position.set(0.85, 0, 0);
ziLing.root.scale.multiplyScalar(1.08);

scene.add(han.root, ziLing.root);

const rasterizer = new Simple3DRasterizer();
const encoder = new StreamEncoder({ outputPath, width, height, fps, crf: 20 });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

function drawBackground(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, timeMs: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#071126");
  sky.addColorStop(0.62, "#162b4b");
  sky.addColorStop(1, "#050812");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 18; i++) {
    const x = (i * 83 + Math.sin(timeMs * 0.0004 + i) * 18 + width) % width;
    const y = 70 + ((i * 47) % 300);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16 + (i % 4) * 6);
    glow.addColorStop(0, i % 3 === 0 ? "rgba(255,215,120,.8)" : "rgba(100,220,255,.7)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 30, 60, 60);
  }
  ctx.restore();

  const ground = ctx.createLinearGradient(0, height * 0.72, 0, height);
  ground.addColorStop(0, "rgba(24,49,69,.1)");
  ground.addColorStop(1, "rgba(2,5,14,.96)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  ctx.fillStyle = "rgba(220,240,255,.92)";
  ctx.font = "600 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("UNIVERSAL AVATAR / THREE.JS", width / 2, 36);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(180,205,230,.78)";
  ctx.fillText("JSON character recipe  ·  shared rig  ·  command-driven motion", width / 2, 61);
}

async function main(): Promise<void> {
  encoder.start();
  try {
    const totalFrames = Math.ceil((durationMs / 1000) * fps);
    for (let frame = 0; frame < totalFrames; frame++) {
      const timeMs = frame * 1000 / fps;
      han.update(timeMs, 1000 / fps);
      ziLing.update(timeMs, 1000 / fps);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);

      const avatarPng = rasterizer.renderScene(scene, camera, width, height, {
        enableOutlines: true,
        rimIntensity: 0.72,
        ambientIntensity: 0.5,
        rimColor: "rgba(130, 225, 255, .56)"
      });
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      drawBackground(ctx, timeMs);
      const image = await loadImage(avatarPng);
      ctx.drawImage(image, 0, 0, width, height);
      ctx.fillStyle = "rgba(4,8,20,.72)";
      ctx.fillRect(18, height - 42, width - 36, 24);
      ctx.fillStyle = "#9de9ff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("韩立  ·  male_adult  ·  cyan sword", 30, height - 25);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e5c6ff";
      ctx.fillText("紫菱仙子  ·  female_adult  ·  ice blade", width - 30, height - 25);
      const data = ctx.getImageData(0, 0, width, height).data;
      await encoder.writeFrame(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    }
    await encoder.finish();
    console.log(`Wrote ${outputPath}`);
  } catch (error) {
    encoder.kill();
    throw error;
  }
}

await main();
