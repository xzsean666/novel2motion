import fs from "node:fs";
import path from "node:path";
import type { KVDB } from "kvdb-sdk";
import {
  AssetManifest,
  AssetManifestSchema,
  ManifestCharacter,
  ManifestBackground
} from "./manifest-schema.js";
import { CharacterRegistry } from "../db/character-registry.js";
import { BackgroundRegistry } from "../db/background-registry.js";
import type { CharacterProfile, MemeFace } from "../core/models/character.js";
import type { BackgroundAsset } from "../core/models/background.js";

/**
 * Loads and validates manifest.json from disk.
 */
export async function loadAssetManifest(manifestPath: string): Promise<AssetManifest> {
  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Asset manifest not found at: ${resolvedPath}`);
  }

  const rawJson = await fs.promises.readFile(resolvedPath, "utf-8");
  const parsed = JSON.parse(rawJson);
  return AssetManifestSchema.parse(parsed);
}

/**
 * Validates that all files listed in the manifest actually exist on disk.
 */
export async function validateAssetFiles(
  manifest: AssetManifest,
  assetsDir: string
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];
  const baseDir = path.resolve(assetsDir);

  // Check character expressions
  for (const char of manifest.characters) {
    for (const [exprName, relPath] of Object.entries(char.visual_assets.expressions)) {
      const fullPath = path.join(baseDir, relPath);
      if (!fs.existsSync(fullPath)) {
        missing.push(`Character ${char.id} expression ${exprName}: ${fullPath}`);
      }
    }
  }

  // Check backgrounds
  for (const bg of manifest.backgrounds) {
    const fullPath = path.join(baseDir, bg.file_path);
    if (!fs.existsSync(fullPath)) {
      missing.push(`Background ${bg.id}: ${fullPath}`);
    }
  }

  // Check BGM
  for (const bgm of manifest.bgm_library) {
    const fullPath = path.join(baseDir, bgm.file_path);
    if (!fs.existsSync(fullPath)) {
      missing.push(`BGM ${bgm.id}: ${fullPath}`);
    }
  }

  // Check SFX
  for (const sfx of manifest.combat_sfx_library) {
    const fullPath = path.join(baseDir, sfx.file_path);
    if (!fs.existsSync(fullPath)) {
      missing.push(`SFX ${sfx.id}: ${fullPath}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Maps a ManifestCharacter to the core CharacterProfile model.
 */
export function convertManifestCharacter(
  char: ManifestCharacter,
  assetsDir: string
): CharacterProfile {
  const memeFaces: MemeFace[] = [];

  for (const [exprKey, relPath] of Object.entries(char.visual_assets.expressions)) {
    const lowerKey = exprKey.toLowerCase();
    let exprType: MemeFace["expression"] = "normal";
    if (lowerKey.includes("shock")) exprType = "shocked";
    else if (lowerKey.includes("angr")) exprType = "angry";
    else if (lowerKey.includes("smug") || lowerKey.includes("happ")) exprType = "smug";
    else if (lowerKey.includes("battl")) exprType = "battle";
    else if (lowerKey.includes("hurt") || lowerKey.includes("crying")) exprType = "crying";
    else if (lowerKey.includes("sweat")) exprType = "sweat";

    memeFaces.push({
      id: lowerKey,
      name: exprKey,
      expression: exprType,
      assetPath: path.join(assetsDir, relPath),
      anchorX: char.visual_assets.anchor_x,
      anchorY: char.visual_assets.anchor_y,
      scale: char.visual_assets.default_scale
    });
  }

  return {
    id: char.id,
    name: char.name,
    aliases: char.aliases,
    gender: char.gender,
    bodyType: "adult_swordsman",
    headProportion: 5.5,
    description: char.description,
    roleScope: char.role_scope ?? "exclusive",
    applicableDramas: char.applicable_dramas ?? [],
    voiceConfig: {
      voiceId: char.voice_config.voice_id,
      rate: char.voice_config.speed,
      pitch: char.voice_config.pitch,
      volume: 1.0
    },
    defaultMemeFaceId: "normal",
    memeFaces,
    parts: [],
    metadata: {
      isPinned: char.is_pinned
    }
  };
}

/**
 * Maps a ManifestBackground to the core BackgroundAsset model.
 */
export function convertManifestBackground(
  bg: ManifestBackground,
  assetsDir: string
): BackgroundAsset {
  let env: BackgroundAsset["environment"] = "thunder_realm";
  if (bg.tags.includes("forest")) env = "void";
  else if (bg.tags.includes("sect") || bg.tags.includes("dojo")) env = "sect";
  else if (bg.tags.includes("office") || bg.tags.includes("street")) env = "palace";

  return {
    id: bg.id,
    name: bg.name,
    tags: bg.tags,
    environment: env,
    layers: [
      {
        layerId: "main_layer",
        name: bg.name,
        assetPath: path.join(assetsDir, bg.file_path),
        depthZ: -100,
        parallaxFactor: 0.1,
        scrollSpeedX: 0,
        scrollSpeedY: 0,
        opacity: 1.0,
        blendMode: "normal"
      }
    ],
    safeArea: {
      baselineY: bg.safe_area.baseline_y * 1000 - 500,
      minX: -800,
      maxX: 800,
      minY: -400,
      maxY: 400
    },
    ambientColor: "#1a1236",
    metadata: {
      timeOfDay: bg.time_of_day
    }
  };
}

/**
 * Loads the manifest, validates file existence, and populates the database registries.
 */
export async function initializeBuiltinAssets(
  db: KVDB,
  assetsDir = "assets"
): Promise<{
  manifest: AssetManifest;
  stats: { charactersLoaded: number; backgroundsLoaded: number };
}> {
  const manifestPath = path.join(assetsDir, "manifest.json");
  const manifest = await loadAssetManifest(manifestPath);

  const charRegistry = new CharacterRegistry(db);
  const bgRegistry = new BackgroundRegistry(db);

  let charactersLoaded = 0;
  for (const mc of manifest.characters) {
    const profile = convertManifestCharacter(mc, assetsDir);
    await charRegistry.register(profile);
    charactersLoaded++;
  }

  let backgroundsLoaded = 0;
  for (const mbg of manifest.backgrounds) {
    const bg = convertManifestBackground(mbg, assetsDir);
    await bgRegistry.register(bg);
    backgroundsLoaded++;
  }

  return {
    manifest,
    stats: {
      charactersLoaded,
      backgroundsLoaded
    }
  };
}
