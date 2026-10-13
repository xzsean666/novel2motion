import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  buildCharacterPrompt,
  buildBackgroundPrompt,
  MockImageClient,
  onboardNewCharacter,
  onboardNewBackground
} from "../src/ai/index.js";
import { createDatabase, CharacterRegistry, BackgroundRegistry } from "../src/db/index.js";
import type { KVDB } from "kvdb-sdk";

describe("AI Image Generation & Asset Onboarding (TASK-107)", () => {
  let db: KVDB;
  let charRegistry: CharacterRegistry;
  let bgRegistry: BackgroundRegistry;
  let tempAssetsDir: string;

  beforeEach(async () => {
    db = createDatabase({ dbPath: ":memory:" });
    charRegistry = new CharacterRegistry(db);
    bgRegistry = new BackgroundRegistry(db);
    tempAssetsDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "n2m_test_assets_"));
  });

  afterEach(async () => {
    await db.close();
    await fs.promises.rm(tempAssetsDir, { recursive: true, force: true });
  });

  it("should synthesize prompts enforcing adult proportion and clean white backgrounds", () => {
    const charPrompt = buildCharacterPrompt({
      name: "万剑老祖",
      description: "身穿素白道袍，负手而立，周身万柄飞剑环绕",
      gender: "male"
    });

    expect(charPrompt).toContain("5.5 heads tall");
    expect(charPrompt).toContain("NOT chibi");
    expect(charPrompt).toContain("pure solid white background #FFFFFF");
    expect(charPrompt).toContain("万剑老祖");

    const bgPrompt = buildBackgroundPrompt({
      name: "九霄青云台",
      description: "悬浮在九天之上的巨大汉白玉演武台",
      timeOfDay: "Sunset"
    });

    expect(bgPrompt).toContain("九霄青云台");
    expect(bgPrompt).toContain("16:9 composition");
    expect(bgPrompt).toContain("Sunset");
  });

  it("should generate character, mat background, crop bbox, and onboard into CharacterRegistry", async () => {
    const mockClient = new MockImageClient();

    const profile = await onboardNewCharacter(
      {
        id: "char_wan_jian",
        name: "万剑老祖",
        description: "身穿素白道袍的元婴老祖",
        aliases: ["老祖", "万剑道友"],
        gender: "male"
      },
      mockClient,
      charRegistry,
      tempAssetsDir
    );

    expect(profile.id).toBe("char_wan_jian");
    expect(profile.name).toBe("万剑老祖");
    expect(profile.headProportion).toBe(5.5);
    expect(profile.memeFaces.length).toBe(1);

    // Verify file created on disk
    const savedFile = profile.memeFaces[0].assetPath;
    expect(fs.existsSync(savedFile)).toBe(true);

    // Verify registry lookup
    const retrieved = await charRegistry.findByNameOrAlias("万剑老祖");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("char_wan_jian");

    const byAlias = await charRegistry.findByNameOrAlias("万剑道友");
    expect(byAlias?.id).toBe("char_wan_jian");
  });

  it("should generate background and onboard into BackgroundRegistry", async () => {
    const mockClient = new MockImageClient();

    const bgAsset = await onboardNewBackground(
      {
        id: "bg_cloud_platform",
        name: "九霄青云台",
        description: "九天汉白玉道台",
        tags: ["cloud", "platform", "sect"],
        environment: "sect"
      },
      mockClient,
      bgRegistry,
      tempAssetsDir
    );

    expect(bgAsset.id).toBe("bg_cloud_platform");
    expect(bgAsset.layers.length).toBe(1);

    const savedFile = bgAsset.layers[0].assetPath;
    expect(fs.existsSync(savedFile)).toBe(true);

    const retrieved = await bgRegistry.get("bg_cloud_platform");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("九霄青云台");
  });
});
