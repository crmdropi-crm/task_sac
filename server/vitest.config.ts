import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globals: true,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false, // comparten la misma base de datos de prueba
  },
});
