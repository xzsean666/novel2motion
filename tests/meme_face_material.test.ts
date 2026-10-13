import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import path from "node:path";
import {
  MemeFaceMaterial,
  ExpressionTextureManager,
  PuppetCharacter
} from "../src/engine/index.js";

describe("MemeFaceMaterial & Face Texture Switcher (TASK-114)", () => {
  const assetsDir = path.resolve(process.cwd(), "assets/characters/han_tianzun");
  const shockedPath = path.join(assetsDir, "shocked.png");
  const normalPath = path.join(assetsDir, "normal.png");

  beforeEach(() => {
    ExpressionTextureManager.clearCache();
  });

  afterEach(() => {
    ExpressionTextureManager.clearCache();
  });

  describe("ExpressionTextureManager", () => {
    it("should load real character PNG into a Three.js DataTexture", async () => {
      const texture = await ExpressionTextureManager.loadTextureFromFile(shockedPath);
      expect(texture).toBeInstanceOf(THREE.DataTexture);
      expect(texture.image.width).toBeGreaterThan(0);
      expect(texture.image.height).toBeGreaterThan(0);
      expect(texture.format).toBe(THREE.RGBAFormat);
    });

    it("should cache loaded textures for sub-millisecond reuse", async () => {
      const tex1 = await ExpressionTextureManager.loadTextureFromFile(shockedPath);
      const tex2 = await ExpressionTextureManager.loadTextureFromFile(shockedPath);
      expect(tex1).toBe(tex2); // Same cached instance!
    });

    it("should generate procedural textures for all standard emotion states", () => {
      const normalTex = ExpressionTextureManager.createProceduralFaceTexture("normal");
      const shockedTex = ExpressionTextureManager.createProceduralFaceTexture("shocked");
      const angryTex = ExpressionTextureManager.createProceduralFaceTexture("angry");

      expect(normalTex).toBeInstanceOf(THREE.DataTexture);
      expect(shockedTex).toBeInstanceOf(THREE.DataTexture);
      expect(angryTex).toBeInstanceOf(THREE.DataTexture);
    });
  });

  describe("MemeFaceMaterial Switching & Puppet Mounting", () => {
    let faceMat: MemeFaceMaterial;
    let puppet: PuppetCharacter;

    beforeEach(() => {
      puppet = new PuppetCharacter({
        id: "test_cultivator",
        name: "测试修仙者"
      });

      faceMat = new MemeFaceMaterial({
        initialExpression: "normal",
        textureMap: {
          normal: normalPath,
          shocked: shockedPath
        }
      });
    });

    afterEach(() => {
      faceMat.dispose();
      puppet.dispose();
    });

    it("should initialize with initial expression and valid plane mesh", () => {
      expect(faceMat.getCurrentExpression()).toBe("normal");
      expect(faceMat.mesh.name).toBe("MemeFacePlane");
      expect(faceMat.material.transparent).toBe(true);
      expect(faceMat.material.alphaTest).toBe(0.05);
    });

    it("should dynamically switch to Jacky Cheung shocked meme face", async () => {
      await faceMat.setExpression("shocked");
      expect(faceMat.getCurrentExpression()).toBe("shocked");
      expect(faceMat.material.map).toBeDefined();

      const shockedMap = faceMat.material.map as THREE.DataTexture;
      expect(shockedMap.image.width).toBeGreaterThan(0);
    });

    it("should support instant synchronous texture updates", () => {
      const customTex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
      faceMat.setTexture("custom_rage", customTex);
      expect(faceMat.getCurrentExpression()).toBe("custom_rage");
      expect(faceMat.material.map).toBe(customTex);
    });

    it("should mount directly onto PuppetCharacter face mount and detach cleanly", () => {
      faceMat.mountToPuppet(puppet);
      expect(puppet.faceMount.children).toContain(faceMat.mesh);

      faceMat.detach();
      expect(puppet.faceMount.children).not.toContain(faceMat.mesh);
    });
  });
});
