import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    testTimeout: 30000,
    include: ["tests/**/*.test.ts", "web/tests/**/*.test.ts"]
  }
});
