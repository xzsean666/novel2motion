import http, { type IncomingMessage, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { KVDB } from "kvdb-sdk";
import { RenderQueueWorker, type RenderJobPayload, type RenderJobProgressEvent } from "./queue-worker.js";
import { CharacterRegistry } from "../db/character-registry.js";
import { BackgroundRegistry } from "../db/background-registry.js";

export interface AppServerOptions {
  db: KVDB;
  worker?: RenderQueueWorker;
  port?: number;
  host?: string;
}

export class AppServer {
  readonly server: http.Server;
  readonly db: KVDB;
  readonly worker: RenderQueueWorker;
  readonly charRegistry: CharacterRegistry;
  readonly bgRegistry: BackgroundRegistry;
  readonly port: number;
  readonly host: string;

  constructor(options: AppServerOptions) {
    this.db = options.db;
    this.worker = options.worker ?? new RenderQueueWorker({ db: this.db });
    this.charRegistry = new CharacterRegistry(this.db);
    this.bgRegistry = new BackgroundRegistry(this.db);
    this.port = options.port ?? 3000;
    this.host = options.host ?? "0.0.0.0";

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message ?? "Internal Server Error" }));
        }
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. POST /api/jobs (Submit novel rendering job)
    if (method === "POST" && pathname === "/api/jobs") {
      const body = await this.readJsonBody(req);
      if (!body || !body.text || typeof body.text !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing or invalid 'text' property in request body" }));
        return;
      }

      const payload: RenderJobPayload = {
        novelText: body.text,
        title: body.title,
        width: body.width,
        height: body.height,
        fps: body.fps
      };

      const job = await this.worker.queue.push(payload);

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          jobId: job.id,
          state: job.state,
          createdAt: job.createdAt
        })
      );
      return;
    }

    // 2. GET /api/jobs/:id (Query job status)
    const jobMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9-]+)$/);
    if (method === "GET" && jobMatch) {
      const jobId = jobMatch[1];
      const job = await this.worker.queue.getJob(jobId);

      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Job "${jobId}" not found` }));
        return;
      }

      const latestProgress = this.worker.getJobProgress(jobId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: job.id,
          state: job.state,
          attempts: job.attempts,
          result: job.result,
          error: job.error,
          progress: latestProgress
        })
      );
      return;
    }

    // 3. GET /api/jobs/:id/events (SSE Real-time progress stream)
    const eventsMatch = pathname.match(/^\/api\/jobs\/([a-zA-Z0-9-]+)\/events$/);
    if (method === "GET" && eventsMatch) {
      const jobId = eventsMatch[1];

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });
      res.write(": keepalive\n\n");

      // Send immediate initial progress if available
      const existingProgress = this.worker.getJobProgress(jobId);
      if (existingProgress) {
        res.write(`data: ${JSON.stringify(existingProgress)}\n\n`);
      }

      const listener = (event: RenderJobProgressEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "completed" || event.type === "failed") {
          cleanup();
          res.end();
        }
      };

      const cleanup = () => {
        this.worker.events.off(`job:${jobId}`, listener);
      };

      this.worker.events.on(`job:${jobId}`, listener);
      req.on("close", cleanup);
      return;
    }

    // 4. GET /api/characters
    if (method === "GET" && pathname === "/api/characters") {
      const characters = await this.charRegistry.listAll();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(characters));
      return;
    }

    // 5. GET /api/backgrounds
    if (method === "GET" && pathname === "/api/backgrounds") {
      const backgrounds = await this.bgRegistry.listAll();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(backgrounds));
      return;
    }

    // 6. GET /api/download/:jobId
    const downloadMatch = pathname.match(/^\/api\/download\/([a-zA-Z0-9-]+)$/);
    if (method === "GET" && downloadMatch) {
      const jobId = downloadMatch[1];
      const job = await this.worker.queue.getJob(jobId);

      if (!job || !job.result || !job.result.outputPath) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Video file not found or rendering not completed" }));
        return;
      }

      const filePath = job.result.outputPath;
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Rendered video file is no longer on disk" }));
        return;
      }

      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename="novel2motion_${jobId}.mp4"`
      });

      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // 404 Not Found fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Route not found: ${method} ${pathname}` }));
  }

  private readJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) {
          reject(new Error("Request body payload too large (max 5MB)"));
        }
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }

  public async start(): Promise<string> {
    this.worker.start();
    await new Promise<void>((resolve) => {
      this.server.listen(this.port, this.host, () => {
        resolve();
      });
    });

    const addr = this.server.address();
    const actualPort = typeof addr === "object" && addr ? addr.port : this.port;
    return `http://127.0.0.1:${actualPort}`;
  }

  public async stop(): Promise<void> {
    await this.worker.stop();
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }
}
