import type { CharacterProfile, VoiceConfig } from "../../../src/core/models/character.js";

export class CharacterRosterModel {
  private characters: Map<string, CharacterProfile> = new Map();
  private selectedCharacterId: string | null = null;

  constructor(initialCharacters: CharacterProfile[] = []) {
    for (const c of initialCharacters) {
      this.characters.set(c.id, c);
    }
    if (initialCharacters.length > 0) {
      this.selectedCharacterId = initialCharacters[0].id;
    }
  }

  public getAll(): CharacterProfile[] {
    return Array.from(this.characters.values());
  }

  public get(id: string): CharacterProfile | undefined {
    return this.characters.get(id);
  }

  public getSelected(): CharacterProfile | undefined {
    return this.selectedCharacterId ? this.characters.get(this.selectedCharacterId) : undefined;
  }

  public select(id: string): boolean {
    if (this.characters.has(id)) {
      this.selectedCharacterId = id;
      return true;
    }
    return false;
  }

  public add(profile: CharacterProfile): void {
    this.characters.set(profile.id, profile);
    if (!this.selectedCharacterId) {
      this.selectedCharacterId = profile.id;
    }
  }

  public updateVoice(characterId: string, voice: Partial<VoiceConfig>): boolean {
    const char = this.characters.get(characterId);
    if (!char) return false;

    char.voiceConfig = {
      ...char.voiceConfig,
      ...voice
    };
    return true;
  }

  public setDefaultMemeFace(characterId: string, memeFaceId: string): boolean {
    const char = this.characters.get(characterId);
    if (!char) return false;

    char.defaultMemeFaceId = memeFaceId;
    return true;
  }
}
