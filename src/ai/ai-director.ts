import {
  ScenePlan,
  StoryPlan,
  TimelineEvent,
  DialogueEvent,
  NarrationEvent,
  CameraMotionEvent
} from "../core/models/dsl.js";
import { StoryChunk } from "./story-chunk.js";
import { planCharacterStaging } from "./staging-planner.js";
import { buildCombatSequence } from "./combat-director.js";

export interface DirectingOptions {
  storyId?: string;
  title?: string;
  defaultBackgroundId?: string;
  maxChunksPerScene?: number;
}

export class AiDirector {
  /**
   * Transforms raw parsed story chunks into a high-level directorial StoryPlan DSL.
   */
  direct(chunks: StoryChunk[], options: DirectingOptions = {}): StoryPlan {
    const storyId = options.storyId ?? `story_${Date.now()}`;
    const title = options.title ?? "Novel Motion Adaptation";
    const defaultBackgroundId = options.defaultBackgroundId ?? "bg_xianxia_thunder";
    const maxChunksPerScene = options.maxChunksPerScene ?? 8;

    if (chunks.length === 0) {
      throw new Error("Cannot direct an empty list of story chunks");
    }

    // 1. Extract all characters involved in the story
    const involvedCharacterIds = new Set<string>();
    for (const c of chunks) {
      if (c.boundSpeakerId) involvedCharacterIds.add(c.boundSpeakerId);
      if (c.boundTargetId) involvedCharacterIds.add(c.boundTargetId);
    }

    // Default to protagonist & antagonist if none detected
    const characterList =
      involvedCharacterIds.size > 0
        ? Array.from(involvedCharacterIds)
        : ["char_han_tianzun", "char_evil_lord"];

    // 2. Segment chunks into scenes
    const scenePlans: ScenePlan[] = [];
    let currentChunkBatch: StoryChunk[] = [];
    let sceneIndex = 0;

    const commitScene = (batch: StoryChunk[]) => {
      if (batch.length === 0) return;
      sceneIndex++;

      // Detect characters active in this batch
      const sceneCharIds = new Set<string>();
      for (const c of batch) {
        if (c.boundSpeakerId) sceneCharIds.add(c.boundSpeakerId);
        if (c.boundTargetId) sceneCharIds.add(c.boundTargetId);
      }

      const activeChars =
        sceneCharIds.size > 0
          ? Array.from(sceneCharIds)
          : characterList.slice(0, 2);

      const staging = planCharacterStaging(activeChars);

      // Detect BGM mood
      const hasCombat = batch.some((c) => c.type === "combat");
      const bgmId = hasCombat ? "bgm_combat_epic" : "bgm_tense_suspense";

      // Build timeline events
      const events: TimelineEvent[] = [];

      // Initial establishing camera shot
      events.push({
        type: "camera",
        motion: "reset",
        zoomFactor: 1.0,
        shakeIntensity: 0,
        durationMs: 500
      } as CameraMotionEvent);

      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];

        if (chunk.type === "dialogue") {
          const speakerId = chunk.boundSpeakerId ?? activeChars[0];
          const isAngry = chunk.suggestedMemeFace === "angry";
          const subtitleStyle = isAngry ? "shout_red" : "calligraphy_gold";

          // Rough duration estimate: 200ms per character, minimum 1200ms
          const estimatedDuration = Math.max(1200, chunk.text.length * 200);

          const dialogueEvent: DialogueEvent = {
            type: "dialogue",
            speakerId,
            text: chunk.text,
            memeFace: chunk.suggestedMemeFace,
            subtitleStyle,
            durationMs: estimatedDuration
          };
          events.push(dialogueEvent);

          // Focus camera on speaker
          events.push({
            type: "camera",
            motion: "zoom_in",
            targetCharacterId: speakerId,
            zoomFactor: 1.45,
            shakeIntensity: 0,
            durationMs: 750
          } as CameraMotionEvent);
        } else if (chunk.type === "combat") {
          const attackerId = chunk.boundSpeakerId ?? activeChars[0];
          const targetId = chunk.boundTargetId ?? activeChars.find((id) => id !== attackerId) ?? activeChars[1];

          const combatEvents = buildCombatSequence({
            attackerId,
            targetId,
            chunk
          });
          events.push(...combatEvents);
        } else {
          // Narration
          const estimatedDuration = Math.max(1500, chunk.text.length * 180);
          const narrationEvent: NarrationEvent = {
            type: "narration",
            text: chunk.text,
            durationMs: estimatedDuration
          };
          events.push(narrationEvent);
        }
      }

      // Select scene background based on scene text and chapter context
      const narrationText = batch.filter((c) => c.type === "narration").map((c) => c.text).join(" ");
      const allText = batch.map((c) => c.text).join(" ");
      let sceneBgId = options.defaultBackgroundId || defaultBackgroundId;
      if (!options.defaultBackgroundId) {
        const fullContext = `${narrationText} ${allText}`;
        if (fullContext.includes("长街") || fullContext.includes("街道") || fullContext.includes("都市")) {
          sceneBgId = "bg_street";
        } else if (fullContext.includes("天台") || fullContext.includes("大楼") || fullContext.includes("办公室") || fullContext.includes("大厦")) {
          sceneBgId = "bg_office_night";
        } else if (fullContext.includes("武馆") || fullContext.includes("演武场")) {
          sceneBgId = "bg_dojo";
        } else if (fullContext.includes("密林") || fullContext.includes("深林") || fullContext.includes("森林")) {
          sceneBgId = "bg_forest";
        } else if (fullContext.includes("林") || fullContext.includes("竹") || fullContext.includes("翠")) {
          sceneBgId = "bg_xianxia_bamboo";
        } else if (fullContext.includes("魔") || fullContext.includes("血") || fullContext.includes("渊") || fullContext.includes("煞") || fullContext.includes("九幽")) {
          sceneBgId = "bg_xianxia_abyss";
        } else if (fullContext.includes("巅") || fullContext.includes("峰") || fullContext.includes("绝顶") || fullContext.includes("昆仑")) {
          sceneBgId = "bg_xianxia_peak";
        } else if (fullContext.includes("雷") || fullContext.includes("电")) {
          sceneBgId = "bg_xianxia_thunder";
        } else {
          const pool = ["bg_xianxia_peak", "bg_xianxia_bamboo", "bg_xianxia_abyss", "bg_xianxia_thunder"];
          sceneBgId = pool[(sceneIndex - 1) % pool.length];
        }
      }

      scenePlans.push({
        sceneId: `scene_${String(sceneIndex).padStart(3, "0")}`,
        title: `分镜 ${sceneIndex}`,
        backgroundId: sceneBgId,
        bgmId,
        bgmVolume: 0.35,
        initialStaging: staging,
        events
      });
    };

    for (const chunk of chunks) {
      if (
        currentChunkBatch.length > 0 &&
        (chunk.text.match(/^第\s*[0-9一二三四五六七八九十百]+\s*章/) || chunk.text.match(/^Chapter\s+\d+/i))
      ) {
        commitScene(currentChunkBatch);
        currentChunkBatch = [];
      }
      currentChunkBatch.push(chunk);
      if (currentChunkBatch.length >= maxChunksPerScene) {
        commitScene(currentChunkBatch);
        currentChunkBatch = [];
      }
    }
    commitScene(currentChunkBatch);

    return {
      storyId,
      title,
      characters: characterList,
      scenes: scenePlans,
      metadata: {}
    };
  }
}
