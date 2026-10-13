import type { ScenePlan, StoryPlan, DialogueEvent } from "../../../src/core/models/dsl.js";

export interface SceneCardLine {
  id: string;
  speakerId: string;
  text: string;
  memeFace: string;
  style: "calligraphy_gold" | "shout_red" | "narration_white";
}

export interface SceneCard {
  id: string;
  title: string;
  backgroundId: string;
  characters: string[];
  lines: SceneCardLine[];
}

export class NovelInputModel {
  private novelText = "";
  private sceneCards: SceneCard[] = [];

  constructor(initialText = "") {
    this.novelText = initialText;
  }

  public getText(): string {
    return this.novelText;
  }

  public setText(text: string): void {
    this.novelText = text;
  }

  public getSceneCards(): SceneCard[] {
    return this.sceneCards;
  }

  /**
   * Initializes scene cards from a generated StoryPlan
   */
  public loadFromStoryPlan(storyPlan: StoryPlan): void {
    this.sceneCards = storyPlan.scenes.map((scene, idx) => {
      const lines: SceneCardLine[] = [];

      for (let i = 0; i < scene.events.length; i++) {
        const ev = scene.events[i];
        if (ev.type === "dialogue") {
          const d = ev as DialogueEvent;
          lines.push({
            id: `line_${idx}_${i}`,
            speakerId: d.speakerId,
            text: d.text,
            memeFace: d.memeFace ?? "normal",
            style: d.subtitleStyle ?? "calligraphy_gold"
          });
        }
      }

      const charIds = scene.initialStaging.map((s) => s.characterId);

      return {
        id: scene.sceneId,
        title: scene.title || `分镜 ${idx + 1}`,
        backgroundId: scene.backgroundId,
        characters: charIds,
        lines
      };
    });
  }

  public updateSceneCard(sceneId: string, patch: Partial<SceneCard>): boolean {
    const card = this.sceneCards.find((c) => c.id === sceneId);
    if (!card) return false;

    Object.assign(card, patch);
    return true;
  }

  public updateCardLine(
    sceneId: string,
    lineId: string,
    patch: Partial<SceneCardLine>
  ): boolean {
    const card = this.sceneCards.find((c) => c.id === sceneId);
    if (!card) return false;

    const line = card.lines.find((l) => l.id === lineId);
    if (!line) return false;

    Object.assign(line, patch);
    return true;
  }

  /**
   * Compiles scene cards back into a standard StoryPlan DSL
   */
  public toStoryPlan(storyId = "story_custom"): StoryPlan {
    const allChars = new Set<string>();

    const scenes: ScenePlan[] = this.sceneCards.map((card) => {
      for (const ch of card.characters) {
        allChars.add(ch);
      }

      const staging = card.characters.map((ch, idx) => {
        const slots = ["mid_left", "center", "mid_right", "far_left", "far_right"] as const;
        return {
          characterId: ch,
          slot: slots[idx % slots.length],
          scale: 1.0,
          facing: (idx % 2 === 0 ? "right" : "left") as "left" | "right",
          initialMemeFace: "normal",
          floatAnimation: true
        };
      });

      const events: DialogueEvent[] = card.lines.map((l) => ({
        type: "dialogue",
        speakerId: l.speakerId,
        text: l.text,
        memeFace: l.memeFace,
        subtitleStyle: l.style,
        durationMs: Math.max(1200, l.text.length * 200)
      }));

      return {
        sceneId: card.id,
        title: card.title,
        backgroundId: card.backgroundId,
        bgmId: "bgm_xianxia_battle",
        bgmVolume: 0.35,
        initialStaging: staging.length > 0 ? staging : [{
          characterId: "char_han_tianzun",
          slot: "center",
          scale: 1.0,
          facing: "right",
          initialMemeFace: "normal",
          floatAnimation: true
        }],
        events
      };
    });

    return {
      storyId,
      title: "Custom Interactive Story",
      characters: Array.from(allChars),
      scenes,
      metadata: {}
    };
  }
}
