import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createDatabase } from "../src/db/connection.js";
import { ProjectStore } from "../src/db/project-store.js";
import { CharacterRegistry } from "../src/db/character-registry.js";
import { BackgroundRegistry } from "../src/db/background-registry.js";
import { ProjectPackager } from "../src/core/project-packager.js";
import { packTarGz, unpackTarGz } from "../src/core/archive.js";
import type { KVDB } from "kvdb-sdk";
import type { StoryPlan } from "../src/core/models/dsl.js";

describe("Single-File Project Archive (.n2m) (TASK-119)", () => {
  let tempDir: string;
  let db1: KVDB;
  let db2: KVDB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_archive_test_"));
    const db1Path = path.join(tempDir, "source.db");
    const db2Path = path.join(tempDir, "target.db");
    db1 = createDatabase({ dbPath: db1Path });
    db2 = createDatabase({ dbPath: db2Path });
  });

  afterEach(async () => {
    if (db1) await db1.close();
    if (db2) await db2.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should pack and unpack in-memory tar.gz archives cleanly", () => {
    const entries = [
      { name: "hello.txt", data: Buffer.from("Hello Cultivation World!") },
      { name: "nested/data.json", data: Buffer.from(JSON.stringify({ magic: 42 })) }
    ];

    const compressed = packTarGz(entries);
    expect(compressed.length).toBeGreaterThan(0);

    const unpacked = unpackTarGz(compressed);
    expect(unpacked.length).toBe(2);
    expect(unpacked[0].name).toBe("hello.txt");
    expect(unpacked[0].data.toString("utf8")).toBe("Hello Cultivation World!");
    expect(unpacked[1].name).toBe("nested/data.json");
    expect(JSON.parse(unpacked[1].data.toString("utf8"))).toEqual({ magic: 42 });
  });

  it("should export project from database to .n2m and import into a new database", async () => {
    // 1. Prepare sample assets in tempDir
    const dummyAssetDir = path.join(tempDir, "assets");
    fs.mkdirSync(dummyAssetDir, { recursive: true });

    const bgImagePath = path.join(dummyAssetDir, "kunlun.png");
    fs.writeFileSync(bgImagePath, "PNG_MOCK_IMAGE_DATA_KUNLUN");

    const charSpritePath = path.join(dummyAssetDir, "han_li.png");
    fs.writeFileSync(charSpritePath, "PNG_MOCK_IMAGE_DATA_HAN_LI");

    // 2. Setup database 1 with project, character, and background
    const charRegistry1 = new CharacterRegistry(db1);
    await charRegistry1.register({
      id: "char_han_li",
      name: "韩立",
      aliases: ["韩老魔", "韩天尊"],
      gender: "male",
      bodyType: "adult_cultivator",
      headProportion: 5.5,
      description: "身着青色道袍，眼神清冷深邃",
      voiceConfig: {
        voiceId: "zh-CN-YunxiNeural",
        rate: 1.0,
        pitch: 0
      },
      memeFaces: [
        {
          id: "face_normal",
          name: "平静",
          expression: "normal",
          assetPath: charSpritePath
        }
      ],
      parts: [
        {
          partId: "body_robe",
          partType: "body",
          assetPath: charSpritePath
        }
      ]
    });

    const bgRegistry1 = new BackgroundRegistry(db1);
    await bgRegistry1.register({
      id: "bg_kunlun",
      name: "昆仑之巅",
      environment: "thunder_realm",
      tags: ["snow", "battle"],
      layers: [
        {
          layerId: "sky_layer",
          name: "Thunder Sky",
          assetPath: bgImagePath,
          depthZ: -500,
          parallaxFactor: 0.1
        }
      ]
    });

    const projectStore1 = new ProjectStore(db1);
    const storyPlan: StoryPlan = {
      storyId: "story_test_001",
      metadata: {},
      title: "凡人问仙录 第一回",
      characters: ["char_han_li"],
      scenes: [
        {
          sceneId: "scene_1",
          title: "Archive test scene",
          bgmId: "bgm_tense_suspense",
          bgmVolume: 0.35,
          backgroundId: "bg_kunlun",
          initialStaging: [
            {
              characterId: "char_han_li",
              slot: "center",
              scale: 1.0,
              facing: "right",
              initialMemeFace: "normal",
              floatAnimation: true
            }
          ],
          events: [
            {
              type: "dialogue",
              speakerId: "char_han_li",
              text: "厉道友，此去何为？",
              memeFace: "normal",
              subtitleStyle: "calligraphy_gold",
              durationMs: 1200
            }
          ]
        }
      ]
    };
    await projectStore1.saveProject(storyPlan, "planned");

    // 3. Export to .n2m archive
    const exportFile = path.join(tempDir, "story_test_001.n2m");
    const exportedPath = await ProjectPackager.exportProject({
      projectId: "story_test_001",
      outputPath: exportFile,
      db: db1
    });

    expect(fs.existsSync(exportedPath)).toBe(true);
    expect(fs.statSync(exportedPath).size).toBeGreaterThan(100);

    // 4. Import into empty database 2
    const restoreAssetDir = path.join(tempDir, "restored_assets");
    const importResult = await ProjectPackager.importProject({
      n2mFilePath: exportedPath,
      db: db2,
      assetDestDir: restoreAssetDir
    });

    expect(importResult.projectId).toBe("story_test_001");
    expect(importResult.characterCount).toBe(1);
    expect(importResult.backgroundCount).toBe(1);
    expect(importResult.assetFileCount).toBeGreaterThanOrEqual(2);

    // 5. Verify restored database 2 contents
    const projectStore2 = new ProjectStore(db2);
    const charRegistry2 = new CharacterRegistry(db2);
    const bgRegistry2 = new BackgroundRegistry(db2);

    const restoredProject = await projectStore2.getProject("story_test_001");
    expect(restoredProject).not.toBeNull();
    expect(restoredProject!.plan.title).toBe("凡人问仙录 第一回");
    expect(restoredProject!.plan.scenes.length).toBe(1);

    const restoredChar = await charRegistry2.get("char_han_li");
    expect(restoredChar).not.toBeNull();
    expect(restoredChar!.name).toBe("韩立");

    const restoredBg = await bgRegistry2.get("bg_kunlun");
    expect(restoredBg).not.toBeNull();
    expect(restoredBg!.name).toBe("昆仑之巅");

    // Verify extracted files exist on disk
    expect(fs.existsSync(path.join(restoreAssetDir, "backgrounds/kunlun.png"))).toBe(true);
    expect(fs.existsSync(path.join(restoreAssetDir, "characters/han_li.png"))).toBe(true);
  });
});
