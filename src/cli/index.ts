import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { executeRenderPipeline } from "./render-pipeline.js";
import { ProjectPackager } from "../core/project-packager.js";
import { createDatabase } from "../db/connection.js";

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("novel2motion")
    .description("Novel to motion anime video generation engine powered by Node.js and Three.js")
    .version("0.1.0");

  program
    .command("render <input>")
    .description("Render a novel text file into a finished anime motion video MP4")
    .option("-o, --output <file>", "Output video path", "output.mp4")
    .option("--width <number>", "Viewport width in pixels", "1920")
    .option("--height <number>", "Viewport height in pixels", "1080")
    .option("--fps <number>", "Frame rate", "24")
    .option("--cache-dir <dir>", "Incremental scene cache directory", ".n2m_cache/scenes")
    .option("--preset <preset>", "Visual style preset (cinematic, default)", "cinematic")
    .action(async (input: string, opts: Record<string, string>) => {
      console.log(`🎬 启动 novel2motion 视频渲染引擎...`);
      console.log(`📄 输入小说文件: ${input}`);
      console.log(`📺 输出视频目标: ${opts.output}`);

      const start = Date.now();
      const result = await executeRenderPipeline({
        inputPath: input,
        outputPath: opts.output,
        width: parseInt(opts.width, 10),
        height: parseInt(opts.height, 10),
        fps: parseInt(opts.fps, 10),
        cacheDir: opts.cacheDir,
        onStep: (step, total, msg) => {
          console.log(`[${step}/${total}] ${msg}`);
        }
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n🎉 渲染完成！`);
      console.log(`📁 成品文件: ${result.outputPath}`);
      console.log(`⏱️ 视频时长: ${(result.totalDurationMs / 1000).toFixed(1)} 秒`);
      console.log(`🎞️ 镜头总数: ${result.sceneCount} (缓存命中: ${result.cacheHitCount})`);
      console.log(`⚡ 总计用时: ${elapsed} 秒`);
    });

  program
    .command("init <dir>")
    .description("Initialize a new novel2motion project workspace directory")
    .action(async (dir: string) => {
      const targetDir = path.resolve(dir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.mkdirSync(path.join(targetDir, "assets/characters"), { recursive: true });
      fs.mkdirSync(path.join(targetDir, "assets/backgrounds"), { recursive: true });
      fs.mkdirSync(path.join(targetDir, "assets/audio"), { recursive: true });

      const sampleNovel = `第1章 昆仑之巅
韩立御剑悬停于万丈悬崖之上，目光如电。
极阴祖师冷冷一笑：“韩天尊，今日你插翅难飞！”
韩立眼神一凛，手捏剑诀：“聒噪！九天玄雷，落！”
轰隆一声巨响，天穹之上金色雷光骤然炸裂！
`;
      fs.writeFileSync(path.join(targetDir, "story.txt"), sampleNovel, "utf8");

      const config = {
        name: path.basename(targetDir),
        version: "1.0.0",
        resolution: { width: 1080, height: 1920, fps: 24 }
      };
      fs.writeFileSync(path.join(targetDir, "project.json"), JSON.stringify(config, null, 2), "utf8");

      console.log(`✨ 工程初始化成功: ${targetDir}`);
      console.log(`   - story.txt (样例小说文本)`);
      console.log(`   - project.json (工程配置)`);
      console.log(`   - assets/ (素材目录)`);
    });

  program
    .command("export <projectId>")
    .description("Export project and all referenced assets into a single .n2m archive")
    .requiredOption("-o, --output <file>", "Output .n2m file path")
    .option("--db <path>", "Database file path", "novel2motion.db")
    .action(async (projectId: string, opts: { output: string; db: string }) => {
      const db = createDatabase({ dbPath: opts.db });
      try {
        const exported = await ProjectPackager.exportProject({
          projectId,
          outputPath: opts.output,
          db
        });
        console.log(`📦 工程导出成功: ${exported}`);
      } finally {
        await db.close();
      }
    });

  program
    .command("drama <input>")
    .description("Render novel text into an industrial cinematic AI short drama video (9:16 vertical or 16:9)")
    .option("-o, --output <file>", "Output video path", "output/drama_master.mp4")
    .option("--aspect <ratio>", "Aspect ratio (16:9 for landscape drama, 9:16 for mobile)", "16:9")
    .option("--provider <provider>", "Video generator backend (cinematic_motion, kling, hailuo, wan)", "cinematic_motion")
    .option("--export-draft <path>", "Export Jianying/CapCut draft JSON project file")
    .option("--fps <number>", "Frame rate", "24")
    .action(async (input: string, opts: Record<string, string>) => {
      const { executeDramaPipeline } = await import("../drama/pipeline.js");
      console.log(`🎬 启动 novel2motion 工业级 AI 短剧生成引擎...`);
      console.log(`📄 输入小说原著: ${input}`);
      console.log(`📱 画幅比例: ${opts.aspect} | 视频生成后端: ${opts.provider}`);
      console.log(`📺 输出视频目标: ${opts.output}`);

      const start = Date.now();
      const isVertical = opts.aspect === "9:16";
      const result = await executeDramaPipeline({
        inputPath: input,
        outputPath: opts.output,
        aspectRatio: opts.aspect as any,
        width: isVertical ? 1080 : 1920,
        height: isVertical ? 1920 : 1080,
        fps: parseInt(opts.fps, 10),
        videoProvider: opts.provider as any,
        exportJianyingDraftPath: opts.exportDraft,
        onProgress: (p, msg) => {
          console.log(`[${p}%] ${msg}`);
        }
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n🎉 工业级短剧渲染完成！`);
      console.log(`📁 成品母带: ${result.outputPath}`);
      console.log(`⏱️ 成片时长: ${(result.totalDurationMs / 1000).toFixed(1)} 秒`);
      console.log(`🎞️ 分镜镜头总数: ${result.shotCount}`);
      if (result.jianyingDraftPath) {
        console.log(`✂️ 剪映/CapCut 工程草稿: ${result.jianyingDraftPath}`);
      }
      console.log(`⚡ 总计用时: ${elapsed} 秒`);
    });

  program
    .command("storyboard <input>")
    .description("Parse novel text and generate structured cinematic storyboard screenplay JSON")
    .option("-o, --output <file>", "Output storyboard JSON path", "storyboard.json")
    .action(async (input: string, opts: { output: string }) => {
      const { DramaDirector } = await import("../drama/director/drama-director.js");
      const { CharacterBible } = await import("../drama/consistency/character-bible.js");
      const novelText = fs.readFileSync(path.resolve(input), "utf8");

      const director = new DramaDirector(new CharacterBible());
      const script = director.direct(novelText, {
        title: path.basename(input, path.extname(input))
      });

      fs.writeFileSync(path.resolve(opts.output), JSON.stringify(script, null, 2), "utf8");
      console.log(`🎬 影视分镜脚本生成完毕！`);
      console.log(`📁 文件输出: ${opts.output}`);
      console.log(`🎞️ 镜头总数: ${script.shots.length}`);
    });

  return program;
}
