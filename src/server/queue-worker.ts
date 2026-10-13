import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { KVDB, Queue, Job } from "kvdb-sdk";
import { executeRenderPipeline, type RenderPipelineResult } from "../cli/render-pipeline.js";

export interface RenderJobPayload {
  novelText: string;
  title?: string;
  width?: number;
  height?: number;
  fps?: number;
  outputPath?: string;
}

export interface RenderJobProgressEvent {
  jobId: string;
  type: "progress" | "step" | "completed" | "failed";
  step?: number;
  totalSteps?: number;
  message?: string;
  percent?: number;
  result?: RenderPipelineResult;
  error?: string;
}

export interface RenderQueueWorkerOptions {
  db: KVDB;
  queueName?: string;
  concurrency?: number;
  pollIntervalMs?: number;
}

export class RenderQueueWorker {
  readonly db: KVDB;
  readonly queue: Queue<RenderJobPayload, RenderPipelineResult>;
  readonly events = new EventEmitter();
  readonly concurrency: number;
  private readonly pollIntervalMs: number;

  private running = false;
  private activeWorkers = 0;
  private readonly jobProgressMap = new Map<string, RenderJobProgressEvent>();

  constructor(options: RenderQueueWorkerOptions) {
    this.db = options.db;
    this.queue = this.db.queue<RenderJobPayload, RenderPipelineResult>(options.queueName ?? "render_jobs");
    this.concurrency = options.concurrency ?? 2;
    this.pollIntervalMs = options.pollIntervalMs ?? 200;
  }

  public getJobProgress(jobId: string): RenderJobProgressEvent | undefined {
    return this.jobProgressMap.get(jobId);
  }

  public start(): void {
    if (this.running) return;
    this.running = true;

    for (let i = 0; i < this.concurrency; i++) {
      this.spawnWorkerLoop();
    }
  }

  public async stop(): Promise<void> {
    this.running = false;
    while (this.activeWorkers > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private async spawnWorkerLoop(): Promise<void> {
    this.activeWorkers++;

    while (this.running) {
      try {
        const job = await this.queue.pop({ visibilityTimeoutMs: 180_000 });
        if (!job) {
          await new Promise((r) => setTimeout(r, this.pollIntervalMs));
          continue;
        }

        await this.processJob(job);
      } catch {
        // Sleep on error before retrying
        await new Promise((r) => setTimeout(r, this.pollIntervalMs));
      }
    }

    this.activeWorkers--;
  }

  private async processJob(job: Job<RenderJobPayload, RenderPipelineResult>): Promise<void> {
    const payload = job.payload;
    const jobId = job.id;
    const lockToken = job.lockToken!;

    // Create temporary file for novel text
    const tempNovelFile = path.join(
      os.tmpdir(),
      `n2m_job_${jobId}_${Date.now()}.txt`
    );
    fs.writeFileSync(tempNovelFile, payload.novelText, "utf8");

    const outputPath = payload.outputPath ?? path.join(os.tmpdir(), `n2m_job_${jobId}.mp4`);

    const emitEvent = (ev: RenderJobProgressEvent) => {
      this.jobProgressMap.set(jobId, ev);
      this.events.emit(`job:${jobId}`, ev);
      this.events.emit("progress", ev);
    };

    try {
      emitEvent({
        jobId,
        type: "step",
        step: 1,
        totalSteps: 4,
        message: "开始解析小说文本与实体抽取..."
      });

      const result = await executeRenderPipeline({
        inputPath: tempNovelFile,
        outputPath,
        width: payload.width ?? 1080,
        height: payload.height ?? 1920,
        fps: payload.fps ?? 24,
        onStep: (step, total, msg) => {
          emitEvent({
            jobId,
            type: "step",
            step,
            totalSteps: total,
            message: msg
          });
        }
      });

      // Acknowledge job completion
      await this.queue.ack(jobId, lockToken, result);

      emitEvent({
        jobId,
        type: "completed",
        result
      });
    } catch (err: any) {
      const errorMsg = err?.message ?? String(err);
      await this.queue.nack(jobId, lockToken, errorMsg);

      emitEvent({
        jobId,
        type: "failed",
        error: errorMsg
      });
    } finally {
      if (fs.existsSync(tempNovelFile)) {
        try {
          fs.unlinkSync(tempNovelFile);
        } catch {
          // ignore
        }
      }
    }
  }
}
