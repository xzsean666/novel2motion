import fs from "node:fs";
import path from "node:path";
import { ImageClient } from "./image-client.js";
import { buildCharacterPrompt, buildBackgroundPrompt } from "./prompt-synthesizer.js";
import { MattingPipeline } from "../assets/matting-service.js";
import { CharacterRegistry } from "../db/character-registry.js";
import { BackgroundRegistry } from "../db/background-registry.js";
import type { CharacterProfile } from "../core/models/character.js";
import type { BackgroundAsset } from "../core/models/background.js";

export interface OnboardCharacterInput {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
  gender?: "male" | "female" | "creature" | "unknown";
  voiceId?: string;
}

export interface OnboardBackgroundInput {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  environment?: BackgroundAsset["environment"];
  timeOfDay?: string;
}

/**
 * Automatically generates a new character sprite using AI, removes background,
 * crops to bounding box, saves to assets, and registers into the CharacterRegistry.
 */
export async function onboardNewCharacter(
  input: OnboardCharacterInput,
  client: ImageClient,
  registry: CharacterRegistry,
  assetsDir = "assets"
): Promise<CharacterProfile> {
  const prompt = buildCharacterPrompt({
    name: input.name,
    description: input.description,
    gender: input.gender
  });

  // 1. Generate image from AI client
  const rawBuffer = await client.generate(prompt, "character");

  // 2. Process through MattingPipeline: perimeter flood-fill & bbox crop
  const processed = await MattingPipeline.processBuffer(rawBuffer, {
    matting: { targetColor: [255, 255, 255], tolerance: 20 },
    cropping: { padding: 8, anchorMode: "bottom_center" }
  });

  // 3. Save to disk under assets/characters/<id>/normal.png
  const charDir = path.join(assetsDir, "characters", input.id);
  await fs.promises.mkdir(charDir, { recursive: true });
  const assetPath = path.join(charDir, "normal.png");
  await fs.promises.writeFile(assetPath, processed.buffer);

  // 4. Create and register CharacterProfile
  const profile: CharacterProfile = {
    id: input.id,
    name: input.name,
    aliases: input.aliases ?? [],
    gender: input.gender ?? "male",
    bodyType: "adult_swordsman",
    headProportion: 5.5,
    description: input.description,
    roleScope: "exclusive",
    applicableDramas: [],
    voiceConfig: {
      voiceId: input.voiceId ?? "zh-CN-YunxiNeural",
      rate: 1.0,
      pitch: 0,
      volume: 1.0
    },
    defaultMemeFaceId: "normal",
    memeFaces: [
      {
        id: "normal",
        name: "正常",
        expression: "normal",
        assetPath,
        anchorX: processed.anchorX,
        anchorY: processed.anchorY,
        scale: 1.0
      }
    ],
    parts: [],
    metadata: {
      isAiGenerated: true,
      prompt
    }
  };

  await registry.register(profile);
  return profile;
}

/**
 * Automatically generates a new background using AI, saves to assets,
 * and registers into the BackgroundRegistry.
 */
export async function onboardNewBackground(
  input: OnboardBackgroundInput,
  client: ImageClient,
  registry: BackgroundRegistry,
  assetsDir = "assets"
): Promise<BackgroundAsset> {
  const prompt = buildBackgroundPrompt({
    name: input.name,
    description: input.description,
    environment: input.environment,
    timeOfDay: input.timeOfDay
  });

  // 1. Generate image from AI client
  const rawBuffer = await client.generate(prompt, "background");

  // 2. Save to disk under assets/backgrounds/<id>.png
  const bgDir = path.join(assetsDir, "backgrounds");
  await fs.promises.mkdir(bgDir, { recursive: true });
  const assetPath = path.join(bgDir, `${input.id}.png`);
  await fs.promises.writeFile(assetPath, rawBuffer);

  // 3. Create and register BackgroundAsset
  const bgAsset: BackgroundAsset = {
    id: input.id,
    name: input.name,
    tags: input.tags ?? ["custom", input.environment ?? "thunder_realm"],
    environment: input.environment ?? "thunder_realm",
    layers: [
      {
        layerId: "main",
        name: input.name,
        assetPath,
        depthZ: -100,
        parallaxFactor: 0.1,
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        opacity: 1.0,
        blendMode: "normal"
      }
    ],
    safeArea: {
      baselineY: 100,
      minX: -800,
      maxX: 800,
      minY: -400,
      maxY: 400
    },
    ambientColor: "#110a24",
    metadata: {
      isAiGenerated: true,
      prompt
    }
  };

  await registry.register(bgAsset);
  return bgAsset;
}
