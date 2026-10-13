import { describe, it, expect } from "vitest";
import { KVDB } from "kvdb-sdk";
import { createRuntime } from "node-task-runtime";
import * as THREE from "three";
import { createCanvas } from "@napi-rs/canvas";
import { VERSION } from "../src/index.js";

describe("Infrastructure Smoke Test (TASK-101)", () => {
  it("should have correct version defined", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("should initialize kvdb-sdk instance correctly", async () => {
    const db = new KVDB({
      driver: "sqlite",
      url: ":memory:"
    });
    expect(db).toBeDefined();

    const table = db.table("smoke_test");
    await table.set("hello", { greeting: "world" });
    const record = await table.get("hello");
    expect(record).toEqual({ greeting: "world" });

    await db.close();
  });

  it("should initialize node-task-runtime and execute task correctly", async () => {
    const runtime = createRuntime({
      workers: 2,
      maxConcurrency: 2
    });
    expect(runtime).toBeDefined();

    const doubleTask = runtime.task<number, number>(async (n) => {
      return n * 2;
    });

    const result = await doubleTask(21);
    expect(result).toBe(42);

    await runtime.destroy();
  });

  it("should create Three.js scene, camera and mesh", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    expect(scene.children.length).toBe(1);
    expect(mesh.position.x).toBe(0);
    expect(camera.fov).toBe(45);
  });

  it("should render with @napi-rs/canvas", () => {
    const canvas = createCanvas(200, 100);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(0, 0, 200, 100);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("Smoke Test", 20, 50);

    const buffer = canvas.toBuffer("image/png");
    expect(buffer.length).toBeGreaterThan(0);
  });
});
