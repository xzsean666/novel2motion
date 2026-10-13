import type { KVDB, Table } from "kvdb-sdk";
import {
  CharacterProfile,
  CharacterProfileSchema
} from "../core/models/character.js";
import {
  ModularAvatarSpec,
  ModularAvatarSpecSchema
} from "../core/models/modular-character.js";

export class CharacterRegistry {
  private readonly table: Table<CharacterProfile>;
  private readonly aliasTable: Table<{ characterId: string }>;
  private readonly modularTable: Table<ModularAvatarSpec>;

  constructor(private readonly db: KVDB) {
    this.table = this.db.table<CharacterProfile>("characters");
    this.aliasTable = this.db.table<{ characterId: string }>("character_aliases");
    this.modularTable = this.db.table<ModularAvatarSpec>("modular_avatars");
  }

  /**
   * Registers or updates a character profile in the registry
   */
  async register(rawProfile: unknown): Promise<CharacterProfile> {
    const profile = CharacterProfileSchema.parse(rawProfile);
    await this.table.set(profile.id, profile);

    // Map exact name to ID
    await this.aliasTable.set(profile.name.toLowerCase().trim(), { characterId: profile.id });

    // Map each alias to ID
    for (const alias of profile.aliases) {
      const normalized = alias.toLowerCase().trim();
      if (normalized) {
        await this.aliasTable.set(normalized, { characterId: profile.id });
      }
    }

    return profile;
  }

  /**
   * Retrieves a character by ID
   */
  async get(id: string): Promise<CharacterProfile | null> {
    const record = await this.table.get(id);
    return record ?? null;
  }

  /**
   * Finds a character by exact name, alias, or closest match to prevent character drift
   */
  async findByNameOrAlias(nameOrAlias: string): Promise<CharacterProfile | null> {
    const query = nameOrAlias.trim().toLowerCase();
    if (!query) return null;

    // Direct lookup in alias table
    const aliasRecord = await this.aliasTable.get(query);
    if (aliasRecord?.characterId) {
      const char = await this.get(aliasRecord.characterId);
      if (char) return char;
    }

    // Direct lookup in main characters table by key
    const directChar = await this.get(nameOrAlias);
    if (directChar) return directChar;

    // Scan all characters for fuzzy/substring containment match
    const all = await this.listAll();
    for (const char of all) {
      if (char.name.toLowerCase() === query) return char;
      if (char.aliases.some((a) => a.toLowerCase() === query)) return char;
      // Partial inclusion (e.g. "韩立" in "韩立突然冷哼")
      if (query.includes(char.name.toLowerCase()) || char.name.toLowerCase().includes(query)) {
        return char;
      }
      for (const a of char.aliases) {
        if (query.includes(a.toLowerCase()) || a.toLowerCase().includes(query)) {
          return char;
        }
      }
    }

    return null;
  }

  /**
   * Lists all registered characters
   */
  async listAll(): Promise<CharacterProfile[]> {
    const results = await this.table.find({});
    return results.map((r) => r.value);
  }

  /**
   * Lists universal/shared characters available to all dramas
   */
  async listShared(): Promise<CharacterProfile[]> {
    const all = await this.listAll();
    return all.filter((c) => c.roleScope === "shared");
  }

  /**
   * Lists drama-exclusive characters, optionally filtered by applicable drama tag
   */
  async listExclusive(dramaTag?: string): Promise<CharacterProfile[]> {
    const all = await this.listAll();
    return all.filter((c) => {
      if (c.roleScope !== "exclusive") return false;
      if (!dramaTag) return true;
      return c.applicableDramas.length === 0 || c.applicableDramas.includes(dramaTag);
    });
  }

  /**
   * Deletes a character and associated alias mappings
   */
  async delete(id: string): Promise<boolean> {
    const char = await this.get(id);
    if (!char) return false;

    await this.table.delete(id);
    await this.aliasTable.delete(char.name.toLowerCase().trim());
    for (const alias of char.aliases) {
      await this.aliasTable.delete(alias.toLowerCase().trim());
    }

    return true;
  }

  /**
   * Registers a modular avatar JSON specification in the database
   */
  async registerModularAvatar(rawSpec: unknown): Promise<ModularAvatarSpec> {
    const spec = ModularAvatarSpecSchema.parse(rawSpec);
    await this.modularTable.set(spec.id, spec);

    // Also register alias lookup
    await this.aliasTable.set(spec.name.toLowerCase().trim(), { characterId: spec.id });

    return spec;
  }

  /**
   * Retrieves a modular avatar JSON specification by ID
   */
  async getModularAvatar(id: string): Promise<ModularAvatarSpec | null> {
    const record = await this.modularTable.get(id);
    return record ?? null;
  }

  /**
   * Lists all registered modular avatars
   */
  async listModularAvatars(): Promise<ModularAvatarSpec[]> {
    const results = await this.modularTable.find({});
    return results.map((r) => r.value);
  }

  /**
   * Deletes a modular avatar by ID
   */
  async deleteModularAvatar(id: string): Promise<boolean> {
    const avatar = await this.getModularAvatar(id);
    if (!avatar) return false;
    await this.modularTable.delete(id);
    await this.aliasTable.delete(avatar.name.toLowerCase().trim());
    return true;
  }

  /**
   * Exports modular avatar as a formatted JSON string
   */
  async exportAvatarJson(id: string, pretty = true): Promise<string | null> {
    const avatar = await this.getModularAvatar(id);
    if (!avatar) return null;
    return JSON.stringify(avatar, null, pretty ? 2 : 0);
  }
}
