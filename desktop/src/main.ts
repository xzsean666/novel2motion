import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { executeRenderPipeline, type RenderPipelineOptions } from "../../src/cli/render-pipeline.js";
import { ProjectPackager } from "../../src/core/project-packager.js";
import { createDatabase } from "../../src/db/connection.js";

export interface DesktopWindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  title: string;
  hardwareAcceleration: boolean;
  webPreferences: {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    preload: string;
  };
}

export type IpcHandlerFn = (payload: any) => Promise<any> | any;

export class DesktopAppHost {
  private readonly ipcHandlers: Map<string, IpcHandlerFn> = new Map();
  private windowConfig: DesktopWindowConfig;

  constructor(options: {
    width?: number;
    height?: number;
    preloadPath?: string;
  } = {}) {
    this.windowConfig = {
      width: options.width ?? 1440,
      height: options.height ?? 900,
      minWidth: 1024,
      minHeight: 720,
      title: "Novel2Motion - 小说推文动画工作台",
      hardwareAcceleration: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: options.preloadPath ?? path.resolve("dist/preload.js")
      }
    };

    this.registerDefaultIpcHandlers();
  }

  public getWindowConfig(): DesktopWindowConfig {
    return { ...this.windowConfig };
  }

  public registerHandler(channel: string, handler: IpcHandlerFn): void {
    this.ipcHandlers.set(channel, handler);
  }

  public async dispatchIpc(channel: string, payload: any): Promise<any> {
    const handler = this.ipcHandlers.get(channel);
    if (!handler) {
      throw new Error(`No IPC handler registered for channel: "${channel}"`);
    }
    return await handler(payload);
  }

  private registerDefaultIpcHandlers(): void {
    // 1. novel2motion:getSystemInfo
    this.registerHandler("novel2motion:getSystemInfo", () => {
      return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCount: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024))
      };
    });

    // 2. novel2motion:render
    this.registerHandler("novel2motion:render", async (payload: {
      text: string;
      outputPath?: string;
      width?: number;
      height?: number;
      fps?: number;
    }) => {
      const tempInput = path.join(os.tmpdir(), `desktop_render_${Date.now()}.txt`);
      fs.writeFileSync(tempInput, payload.text, "utf8");

      try {
        return await executeRenderPipeline({
          inputPath: tempInput,
          outputPath: payload.outputPath,
          width: payload.width,
          height: payload.height,
          fps: payload.fps
        });
      } finally {
        if (fs.existsSync(tempInput)) {
          try {
            fs.unlinkSync(tempInput);
          } catch {
            // ignore
          }
        }
      }
    });

    // 3. novel2motion:exportProject
    this.registerHandler("novel2motion:exportProject", async (payload: {
      projectId: string;
      outputPath: string;
      dbPath?: string;
    }) => {
      const db = createDatabase({ dbPath: payload.dbPath ?? ":memory:" });
      try {
        return await ProjectPackager.exportProject({
          projectId: payload.projectId,
          outputPath: payload.outputPath,
          db
        });
      } finally {
        await db.close();
      }
    });

    // 4. novel2motion:importProject
    this.registerHandler("novel2motion:importProject", async (payload: {
      n2mFilePath: string;
      dbPath?: string;
      assetDestDir?: string;
    }) => {
      const db = createDatabase({ dbPath: payload.dbPath ?? ":memory:" });
      try {
        return await ProjectPackager.importProject({
          n2mFilePath: payload.n2mFilePath,
          db,
          assetDestDir: payload.assetDestDir
        });
      } finally {
        await db.close();
      }
    });
  }
}
