import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    // --- coverage settings (equivalent to Jest) ---
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
});
