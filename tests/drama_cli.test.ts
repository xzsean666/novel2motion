import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createCliProgram } from "../src/cli/index.js";

describe("Drama CLI Commands (TASK-130)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_cli_drama_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const novelText = `第1章 仙尊归来
万剑宗大殿之上，宗主拍案而起：“陆沉，你勾结魔宗，罪不容诛！”
陆沉拂袖冷笑：“跳梁小丑，也敢妄断本尊是非？”
雷鸣电闪，苍穹失色！
`;

  it("should generate storyboard JSON via CLI storyboard command", async () => {
    const novelPath = path.join(tempDir, "story.txt");
    const jsonPath = path.join(tempDir, "storyboard.json");
    fs.writeFileSync(novelPath, novelText, "utf8");

    const program = createCliProgram();
    await program.parseAsync(["node", "novel2motion", "storyboard", novelPath, "-o", jsonPath]);

    expect(fs.existsSync(jsonPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    expect(data.shots.length).toBeGreaterThanOrEqual(3);
    expect(data.shots[0].visualPrompt).toBeDefined();
    expect(data.shots[0].videoMotionPrompt).toBeDefined();
  });

  it("should render 9:16 short drama and export Jianying draft via CLI drama command", async () => {
    const novelPath = path.join(tempDir, "story.txt");
    const outMp4 = path.join(tempDir, "drama.mp4");
    const draftPath = path.join(tempDir, "draft.json");
    fs.writeFileSync(novelPath, novelText, "utf8");

    const program = createCliProgram();
    await program.parseAsync([
      "node", "novel2motion", "drama", novelPath,
      "-o", outMp4,
      "--aspect", "9:16",
      "--provider", "mock",
      "--export-draft", draftPath
    ]);

    expect(fs.existsSync(outMp4)).toBe(true);
    expect(fs.existsSync(draftPath)).toBe(true);
  });

  it("should render 16:9 landscape short drama by default", async () => {
    const novelPath = path.join(tempDir, "story.txt");
    const outMp4 = path.join(tempDir, "drama_landscape.mp4");
    fs.writeFileSync(novelPath, novelText, "utf8");

    const program = createCliProgram();
    await program.parseAsync([
      "node", "novel2motion", "drama", novelPath,
      "-o", outMp4,
      "--provider", "mock"
    ]);

    expect(fs.existsSync(outMp4)).toBe(true);
  });
});
