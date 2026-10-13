import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createDatabase } from "../db/connection.js";
import { initializeBuiltinAssets } from "../assets/asset-loader.js";
import { StoryParser } from "../ai/story-parser.js";
import { CharacterBinder } from "../ai/character-binder.js";
import { AiDirector } from "../ai/ai-director.js";
import { ProjectStore } from "../db/project-store.js";
import { CharacterRegistry } from "../db/character-registry.js";
import { BackgroundRegistry } from "../db/background-registry.js";
import { ThreeStage } from "../engine/stage/three-stage.js";
import { PuppetCharacter } from "../engine/puppet/puppet-character.js";
import { MemeFaceMaterial } from "../engine/materials/meme-face-material.js";
import { SubtitleMesh } from "../engine/subtitle/subtitle-mesh.js";
import { VFXManager } from "../engine/vfx/screen-fx.js";
import { CameraController } from "../engine/camera/camera-controller.js";
import { ScenePlayer, SceneEventScheduler, type TimedSceneEvent } from "../engine/scene-player.js";
import { computeSceneHash } from "../renderer/scene-hasher.js";
import { SceneRenderCache } from "../renderer/scene-cache.js";
import { renderStageToMp4 } from "../renderer/stream-encoder.js";
import { concatSceneVideos } from "../renderer/scene-concat.js";
import { mixSceneAudio } from "../audio/audio-mixer.js";
import { AudioCache } from "../db/audio-cache.js";
import { EdgeTtsSynthesizer, MockTtsSynthesizer, CachedTtsService, type TtsSynthesizer } from "../audio/tts-synthesizer.js";
import type { AudioCueInput } from "../core/models/timeline.js";
import type { ScenePlan, DialogueEvent, AttackEvent } from "../core/models/dsl.js";

export interface RenderPipelineOptions {
  inputPath: string;
  outputPath?: string;
  width?: number;
  height?: number;
  fps?: number;
  cacheDir?: string;
  dbPath?: string;
  assetsDir?: string;
  ttsSynthesizer?: TtsSynthesizer;
  onStep?: (step: number, total: number, message: string) => void;
  onProgress?: (percent: number, info: string) => void;
}

export interface RenderPipelineResult {
  outputPath: string;
  totalDurationMs: number;
  sceneCount: number;
  cacheHitCount: number;
}

/**
 * Full end-to-end rendering pipeline orchestrating text parsing, AI directing,
 * 2.5D Three.js animation compiling, incremental caching, and FFmpeg encoding.
 */
export async function executeRenderPipeline(
  options: RenderPipelineOptions
): Promise<RenderPipelineResult> {
  const inputPath = path.resolve(options.inputPath);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const outputPath = path.resolve(options.outputPath ?? "output.mp4");
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const fps = options.fps ?? 24;
  const cacheDir = options.cacheDir ?? ".n2m_cache/scenes";
  const assetsDir = options.assetsDir ?? "assets";
  const dbPath = options.dbPath ?? ":memory:";

  const notifyStep = (step: number, msg: string) => {
    if (options.onStep) options.onStep(step, 4, msg);
  };

  // STEP 1: Parse Story & Extract Entities
  notifyStep(1, "小说文本分块与实体抽取...");
  const rawText = fs.readFileSync(inputPath, "utf8");

  const db = createDatabase({ dbPath });
  try {
    const charRegistry = new CharacterRegistry(db);
    const bgRegistry = new BackgroundRegistry(db);
    const projectStore = new ProjectStore(db);

    // Load builtin assets if available
    if (fs.existsSync(path.join(assetsDir, "manifest.json"))) {
      try {
        await initializeBuiltinAssets(db, assetsDir);
      } catch {
        // ignore
      }
    }

    const binder = new CharacterBinder(charRegistry);
    const parser = new StoryParser(binder);
    const chunks = await parser.parse(rawText);

    // STEP 2: AI Directing & StoryPlan Compilation
    notifyStep(2, "AI 导演高层分镜编导与时间轴编排...");
    const title = path.basename(inputPath, path.extname(inputPath));
    const director = new AiDirector();
    const storyPlan = director.direct(chunks, {
      storyId: `proj_${Date.now()}`,
      title,
      maxChunksPerScene: 4
    });

    await projectStore.saveProject(storyPlan, "planned");

    // STEP 3 & 4: Three.js 2.5D Compilation & Stream Encoding
    notifyStep(3, "Three.js 2.5D 舞台与时间轴动作编译...");
    const cache = new SceneRenderCache(cacheDir);
    const audioCache = new AudioCache(db);
    const ttsSynthesizer = options.ttsSynthesizer ?? new EdgeTtsSynthesizer(new MockTtsSynthesizer());
    const ttsDir = path.join(os.tmpdir(), "n2m_tts_storage");
    const ttsService = new CachedTtsService(ttsSynthesizer, audioCache, ttsDir);

    const sceneVideoPaths: string[] = [];
    let cacheHitCount = 0;
    let totalDurationMs = 0;

    notifyStep(4, "无头离线渲染与流式 FFmpeg 编码...");
    const tempSceneDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_render_scenes_"));

    try {
      for (let idx = 0; idx < storyPlan.scenes.length; idx++) {
        const scene = storyPlan.scenes[idx];
        const sceneHash = computeSceneHash({
          scene,
          renderConfig: { width, height, fps }
        });

        // 1. Check cache hit
        if (cache.has(sceneHash)) {
          const cachedPath = cache.get(sceneHash)!;
          sceneVideoPaths.push(cachedPath);
          cacheHitCount++;
          totalDurationMs += scene.durationMs ?? 2000;
          continue;
        }

        // 2. Render scene offscreen with real TTS & rich visuals
        const sceneVideoFile = path.join(tempSceneDir, `${scene.sceneId}_${sceneHash.slice(0, 8)}.mp4`);
        const { durationMs: renderedDurationMs } = await renderSingleScene({
          scene,
          width,
          height,
          fps,
          outputPath: sceneVideoFile,
          charRegistry,
          bgRegistry,
          ttsService,
          assetsDir
        });

        totalDurationMs += renderedDurationMs;

        // 3. Save to cache
        await cache.put(sceneHash, sceneVideoFile, scene.sceneId);
        sceneVideoPaths.push(sceneVideoFile);
      }

      // 5. Concatenate all scenes into final video
      await concatSceneVideos({
        videoPaths: sceneVideoPaths,
        outputPath
      });

      await projectStore.updateStatus(storyPlan.storyId, "completed", outputPath);

      return {
        outputPath,
        totalDurationMs,
        sceneCount: storyPlan.scenes.length,
        cacheHitCount
      };
    } finally {
      if (fs.existsSync(tempSceneDir)) {
        try {
          fs.rmSync(tempSceneDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }
  } finally {
    await db.close();
  }
}

function getCharacterConfig(charId: string, charName?: string) {
  const idLower = (charId || "").toLowerCase();
  const nameLower = (charName || "").toLowerCase();

  if (idLower.includes("han") || nameLower.includes("韩")) {
    return {
      displayName: "韩立",
      voiceId: "zh-CN-YunxiNeural",
      rate: 1.05,
      pitch: 0,
      auraColor: "#00ffaa",
      spriteDir: "characters/han_tianzun",
      defaultFacing: "left" as const
    };
  }
  if (idLower.includes("evil") || nameLower.includes("极阴") || nameLower.includes("魔")) {
    return {
      displayName: "极阴祖师",
      voiceId: "zh-CN-YunjianNeural",
      rate: 0.95,
      pitch: -6,
      auraColor: "#9922ff",
      spriteDir: "characters/evil_lord",
      defaultFacing: "left" as const
    };
  }
  if (idLower.includes("rooster") || nameLower.includes("鸡")) {
    return {
      displayName: "哮天鸡",
      voiceId: "zh-CN-liaoning-XiaobeiNeural",
      rate: 1.05,
      pitch: 4,
      auraColor: "#ffd700",
      spriteDir: "characters/meme_rooster",
      defaultFacing: "left" as const
    };
  }
  if (idLower.includes("hero_m") || idLower.includes("yunfei") || nameLower.includes("李云飞") || nameLower.includes("飞")) {
    return {
      displayName: "李云飞",
      voiceId: "zh-CN-YunyangNeural",
      rate: 1.0,
      pitch: 1,
      auraColor: "#33bbff",
      spriteDir: "characters/hero_m",
      defaultFacing: "left" as const
    };
  }
  if (idLower.includes("hero_f") || nameLower.includes("清月")) {
    return {
      displayName: "苏清月",
      voiceId: "zh-CN-XiaoxiaoNeural",
      rate: 1.0,
      pitch: 2,
      auraColor: "#ff88cc",
      spriteDir: "characters/hero_f",
      defaultFacing: "left" as const
    };
  }
  return {
    displayName: charName || "修士",
    voiceId: "zh-CN-YunxiNeural",
    rate: 1.0,
    pitch: 0,
    auraColor: "#00ffaa",
    spriteDir: "characters/hero_m",
    defaultFacing: "left" as const
  };
}

interface RenderSceneArgs {
  scene: ScenePlan;
  width: number;
  height: number;
  fps: number;
  outputPath: string;
  charRegistry: CharacterRegistry;
  bgRegistry: BackgroundRegistry;
  ttsService: CachedTtsService;
  assetsDir: string;
}

async function renderSingleScene(args: RenderSceneArgs): Promise<{ outputPath: string; durationMs: number }> {
  const { scene, width, height, fps, outputPath, ttsService, assetsDir } = args;

  const stage = new ThreeStage({ viewportWidth: width, viewportHeight: height });
  const cameraCtrl = new CameraController({ camera: stage.camera, layoutEngine: stage.layout });
  const vfx = new VFXManager({ width, height });
  stage.addVFX(vfx.root);

  const subtitle = new SubtitleMesh({ viewportWidth: width, viewportHeight: height });
  stage.addSubtitle(subtitle.mesh);

  // 1. Resolve Background Image
  const bgCandidate1 = path.join(assetsDir, "backgrounds", `${scene.backgroundId || "bg_xianxia_thunder"}.png`);
  const bgCandidate2 = path.join(assetsDir, "backgrounds", "bg_xianxia_thunder.png");
  const resolvedBg = fs.existsSync(bgCandidate1) ? bgCandidate1 : (fs.existsSync(bgCandidate2) ? bgCandidate2 : undefined);
  if (resolvedBg) {
    stage.userData.backgroundPath = path.resolve(resolvedBg);
  }

  const puppets: Map<string, PuppetCharacter> = new Map();
  const memeFaces: Map<string, MemeFaceMaterial> = new Map();
  const characterSlots: Map<string, string> = new Map();
  const imagesToPreload: string[] = [];
  if (stage.userData.backgroundPath) {
    imagesToPreload.push(stage.userData.backgroundPath);
  }

  // 2. Instantiate and attach characters
  for (const st of scene.initialStaging) {
    characterSlots.set(st.characterId, st.slot);
    const puppet = new PuppetCharacter({
      id: st.characterId,
      facing: st.facing,
      initialAction: "idle"
    });

    const memeFace = new MemeFaceMaterial({
      initialExpression: st.initialMemeFace ?? "normal"
    });
    memeFace.mountToPuppet(puppet);

    const cfg = getCharacterConfig(st.characterId);
    const spriteMap: Record<string, string> = {};
    const exprList = ["normal", "angry", "shocked", "hurt", "battle", "happy"];
    for (const expr of exprList) {
      const fullP = path.resolve(path.join(assetsDir, cfg.spriteDir, `${expr}.png`));
      if (fs.existsSync(fullP)) {
        spriteMap[expr] = fullP;
        imagesToPreload.push(fullP);
      }
    }

    puppet.root.userData.spriteMap = spriteMap;
    puppet.root.userData.currentExpression = st.initialMemeFace ?? "normal";
    puppet.root.userData.auraColor = cfg.auraColor;
    puppet.root.userData.defaultFacing = cfg.defaultFacing ?? "right";
    puppet.root.userData.facing = st.facing;
    puppet.root.userData.rigId = path.basename(cfg.spriteDir);

    const isPet = st.characterId.includes("rooster") || cfg.displayName.includes("鸡");
    const actorScale = isPet ? 0.42 : (st.scale ?? 1.0);
    puppet.root.scale.set(actorScale, actorScale, actorScale);

    stage.addActor(st.characterId, puppet.root, st.slot, st.facing, st.floatAnimation);

    if (isPet) {
      puppet.root.position.x += st.facing === "right" ? -120 : 120;
      puppet.root.position.y -= 140;
    }
    if (st.customX) puppet.root.position.x += st.customX;
    if (st.customY) puppet.root.position.y += st.customY;

    puppets.set(st.characterId, puppet);
    memeFaces.set(st.characterId, memeFace);
  }

  // 3. Synthesize Speech & Build Precise Timeline
  const sceneAudioDir = path.dirname(outputPath);
  const audioCues: AudioCueInput[] = [];
  const scheduler = new SceneEventScheduler();
  const timedEvents: TimedSceneEvent[] = [];

  for (const ev of scene.events) {
    let dur = 1200;
    const start = scheduler.startFor(ev);
    let voiceDurationMs: number | undefined;

    if (ev.type === "dialogue") {
      const d = ev as DialogueEvent;
      const cfg = getCharacterConfig(d.speakerId);
      try {
        const synth = await ttsService.getOrSynthesize(d.text, {
          voiceId: cfg.voiceId,
          rate: cfg.rate,
          pitch: cfg.pitch
        });
        dur = Math.max(1200, Math.round(synth.durationMs + 280));
        voiceDurationMs = synth.durationMs;
        audioCues.push({
          cueId: `cue_${start}`,
          type: "voice",
          audioPath: synth.audioPath,
          startTimeMs: start,
          durationMs: synth.durationMs,
          volume: 1.0,
          duckBgm: true
        });
      } catch {
        dur = Math.max(1200, d.text.length * 220);
      }

      if (d.memeFace === "shocked") {
        const shockSfx = path.resolve(path.join(assetsDir, "audio/sfx/shock_sting.wav"));
        if (fs.existsSync(shockSfx)) {
          audioCues.push({
            cueId: `shock_${start}`,
            type: "sfx",
            audioPath: shockSfx,
            startTimeMs: start,
            durationMs: 400,
            volume: 0.8
          });
        }
      }
    } else if (ev.type === "narration") {
      const nText = (ev as any).text || "";
      try {
        const synth = await ttsService.getOrSynthesize(nText, {
          voiceId: "zh-CN-YunjianNeural",
          rate: 1.0,
          pitch: 0
        });
        dur = Math.max(1400, Math.round(synth.durationMs + 300));
        voiceDurationMs = synth.durationMs;
        audioCues.push({
          cueId: `narr_${start}`,
          type: "voice",
          audioPath: synth.audioPath,
          startTimeMs: start,
          durationMs: synth.durationMs,
          volume: 1.0,
          duckBgm: true
        });
      } catch {
        dur = Math.max(1400, nText.length * 200);
      }
    } else if (ev.type === "attack") {
      const a = ev as AttackEvent;
      dur = a.durationMs || 1500;
      if (a.skillType === "thunder_strike") {
        const sfx = path.resolve(path.join(assetsDir, "audio/sfx/thunder_blast.wav"));
        if (fs.existsSync(sfx)) {
          audioCues.push({
            cueId: `thunder_${start}`,
            type: "sfx",
            audioPath: sfx,
            startTimeMs: start + dur * 0.58,
            durationMs: 1200,
            volume: 1.0
          });
        }
      } else if (a.skillType !== "shield_barrier") {
        const sfx = path.resolve(path.join(assetsDir, "audio/sfx",
          a.skillType === "palm_strike" ? "punch_heavy.wav" : "sword_clash.wav"));
        if (fs.existsSync(sfx)) {
          audioCues.push({
            cueId: `sword_${start}`,
            type: "sfx",
            audioPath: sfx,
            startTimeMs: start + dur * 0.58,
            durationMs: 700,
            volume: 0.9
          });
        }
      }
    } else if (ev.type === "sfx") {
      // Combat sounds above are already placed at the animation's impact frame.
      const previous = timedEvents[timedEvents.length - 1];
      if (previous?.ev.type !== "attack") {
        const soundFile = path.resolve(assetsDir, "audio/sfx", `${ev.soundId.replace(/^sfx_/, "")}.wav`);
        if (fs.existsSync(soundFile)) audioCues.push({ cueId: `sfx_${start}_${ev.soundId}`,
          type: "sfx", audioPath: soundFile, startTimeMs: start + ev.delayMs,
          durationMs: 600, volume: ev.volume });
      }
      dur = 0;
    } else {
      dur = (ev as any).durationMs || 800;
    }

    const timed = scheduler.append(ev, dur, voiceDurationMs);
    if (timed) timedEvents.push(timed);
  }

  const finalDurationMs = Math.max(1800, scheduler.durationMs + 200);

  // 4. Mix Audio (BGM + Voices + SFX with automatic Ducking)
  let sceneAudioPath: string | undefined;
  const bgmCandidate = path.resolve(assetsDir, "audio/bgm", `${(scene.bgmId || "combat_epic").replace(/^bgm_/, "")}.wav`);
  const defaultBgm = path.resolve(assetsDir, "audio/bgm/combat_epic.wav");
  const resolvedBgm = fs.existsSync(bgmCandidate) ? bgmCandidate : (fs.existsSync(defaultBgm) ? defaultBgm : undefined);

  if (resolvedBgm || audioCues.length > 0) {
    const mixedWav = path.join(sceneAudioDir, `mixed_${scene.sceneId}_${Date.now()}.wav`);
    try {
      await mixSceneAudio({
        bgm: resolvedBgm ? { filePath: resolvedBgm, volume: scene.bgmVolume ?? 0.35 } : undefined,
        audioCues,
        totalDurationMs: finalDurationMs,
        outputPath: mixedWav
      });
      if (fs.existsSync(mixedWav)) {
        sceneAudioPath = mixedWav;
      }
    } catch {
      // Continue without audio if mix encounters error
    }
  }

  // 5. Render Stage to MP4
  const player = new ScenePlayer(stage, puppets, cameraCtrl, vfx, timedEvents,
    new Map([...puppets.keys()].map(id => [id, getCharacterConfig(id).displayName])));
  await renderStageToMp4({
    stage,
    durationMs: finalDurationMs,
    width,
    height,
    fps,
    outputPath,
    audioPath: sceneAudioPath,
    preloadImages: imagesToPreload,
    updateCallback: (timeMs, dt) => player.update(timeMs, dt)
  });

  stage.dispose();
  return { outputPath, durationMs: finalDurationMs };
}
