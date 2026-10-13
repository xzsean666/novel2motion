import { CharacterRegistry } from "../db/character-registry.js";
import type { CharacterProfile } from "../core/models/character.js";

export class CharacterBinder {
  private recentSpeakers: string[] = [];

  constructor(private readonly registry: CharacterRegistry) {}

  /**
   * Binds a raw name string or contextual text to an existing registered CharacterProfile.
   */
  async bindSpeaker(rawName?: string, contextText?: string): Promise<CharacterProfile | null> {
    if (rawName) {
      const match = await this.registry.findByNameOrAlias(rawName);
      if (match) {
        this.trackSpeaker(match.id);
        return match;
      }
    }

    if (contextText) {
      const all = await this.registry.listAll();
      let bestChar: CharacterProfile | null = null;
      let latestPos = -1;

      for (const char of all) {
        const namesToCheck = [char.name, ...char.aliases];
        for (const name of namesToCheck) {
          const pos = contextText.lastIndexOf(name);
          if (pos > latestPos) {
            latestPos = pos;
            bestChar = char;
          }
        }
      }

      if (bestChar) {
        this.trackSpeaker(bestChar.id);
        return bestChar;
      }
    }

    return null;
  }

  /**
   * Scans text for any mentioned character profiles.
   */
  async findMentions(text: string): Promise<CharacterProfile[]> {
    const all = await this.registry.listAll();
    const found: Array<{ character: CharacterProfile; position: number }> = [];
    for (const char of all) {
      const namesToCheck = [char.name, ...char.aliases];
      const positions = namesToCheck.filter(Boolean).map(n => text.indexOf(n)).filter(p => p >= 0);
      if (positions.length) found.push({ character: char, position: Math.min(...positions) });
    }
    return found.sort((a, b) => a.position - b.position).map(entry => entry.character);
  }

  /**
   * Predicts the alternate speaker during rapid conversational back-and-forth
   * when speaker attributions are omitted in successive quotes.
   */
  async resolveAlternatingSpeaker(): Promise<CharacterProfile | null> {
    if (this.recentSpeakers.length >= 2) {
      // The second most recent speaker is likely answering
      const candidateId = this.recentSpeakers[this.recentSpeakers.length - 2];
      const match = await this.registry.get(candidateId);
      if (match) {
        this.trackSpeaker(match.id);
        return match;
      }
    }

    return null;
  }

  private trackSpeaker(charId: string) {
    if (this.recentSpeakers[this.recentSpeakers.length - 1] !== charId) {
      this.recentSpeakers.push(charId);
      if (this.recentSpeakers.length > 5) {
        this.recentSpeakers.shift();
      }
    }
  }

  reset() {
    this.recentSpeakers = [];
  }
}
