import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",

      include: ["lib/**/*.{ts,js}"],
      exclude: ["lib/**/*.d.ts", "src/webapp/**"],
    },

    include: ["**/tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // Mock the ?url import in tests
      "moyo-wasm/moyo_wasm_bg.wasm?url": "moyo-wasm/moyo_wasm_bg.wasm",
    },
  },
});
