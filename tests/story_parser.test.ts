import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StoryParser, CharacterBinder } from "../src/ai/index.js";
import { createDatabase, CharacterRegistry } from "../src/db/index.js";
import type { KVDB } from "kvdb-sdk";

describe("Story Parser & Character Entity Binding (TASK-108)", () => {
  let db: KVDB;
  let charRegistry: CharacterRegistry;
  let binder: CharacterBinder;
  let parser: StoryParser;

  beforeEach(async () => {
    db = createDatabase({ dbPath: ":memory:" });
    charRegistry = new CharacterRegistry(db);

    // Seed Han Tianzun & Evil Lord
    await charRegistry.register({
      id: "char_han_tianzun",
      name: "韩天尊",
      aliases: ["韩立", "天尊", "韩老魔"],
      gender: "male",
      description: "青竹蜂云剑修"
    });

    await charRegistry.register({
      id: "char_evil_lord",
      name: "魔道老祖",
      aliases: ["极阴祖师", "极阴", "魔尊"],
      gender: "male",
      description: "魔道元婴修士"
    });

    binder = new CharacterBinder(charRegistry);
    parser = new StoryParser(binder);
  });

  afterEach(async () => {
    await db.close();
  });

  it("binds combat actors in text order and recognizes slash and thunder", async () => {
    const chunks = await parser.parse("韩立挥出青竹蜂云剑，剑光直奔极阴祖师。\n极阴祖师召来雷霆，向韩立劈落。");
    expect(chunks[0].boundSpeakerId).toBe("char_han_tianzun");
    expect(chunks[0].boundTargetId).toBe("char_evil_lord");
    expect(chunks[0].actionKeywords).toContain("slash");
    expect(chunks[1].type).toBe("combat");
    expect(chunks[1].boundSpeakerId).toBe("char_evil_lord");
    expect(chunks[1].boundTargetId).toBe("char_han_tianzun");
    expect(chunks[1].actionKeywords).toContain("thunder");
  });

  it("should parse dialogues, narration, combat verbs and accurately bind characters", async () => {
    const novelText = `
乌云密布，天劫狂雷轰然落下。
魔道老祖厉声喝道：“韩立，今日便是你的死期！”
韩天尊嘴角微扬冷笑道：“雕虫小技，也敢口出狂言？”
刹那间，七十二柄青竹蜂云剑呼啸出鞘，万道剑光斩向老祖！
“怎么可能！这是什么神剑！？”
轰隆一声，魔道老祖被金雷重创，惨叫着倒飞出去！
`;

    const chunks = await parser.parse(novelText);
    expect(chunks.length).toBeGreaterThanOrEqual(6);

    // 1. Thunder combat intro
    const chunk1 = chunks[0];
    expect(chunk1.type).toBe("combat");
    expect(chunk1.actionKeywords).toContain("thunder");
    expect(chunk1.suggestedSfx).toBe("sfx_thunder_blast");

    // 2. Evil Lord Dialogue
    const chunk2 = chunks[1];
    expect(chunk2.type).toBe("dialogue");
    expect(chunk2.speakerRaw).toBe("魔道老祖");
    expect(chunk2.boundSpeakerId).toBe("char_evil_lord");
    expect(chunk2.suggestedMemeFace).toBe("angry");

    // 3. Han Tianzun Dialogue
    const chunk3 = chunks[2];
    expect(chunk3.type).toBe("dialogue");
    expect(chunk3.speakerRaw).toBe("韩天尊");
    expect(chunk3.boundSpeakerId).toBe("char_han_tianzun");
    expect(chunk3.suggestedMemeFace).toBe("smug");

    // 4. Sword barrage combat
    const chunk4 = chunks[3];
    expect(chunk4.type).toBe("combat");
    expect(chunk4.actionKeywords).toContain("sword");
    expect(chunk4.suggestedSfx).toBe("sfx_sword_slash");

    // 5. Alternate quote without speaker ("怎么可能！这是什么神剑！？")
    const chunk5 = chunks[4];
    expect(chunk5.type).toBe("dialogue");
    expect(chunk5.suggestedMemeFace).toBe("shocked");
    // Resolved back to Evil Lord as alternate speaker
    expect(chunk5.boundSpeakerId).toBe("char_evil_lord");

    // 6. Hit impact combat
    const chunk6 = chunks[5];
    expect(chunk6.type).toBe("combat");
    expect(chunk6.actionKeywords).toContain("hit");
  });
});
