import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createDatabase } from "../src/db/connection.js";
import { CharacterRegistry } from "../src/db/character-registry.js";
import { BackgroundRegistry } from "../src/db/background-registry.js";
import { AppServer } from "../src/server/server.js";
import type { KVDB } from "kvdb-sdk";

describe("High-Concurrency Task Server & Web REST/SSE API (TASK-121)", () => {
  let tempDir: string;
  let db: KVDB;
  let server: AppServer;
  let baseUrl: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "n2m_server_test_"));
    const dbPath = path.join(tempDir, "server_test.db");
    db = createDatabase({ dbPath });

    // Seed test character and background
    const charRegistry = new CharacterRegistry(db);
    await charRegistry.register({
      id: "char_han_li",
      name: "韩立",
      aliases: ["韩天尊"],
      gender: "male",
      description: "青竹蜂云剑修"
    });

    const bgRegistry = new BackgroundRegistry(db);
    await bgRegistry.register({
      id: "bg_thunder_realm",
      name: "九天雷劫海",
      environment: "thunder_realm",
      tags: ["thunder", "battle"],
      layers: [
        {
          layerId: "l1",
          name: "Thunder Clouds",
          assetPath: path.join(tempDir, "thunder.png")
        }
      ]
    });

    // Start server on dynamic port (port 0)
    server = new AppServer({ db, port: 0, host: "127.0.0.1" });
    baseUrl = await server.start();
  });

  afterEach(async () => {
    if (server) await server.stop();
    if (db) await db.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should query registered characters and backgrounds via REST API", async () => {
    const resChars = await fetch(`${baseUrl}/api/characters`);
    expect(resChars.status).toBe(200);
    const chars = await resChars.json();
    expect(Array.isArray(chars)).toBe(true);
    expect(chars.some((c: any) => c.name === "韩立")).toBe(true);

    const resBgs = await fetch(`${baseUrl}/api/backgrounds`);
    expect(resBgs.status).toBe(200);
    const bgs = await resBgs.json();
    expect(Array.isArray(bgs)).toBe(true);
    expect(bgs.some((b: any) => b.name === "九天雷劫海")).toBe(true);
  });

  it("should enqueue a novel text job, process via queue worker, and allow downloading finished MP4", async () => {
    const postPayload = {
      text: `第1回 仙魔之争
韩立御剑悬停于虚空之中。
极阴祖师厉声喝斥：“休走！”
韩立冷笑一声，九天玄雷降临！
`,
      title: "仙魔之争",
      width: 320,
      height: 240,
      fps: 24
    };

    const submitRes = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload)
    });

    expect(submitRes.status).toBe(201);
    const submitData = await submitRes.json();
    expect(submitData.success).toBe(true);
    expect(submitData.jobId).toBeDefined();

    const jobId = submitData.jobId;

    // Poll status until completed (timeout 30s)
    let isCompleted = false;
    let pollAttempts = 0;
    while (!isCompleted && pollAttempts < 60) {
      pollAttempts++;
      await new Promise((r) => setTimeout(r, 500));

      const statusRes = await fetch(`${baseUrl}/api/jobs/${jobId}`);
      expect(statusRes.status).toBe(200);
      const jobInfo = await statusRes.json();

      if (jobInfo.state === "completed") {
        isCompleted = true;
        expect(jobInfo.result).toBeDefined();
        expect(jobInfo.result.outputPath).toBeDefined();
        expect(fs.existsSync(jobInfo.result.outputPath)).toBe(true);
      } else if (jobInfo.state === "failed") {
        throw new Error(`Job execution failed: ${jobInfo.error}`);
      }
    }

    expect(isCompleted).toBe(true);

    // Verify video download endpoint
    const dlRes = await fetch(`${baseUrl}/api/download/${jobId}`);
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get("content-type")).toBe("video/mp4");
    const videoBuffer = await dlRes.arrayBuffer();
    expect(videoBuffer.byteLength).toBeGreaterThan(1000);
  });
});
