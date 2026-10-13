import type { KVDB, Table } from "kvdb-sdk";
import {
  BackgroundAsset,
  BackgroundAssetSchema
} from "../core/models/background.js";

export class BackgroundRegistry {
  private readonly table: Table<BackgroundAsset>;

  constructor(private readonly db: KVDB) {
    this.table = this.db.table<BackgroundAsset>("backgrounds");
  }

  /**
   * Registers or updates a background asset
   */
  async register(rawBg: unknown): Promise<BackgroundAsset> {
    const bg = BackgroundAssetSchema.parse(rawBg);
    await this.table.set(bg.id, bg);
    return bg;
  }

  /**
   * Retrieves a background by ID
   */
  async get(id: string): Promise<BackgroundAsset | null> {
    const record = await this.table.get(id);
    return record ?? null;
  }

  /**
   * Finds backgrounds matching any of the provided tags or environment
   */
  async findByTags(tags: string[]): Promise<BackgroundAsset[]> {
    const normalizedTags = tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
    if (normalizedTags.length === 0) return [];

    const all = await this.listAll();
    return all.filter((bg) => {
      // Check environment match
      if (normalizedTags.includes(bg.environment.toLowerCase())) {
        return true;
      }
      // Check tags overlap
      const bgTags = bg.tags.map((t) => t.toLowerCase());
      return normalizedTags.some((tag) => bgTags.includes(tag));
    });
  }

  /**
   * Lists all registered backgrounds
   */
  async listAll(): Promise<BackgroundAsset[]> {
    const results = await this.table.find({});
    return results.map((r) => r.value);
  }

  /**
   * Deletes a background asset by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.table.delete(id);
  }
}
