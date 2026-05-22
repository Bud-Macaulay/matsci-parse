import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",

    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      reportOnFailure: true,

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
      "@": path.resolve(__dirname, "lib"),
    },
  },
});
