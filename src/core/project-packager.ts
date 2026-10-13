import fs from "node:fs";
import path from "node:path";
import type { KVDB } from "kvdb-sdk";
import { ProjectStore, type ProjectRecord } from "../db/project-store.js";
import { CharacterRegistry } from "../db/character-registry.js";
import { BackgroundRegistry } from "../db/background-registry.js";
import {
  packTarGz,
  unpackTarGz,
  computeBufferChecksum,
  N2mManifestSchema,
  type N2mManifest,
  type TarEntry
} from "./archive.js";
import type { CharacterProfile } from "./models/character.js";
import type { BackgroundAsset } from "./models/background.js";

export interface ExportProjectOptions {
  projectId: string;
  outputPath: string;
  db: KVDB;
  assetBaseDir?: string;
}

export interface ImportProjectOptions {
  n2mFilePath: string;
  db: KVDB;
  assetDestDir?: string;
  targetProjectId?: string;
}

export interface ImportProjectResult {
  projectId: string;
  projectName: string;
  characterCount: number;
  backgroundCount: number;
  assetFileCount: number;
}

export class ProjectPackager {
  /**
   * Exports an entire project and its associated database entities and files into a single `.n2m` archive.
   */
  static async exportProject(options: ExportProjectOptions): Promise<string> {
    const { projectId, outputPath, db } = options;

    const projectStore = new ProjectStore(db);
    const charRegistry = new CharacterRegistry(db);
    const bgRegistry = new BackgroundRegistry(db);

    const project = await projectStore.getProject(projectId);
    if (!project) {
      throw new Error(`Cannot export: project "${projectId}" not found in database`);
    }

    const plan = project.plan;
    const charIds = new Set<string>(plan.characters);
    const bgIds = new Set<string>();

    for (const scene of plan.scenes) {
      if (scene.backgroundId) bgIds.add(scene.backgroundId);
      for (const st of scene.initialStaging) {
        charIds.add(st.characterId);
      }
    }

    // Retrieve database entities
    const characters: CharacterProfile[] = [];
    for (const cid of charIds) {
      const c = await charRegistry.get(cid);
      if (c) characters.push(c);
    }

    const backgrounds: BackgroundAsset[] = [];
    for (const bid of bgIds) {
      const b = await bgRegistry.get(bid);
      if (b) backgrounds.push(b);
    }

    const entries: TarEntry[] = [];
    const assetFilesRecorded: string[] = [];

    // Collect physical asset files referenced by characters and backgrounds
    const maybeCollectFile = (originalPath: string | undefined, archiveSubdir: string) => {
      if (!originalPath) return;
      if (fs.existsSync(originalPath)) {
        try {
          const fileData = fs.readFileSync(originalPath);
          const base = path.basename(originalPath);
          const arcName = `assets/${archiveSubdir}/${base}`;
          entries.push({ name: arcName, data: fileData });
          assetFilesRecorded.push(arcName);
        } catch {
          // ignore read failure
        }
      }
    };

    for (const bg of backgrounds) {
      if (bg.layers) {
        for (const l of bg.layers) {
          maybeCollectFile(l.assetPath, "backgrounds");
        }
      }
    }

    for (const ch of characters) {
      if (ch.memeFaces) {
        for (const f of ch.memeFaces) {
          maybeCollectFile(f.assetPath, "characters");
        }
      }
      if (ch.parts) {
        for (const p of ch.parts) {
          maybeCollectFile(p.assetPath, "characters");
        }
      }
    }

    // Assemble project payload
    const projectPayload = {
      project,
      characters,
      backgrounds
    };
    const projectBuffer = Buffer.from(JSON.stringify(projectPayload, null, 2), "utf8");
    entries.push({ name: "project.json", data: projectBuffer });

    // Assemble manifest
    const checksum = computeBufferChecksum(projectBuffer);
    const manifest: N2mManifest = {
      format: "novel2motion_package",
      version: "1.0.0",
      projectId,
      projectName: plan.title || projectId,
      createdAt: new Date().toISOString(),
      checksum,
      characters: Array.from(charIds),
      backgrounds: Array.from(bgIds),
      assetFiles: assetFilesRecorded
    };
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
    entries.unshift({ name: "manifest.json", data: manifestBuffer });

    // Pack into tar.gz
    const packed = packTarGz(entries);

    const outDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, packed);
    return path.resolve(outputPath);
  }

  /**
   * Imports a `.n2m` archive, extracts all assets, validates data integrity, and restores database entries.
   */
  static async importProject(options: ImportProjectOptions): Promise<ImportProjectResult> {
    const { n2mFilePath, db, targetProjectId } = options;

    if (!fs.existsSync(n2mFilePath)) {
      throw new Error(`File not found: ${n2mFilePath}`);
    }

    const compressed = fs.readFileSync(n2mFilePath);
    const entries = unpackTarGz(compressed);

    // Locate manifest.json
    const manifestEntry = entries.find((e) => e.name === "manifest.json");
    if (!manifestEntry) {
      throw new Error("Invalid .n2m package: manifest.json is missing");
    }

    const manifestRaw = JSON.parse(manifestEntry.data.toString("utf8"));
    const manifest = N2mManifestSchema.parse(manifestRaw);

    // Locate project.json
    const projectEntry = entries.find((e) => e.name === "project.json");
    if (!projectEntry) {
      throw new Error("Invalid .n2m package: project.json is missing");
    }

    const currentChecksum = computeBufferChecksum(projectEntry.data);
    if (currentChecksum !== manifest.checksum) {
      throw new Error(`Checksum mismatch in .n2m package: expected ${manifest.checksum}, got ${currentChecksum}`);
    }

    const projectPayload = JSON.parse(projectEntry.data.toString("utf8")) as {
      project: ProjectRecord;
      characters: CharacterProfile[];
      backgrounds: BackgroundAsset[];
    };

    // Extract asset files
    const assetDest = options.assetDestDir ? path.resolve(options.assetDestDir) : path.resolve("assets");
    let assetFileCount = 0;

    for (const entry of entries) {
      if (entry.name.startsWith("assets/")) {
        const relative = entry.name.replace(/^assets\//, "");
        const destFile = path.join(assetDest, relative);
        const destDir = path.dirname(destFile);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.writeFileSync(destFile, entry.data);
        assetFileCount++;
      }
    }

    // Restore to Database
    const projectStore = new ProjectStore(db);
    const charRegistry = new CharacterRegistry(db);
    const bgRegistry = new BackgroundRegistry(db);

    for (const char of projectPayload.characters || []) {
      await charRegistry.register(char);
    }

    for (const bg of projectPayload.backgrounds || []) {
      await bgRegistry.register(bg);
    }

    const finalProjectId = targetProjectId ?? projectPayload.project.storyId;
    const restoredPlan = {
      ...projectPayload.project.plan,
      storyId: finalProjectId
    };

    await projectStore.saveProject(restoredPlan, projectPayload.project.status);

    return {
      projectId: finalProjectId,
      projectName: manifest.projectName,
      characterCount: (projectPayload.characters || []).length,
      backgroundCount: (projectPayload.backgrounds || []).length,
      assetFileCount
    };
  }
}
