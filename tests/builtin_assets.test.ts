import { describe, it, expect } from "vitest";
import {
  loadAssetManifest,
  validateAssetFiles,
  initializeBuiltinAssets
} from "../src/assets/index.js";
import { createDatabase, CharacterRegistry, BackgroundRegistry } from "../src/db/index.js";

describe("Built-in Media Assets & Loader (TASK-105)", () => {
  it("should load and parse real assets/manifest.json", async () => {
    const manifest = await loadAssetManifest("assets/manifest.json");

    expect(manifest.project_id).toBe("builtin_pack_default");
    expect(manifest.characters.length).toBeGreaterThanOrEqual(5);
    expect(manifest.backgrounds.length).toBeGreaterThanOrEqual(7);
    expect(manifest.bgm_library.length).toBeGreaterThanOrEqual(5);
    expect(manifest.combat_sfx_library.length).toBeGreaterThanOrEqual(9);
  });

  it("should validate that all manifest media files exist on disk", async () => {
    const manifest = await loadAssetManifest("assets/manifest.json");
    const validation = await validateAssetFiles(manifest, "assets");

    expect(validation.missing).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("should populate database registries and enable character and background lookups", async () => {
    const db = createDatabase({ dbPath: ":memory:" });
    const { stats } = await initializeBuiltinAssets(db, "assets");

    expect(stats.charactersLoaded).toBeGreaterThanOrEqual(5);
    expect(stats.backgroundsLoaded).toBeGreaterThanOrEqual(7);

    const charRegistry = new CharacterRegistry(db);
    const bgRegistry = new BackgroundRegistry(db);

    // Query Han Tianzun by ID, Name, and Aliases
    const han = await charRegistry.get("char_han_tianzun");
    expect(han).not.toBeNull();
    expect(han?.name).toBe("韩天尊");
    expect(han?.memeFaces.length).toBeGreaterThan(0);

    const hanByAlias1 = await charRegistry.findByNameOrAlias("韩立");
    expect(hanByAlias1?.id).toBe("char_han_tianzun");

    const hanByAlias2 = await charRegistry.findByNameOrAlias("韩老魔");
    expect(hanByAlias2?.id).toBe("char_han_tianzun");

    // Query Evil Lord by Alias
    const evil = await charRegistry.findByNameOrAlias("极阴祖师");
    expect(evil?.id).toBe("char_evil_lord");

    // Query Xianxia background by tag
    const xianxiaBgs = await bgRegistry.findByTags(["xianxia"]);
    expect(xianxiaBgs.length).toBeGreaterThan(0);
    expect(xianxiaBgs[0].id).toBe("bg_xianxia_thunder");

    await db.close();
  });
});
