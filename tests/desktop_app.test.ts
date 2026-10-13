import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DesktopAppHost, createDesktopBridge } from "../desktop/src/index.js";

describe("Cross-Platform Desktop Client (TASK-124)", () => {
  it("should configure 1440x900 native window with hardware acceleration", () => {
    const host = new DesktopAppHost({
      width: 1440,
      height: 900
    });

    const config = host.getWindowConfig();
    expect(config.width).toBe(1440);
    expect(config.height).toBe(900);
    expect(config.minWidth).toBe(1024);
    expect(config.minHeight).toBe(720);
    expect(config.hardwareAcceleration).toBe(true);
    expect(config.webPreferences.contextIsolation).toBe(true);
    expect(config.webPreferences.nodeIntegration).toBe(false);
  });

  it("should respond to getSystemInfo IPC request with host system metrics", async () => {
    const host = new DesktopAppHost();

    const info = await host.dispatchIpc("novel2motion:getSystemInfo", {});
    expect(info).toBeDefined();
    expect(typeof info.platform).toBe("string");
    expect(typeof info.cpuCount).toBe("number");
    expect(info.cpuCount).toBeGreaterThan(0);
    expect(typeof info.totalMemoryMb).toBe("number");
    expect(info.totalMemoryMb).toBeGreaterThan(0);
  });

  it("should bridge desktop API calls between preload bridge and host IPC dispatch", async () => {
    const host = new DesktopAppHost();
    const bridge = createDesktopBridge((channel, data) => host.dispatchIpc(channel, data));

    const sysInfo = await bridge.getSystemInfo();
    expect(sysInfo).toBeDefined();
    expect(sysInfo.nodeVersion).toMatch(/^v\d+/);
  });

  it("should provide valid electron-builder cross-platform distribution configuration in desktop/package.json", () => {
    const pkgPath = path.resolve("desktop/package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    expect(pkg.name).toBe("novel2motion-desktop");
    expect(pkg.build).toBeDefined();
    expect(pkg.build.appId).toBe("com.novel2motion.studio");

    // Linux
    expect(pkg.build.linux).toBeDefined();
    expect(pkg.build.linux.target).toContain("AppImage");

    // Windows
    expect(pkg.build.win).toBeDefined();
    expect(pkg.build.win.target).toContain("nsis");

    // macOS
    expect(pkg.build.mac).toBeDefined();
    expect(pkg.build.mac.target).toContain("dmg");
  });
});
