import { CharacterStaging, StageSlot } from "../core/models/dsl.js";

/**
 * Plans character slot placement and facing directions to ensure visual contrast and face-to-face confrontation.
 */
function isAntagonist(id: string): boolean {
  const l = id.toLowerCase();
  return l.includes("evil") || l.includes("demon") || l.includes("lord") || l.includes("boss") || l.includes("魔");
}

function isPet(id: string): boolean {
  const l = id.toLowerCase();
  return l.includes("rooster") || l.includes("pet") || l.includes("鸡") || l.includes("beast");
}

function isMainProtagonist(id: string): boolean {
  const l = id.toLowerCase();
  return l.includes("han") || l.includes("tianzun") || l.includes("protagonist") || l.includes("韩立");
}

/**
 * Plans character slot placement and facing directions to ensure visual contrast, faction-alignment, and face-to-face confrontation.
 */
export function planCharacterStaging(characterIds: string[]): CharacterStaging[] {
  const uniqueIds = Array.from(new Set(characterIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [
      {
        characterId: "char_default",
        slot: "center",
        facing: "right",
        scale: 1.0,
        initialMemeFace: "normal",
        floatAnimation: true
      }
    ];
  }

  // Classify by factions and roles
  const antagonists = uniqueIds.filter(isAntagonist);
  const pets = uniqueIds.filter(isPet);
  const protagonists = uniqueIds
    .filter((id) => !isAntagonist(id) && !isPet(id))
    .sort((a, b) => (isMainProtagonist(a) ? -1 : isMainProtagonist(b) ? 1 : 0));

  // Scenario 1: Both factions present -> Epic Confrontation Staging (Protagonists on Left, Antagonists on Right)
  if (antagonists.length > 0 && protagonists.length > 0) {
    const results: CharacterStaging[] = [];

    // Protagonists on Left Wing (facing Right towards enemy)
    protagonists.forEach((id, idx) => {
      const slot: StageSlot = idx === 0 ? "mid_left" : "far_left";
      results.push({
        characterId: id,
        slot,
        facing: "right",
        scale: idx === 0 ? 1.0 : 0.95,
        initialMemeFace: "normal",
        floatAnimation: true
      });
    });

    // Antagonists on Right Wing (facing Left towards hero)
    antagonists.forEach((id, idx) => {
      const slot: StageSlot = idx === 0 ? "mid_right" : "far_right";
      results.push({
        characterId: id,
        slot,
        facing: "left",
        scale: idx === 0 ? 1.0 : 0.95,
        initialMemeFace: "normal",
        floatAnimation: true
      });
    });

    // Spiritual Pets (scale = 0.42, flank alongside protagonist on Left)
    pets.forEach((id) => {
      results.push({
        characterId: id,
        slot: "far_left",
        facing: "right",
        scale: 0.42,
        initialMemeFace: "normal",
        floatAnimation: true
      });
    });

    return results;
  }

  // Scenario 2: Single character monologue / intro
  if (uniqueIds.length === 1) {
    const id = uniqueIds[0];
    return [
      {
        characterId: id,
        slot: "center",
        facing: isAntagonist(id) ? "left" : "right",
        scale: isPet(id) ? 0.5 : 1.0,
        initialMemeFace: "normal",
        floatAnimation: true
      }
    ];
  }

  // Scenario 3: Non-combat dialogue between allies or single faction
  if (uniqueIds.length === 2) {
    const [first, second] = uniqueIds;
    return [
      {
        characterId: first,
        slot: "mid_left",
        facing: "right",
        scale: isPet(first) ? 0.45 : 1.0,
        initialMemeFace: "normal",
        floatAnimation: true
      },
      {
        characterId: second,
        slot: "mid_right",
        facing: "left",
        scale: isPet(second) ? 0.45 : 1.0,
        initialMemeFace: "normal",
        floatAnimation: true
      }
    ];
  }

  // Multi-character general staging
  const slots: StageSlot[] = ["far_left", "mid_left", "center", "mid_right", "far_right"];
  return uniqueIds.map((id, index) => {
    const slot = slots[Math.min(index, slots.length - 1)];
    const facing = index < uniqueIds.length / 2 ? ("right" as const) : ("left" as const);
    return {
      characterId: id,
      slot,
      facing,
      scale: isPet(id) ? 0.42 : 0.88,
      initialMemeFace: "normal",
      floatAnimation: true
    };
  });
}
