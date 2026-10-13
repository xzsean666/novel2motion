import { describe, expect, it } from "vitest";
import { AvatarCommandTimelineSchema } from "../src/core/models/avatar-command.js";
import { UniversalAvatar3D } from "../src/engine/model3d/universal-avatar-3d.js";
import { PRESET_HAN_LI, PRESET_ZI_LING } from "../src/engine/puppet/avatar/preset-avatars.js";

describe("UniversalAvatar3D command runtime", () => {
  it("validates a command timeline and keeps runtime state separate from JSON", () => {
    const timeline = AvatarCommandTimelineSchema.parse({
      characterId: PRESET_HAN_LI.id,
      commands: [
        { id: "talk", type: "speak", at: 0, duration: 900, text: "你好" },
        { id: "attack", type: "play", at: 1000, duration: 700, clip: "slash_strike", layer: "fullBody" }
      ]
    });
    const avatar = new UniversalAvatar3D({ spec: PRESET_HAN_LI, timeline });

    avatar.update(300);
    expect(avatar.model.root).toBeDefined();
    expect(avatar.exportSpec()).toEqual(PRESET_HAN_LI);
    expect(avatar.toJSONString(false)).toContain('"id":"char_han_li"');
  });

  it("applies shared commands to a different gender and body preset", () => {
    const avatar = new UniversalAvatar3D({
      spec: PRESET_ZI_LING,
      timeline: {
        characterId: PRESET_ZI_LING.id,
        commands: [
          { id: "cast", type: "play", at: 0, duration: 1000, clip: "cast", layer: "fullBody" },
          { id: "face", type: "expression", at: 0, duration: 1000, name: "battle", weight: 1 }
        ]
      }
    });

    avatar.update(500);
    expect(avatar.root.name).toBe("UniversalAvatar3D_char_zi_ling");
    expect(avatar.model.armRNode.rotation.z).not.toBe(0);
    expect(avatar.model.root.children.length).toBeGreaterThan(1);
  });

  it("rejects a timeline addressed to a different character", () => {
    expect(() => new UniversalAvatar3D({
      spec: PRESET_HAN_LI,
      timeline: { characterId: PRESET_ZI_LING.id, commands: [] }
    })).toThrow(/characterId/);
  });
});
