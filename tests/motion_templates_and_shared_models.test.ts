import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import {
  MotionTemplateRegistry,
  type MotionTemplate
} from "../src/engine/puppet/action-template.js";
import { ActionController } from "../src/engine/puppet/action-controller.js";
import { createDatabase, CharacterRegistry } from "../src/db/index.js";
import { initializeBuiltinAssets } from "../src/assets/index.js";
import { CharacterBinder } from "../src/ai/character-binder.js";
import { StoryParser } from "../src/ai/story-parser.js";
import { AiDirector } from "../src/ai/ai-director.js";

describe("Universal Motion Template System (TASK-129)", () => {
  it("should have registered all standard motion templates across all categories", () => {
    const all = MotionTemplateRegistry.listAll();
    expect(all.length).toBeGreaterThanOrEqual(14);

    const baseActions = MotionTemplateRegistry.listByCategory("base");
    expect(baseActions.some((a) => a.id === "idle")).toBe(true);
    expect(baseActions.some((a) => a.id === "cruise")).toBe(true);
    expect(baseActions.some((a) => a.id === "walk_advance")).toBe(true);

    const dialogueActions = MotionTemplateRegistry.listByCategory("dialogue");
    expect(dialogueActions.some((a) => a.id === "talking")).toBe(true);
    expect(dialogueActions.some((a) => a.id === "talking_intense")).toBe(true);

    const combatActions = MotionTemplateRegistry.listByCategory("combat");
    expect(combatActions.some((a) => a.id === "attack_slash")).toBe(true);
    expect(combatActions.some((a) => a.id === "sword_barrage")).toBe(true);
    expect(combatActions.some((a) => a.id === "cast_spell")).toBe(true);
    expect(combatActions.some((a) => a.id === "defend_block")).toBe(true);
    expect(combatActions.some((a) => a.id === "hurt_flinch")).toBe(true);

    const emotionActions = MotionTemplateRegistry.listByCategory("emotion");
    expect(emotionActions.some((a) => a.id === "taunt_smug")).toBe(true);
    expect(emotionActions.some((a) => a.id === "shocked")).toBe(true);
    expect(emotionActions.some((a) => a.id === "bow_respect")).toBe(true);
  });

  it("should compute valid ActionPoses with rich kinematics for all templates", () => {
    const all = MotionTemplateRegistry.listAll();
    for (const t of all) {
      const poseStart = t.computePose(0, 0);
      const poseMid = t.computePose(0.5, 500);
      const poseEnd = t.computePose(1.0, 1000);

      expect(typeof poseStart.bodyOffsetY).toBe("number");
      expect(typeof poseMid.headRotationZ).toBe("number");
      expect(typeof poseEnd.armsRotationZ).toBe("number");
    }
  });

  it("should execute templates through ActionController seamlessly", () => {
    const ctrl = new ActionController();

    // 1. Play intense talking
    ctrl.playAction("talking_intense");
    expect(ctrl.getCurrentAction()).toBe("talking_intense");
    const poseTalk = ctrl.update(250);
    expect(poseTalk.gestureArmRotZ).toBeDefined();

    // 2. Play defend block
    ctrl.playAction("defend_block");
    expect(ctrl.getCurrentAction()).toBe("defend_block");
    const poseDef = ctrl.update(450);
    expect(poseDef.auraScale).toBeGreaterThan(1.0);

    // 3. Play salute bow
    ctrl.playAction("bow_respect");
    expect(ctrl.getCurrentAction()).toBe("bow_respect");
    const poseBow = ctrl.update(700);
    expect(poseBow.bodyRotationZ).toBeLessThan(0); // Bowing forward
  });
});

describe("Specialized & Shared Model Architecture (TASK-129)", () => {
  let registry: CharacterRegistry;

  beforeEach(async () => {
    const db = createDatabase({ dbPath: ":memory:" });
    registry = new CharacterRegistry(db);
    await initializeBuiltinAssets(db, "assets");
  });

  it("should distinguish drama-exclusive models from shared universal models", async () => {
    const shared = await registry.listShared();
    expect(shared.length).toBeGreaterThanOrEqual(2);
    expect(shared.some((c) => c.id === "char_common_disciple")).toBe(true);
    expect(shared.some((c) => c.id === "char_common_guard")).toBe(true);

    const exclusive = await registry.listExclusive();
    expect(exclusive.some((c) => c.id === "char_han_tianzun")).toBe(true);
    expect(exclusive.some((c) => c.id === "char_evil_lord")).toBe(true);
    expect(exclusive.some((c) => c.id === "char_hero_m")).toBe(true);
  });

  it("should allow both shared and exclusive models to bind speakers from novel text", async () => {
    const binder = new CharacterBinder(registry);
    const parser = new StoryParser(binder);

    // Xianxia drama snippet with shared disciple and exclusive Han Li
    const text = `
正道弟子急呼道：“韩师兄小心，魔头杀来了！”
韩立冷笑道：“无妨，看我斩他。”
`;
    const chunks = await parser.parse(text);
    expect(chunks.length).toBe(2);
    expect(chunks[0].boundSpeakerId).toBe("char_common_disciple");
    expect(chunks[1].boundSpeakerId).toBe("char_han_tianzun");
  });
});

describe("Multi-Drama Quality Pipeline (TASK-129)", () => {
  let registry: CharacterRegistry;
  let binder: CharacterBinder;
  let parser: StoryParser;
  let director: AiDirector;

  beforeEach(async () => {
    const db = createDatabase({ dbPath: ":memory:" });
    registry = new CharacterRegistry(db);
    await initializeBuiltinAssets(db, "assets");
    binder = new CharacterBinder(registry);
    parser = new StoryParser(binder);
    director = new AiDirector();
  });

  it("should parse and direct Xianxia drama without satirical elements", async () => {
    const xianxiaText = fs.readFileSync("examples/drama_xianxia_battle.txt", "utf-8");
    const chunks = await parser.parse(xianxiaText);
    expect(chunks.length).toBeGreaterThanOrEqual(8);

    const plan = director.direct(chunks, { title: "青云仙劫·凡人问天" });
    expect(plan.scenes.length).toBeGreaterThanOrEqual(3);

    // Verify background adaptation: peak, bamboo, thunder
    const bgIds = plan.scenes.map((s) => s.backgroundId);
    expect(bgIds.some((id) => id.includes("peak") || id.includes("bamboo"))).toBe(true);
  });

  it("should parse and direct Urban Warrior drama with modern street background", async () => {
    const urbanText = fs.readFileSync("examples/drama_urban_warrior.txt", "utf-8");
    const chunks = await parser.parse(urbanText);
    expect(chunks.length).toBeGreaterThanOrEqual(8);

    const plan = director.direct(chunks, { title: "潜龙出渊·战神降临" });
    expect(plan.scenes.length).toBeGreaterThanOrEqual(3);

    // Verify urban setting detection
    const bgIds = plan.scenes.map((s) => s.backgroundId);
    expect(bgIds.some((id) => id === "bg_street" || id === "bg_office_night" || id === "bg_dojo")).toBe(true);
  });

  it("should parse and direct Sect Defense drama with multiple allies", async () => {
    const sectText = fs.readFileSync("examples/drama_sect_defense.txt", "utf-8");
    const chunks = await parser.parse(sectText);
    expect(chunks.length).toBeGreaterThanOrEqual(8);

    const plan = director.direct(chunks, { title: "昆仑问剑·万仙归宗" });
    expect(plan.scenes.length).toBeGreaterThanOrEqual(3);
    expect(plan.characters).toContain("char_hero_f");
  });
});
