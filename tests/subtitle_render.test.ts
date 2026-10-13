import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  FontRasterizer,
  SubtitleMesh,
  ThreeStage
} from "../src/engine/index.js";
import type { SubtitleCue } from "../src/core/models/timeline.js";

describe("Calligraphy Subtitle Engine (TASK-116)", () => {
  describe("FontRasterizer", () => {
    it("should register local MaShanZheng font and render calligraphy gold text", () => {
      const result = FontRasterizer.rasterize("九天玄雷，给本尊破！", {
        style: "calligraphy_gold",
        fontSize: 72
      });

      expect(result.texture).toBeInstanceOf(THREE.DataTexture);
      expect(result.width).toBe(1000);
      expect(result.height).toBe(180);

      // Verify pixel buffer has rendered pixels
      const buffer = result.texture.image.data as Uint8Array;
      let hasVisiblePixels = false;
      for (let i = 3; i < buffer.length; i += 4) {
        if (buffer[i] > 0) {
          hasVisiblePixels = true;
          break;
        }
      }
      expect(hasVisiblePixels).toBe(true);
    });

    it("should support shout_red and narration_white styles with speaker badges", () => {
      const redResult = FontRasterizer.rasterize("受死吧，韩跑跑！", {
        style: "shout_red",
        speakerName: "极阴老祖"
      });
      expect(redResult.texture).toBeInstanceOf(THREE.DataTexture);

      const whiteResult = FontRasterizer.rasterize("天地初开，混沌未分...", {
        style: "narration_white"
      });
      expect(whiteResult.texture).toBeInstanceOf(THREE.DataTexture);
    });
  });

  describe("SubtitleMesh & ThreeStage Synchronization", () => {
    let stage: ThreeStage;
    let subtitleMesh: SubtitleMesh;

    beforeEach(() => {
      stage = new ThreeStage({ viewportWidth: 1080, viewportHeight: 1920 });
      subtitleMesh = new SubtitleMesh({ viewportWidth: stage.width, viewportHeight: stage.height });
      stage.addSubtitle(subtitleMesh.mesh);
    });

    afterEach(() => {
      subtitleMesh.dispose();
      stage.dispose();
    });

    it("should position subtitle quad on top subtitle layer (Z=300)", () => {
      expect(subtitleMesh.mesh.position.z).toBe(300);
      expect(subtitleMesh.mesh.renderOrder).toBe(40);
      expect(subtitleMesh.isVisible()).toBe(false);
    });

    it("should display cue and clear dynamically", () => {
      subtitleMesh.setCue("厉飞雨，速速纳命来！", "shout_red");
      expect(subtitleMesh.isVisible()).toBe(true);
      expect(subtitleMesh.getCurrentText()).toBe("厉飞雨，速速纳命来！");

      subtitleMesh.clear();
      expect(subtitleMesh.isVisible()).toBe(false);
      expect(subtitleMesh.getCurrentText()).toBe("");
    });

    it("should synchronize subtitle visibility with timeline timestamp cues", () => {
      const cues: SubtitleCue[] = [
        {
          startTimeMs: 1000,
          endTimeMs: 3000,
          text: "前方可是乱星海？！",
          speakerId: "韩立",
          style: "calligraphy_gold",
          fontSize: 64,
          positionY: 1500
        },
        {
          startTimeMs: 3500,
          endTimeMs: 5000,
          text: "正是此地！",
          speakerId: "极阴老祖",
          style: "shout_red",
          fontSize: 64,
          positionY: 1500
        }
      ];



      // At t = 500ms (before first cue)
      subtitleMesh.syncTime(500, cues);
      expect(subtitleMesh.isVisible()).toBe(false);

      // At t = 2000ms (inside first cue)
      subtitleMesh.syncTime(2000, cues);
      expect(subtitleMesh.isVisible()).toBe(true);
      expect(subtitleMesh.getCurrentText()).toBe("前方可是乱星海？！");

      // At t = 3200ms (gap between cues)
      subtitleMesh.syncTime(3200, cues);
      expect(subtitleMesh.isVisible()).toBe(false);

      // At t = 4000ms (inside second cue)
      subtitleMesh.syncTime(4000, cues);
      expect(subtitleMesh.isVisible()).toBe(true);
      expect(subtitleMesh.getCurrentText()).toBe("正是此地！");

      // At t = 6000ms (after all cues)
      subtitleMesh.syncTime(6000, cues);
      expect(subtitleMesh.isVisible()).toBe(false);
    });
  });
});
