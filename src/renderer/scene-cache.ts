import fs from "node:fs";
import path from "node:path";

export interface CacheEntryMeta {
  hash: string;
  sceneId: string;
  createdAt: string;
  sizeBytes: number;
  filename: string;
}

export interface CacheManifest {
  version: number;
  entries: Record<string, CacheEntryMeta>;
}

export class SceneRenderCache {
  private readonly cacheDir: string;
  private readonly manifestPath: string;
  private manifest: CacheManifest;

  constructor(cacheDir: string = ".n2m_cache/scenes") {
    this.cacheDir = path.resolve(cacheDir);
    this.manifestPath = path.join(this.cacheDir, "manifest.json");

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    this.manifest = this.loadManifest();
  }

  private loadManifest(): CacheManifest {
    if (fs.existsSync(this.manifestPath)) {
      try {
        const raw = fs.readFileSync(this.manifestPath, "utf8");
        return JSON.parse(raw);
      } catch {
        // Corrupted or invalid JSON, reset
      }
    }
    return { version: 1, entries: {} };
  }

  private saveManifest(): void {
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), "utf8");
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Checks whether a pre-rendered video exists for this hash.
   */
  public has(hash: string): boolean {
    const entry = this.manifest.entries[hash];
    if (!entry) return false;
    const filePath = path.join(this.cacheDir, entry.filename);
    return fs.existsSync(filePath);
  }

  /**
   * Retrieves the local absolute file path for a cached scene MP4.
   */
  public get(hash: string): string | null {
    if (!this.has(hash)) return null;
    return path.join(this.cacheDir, this.manifest.entries[hash].filename);
  }

  /**
   * Puts a rendered video into the cache.
   */
  public async put(
    hash: string,
    sourcePathOrBuffer: string | Buffer,
    sceneId: string = "scene"
  ): Promise<string> {
    const filename = `${hash}.mp4`;
    const destPath = path.join(this.cacheDir, filename);

    if (Buffer.isBuffer(sourcePathOrBuffer)) {
      fs.writeFileSync(destPath, sourcePathOrBuffer);
    } else {
      if (sourcePathOrBuffer !== destPath) {
        fs.copyFileSync(sourcePathOrBuffer, destPath);
      }
    }

    const stat = fs.statSync(destPath);
    this.manifest.entries[hash] = {
      hash,
      sceneId,
      createdAt: new Date().toISOString(),
      sizeBytes: stat.size,
      filename
    };
    this.saveManifest();

    return destPath;
  }

  /**
   * Removes a cached scene video.
   */
  public delete(hash: string): boolean {
    const entry = this.manifest.entries[hash];
    if (!entry) return false;

    const filePath = path.join(this.cacheDir, entry.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }

    delete this.manifest.entries[hash];
    this.saveManifest();
    return true;
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    for (const entry of Object.values(this.manifest.entries)) {
      const p = path.join(this.cacheDir, entry.filename);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore
        }
      }
    }
    this.manifest.entries = {};
    this.saveManifest();
  }

  /**
   * Returns cache statistics.
   */
  public getStats(): { count: number; totalSizeBytes: number } {
    let totalSizeBytes = 0;
    let count = 0;

    for (const [hash, entry] of Object.entries(this.manifest.entries)) {
      const p = path.join(this.cacheDir, entry.filename);
      if (fs.existsSync(p)) {
        count++;
        totalSizeBytes += entry.sizeBytes;
      } else {
        delete this.manifest.entries[hash];
      }
    }
    this.saveManifest();

    return { count, totalSizeBytes };
  }
}
