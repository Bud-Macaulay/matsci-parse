import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js"],
  testMatch: ["**/tests/**/*.test.ts"],

  // --- coverage settings ---
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["lib/**/*.{ts,js}", "!lib/**/*.d.ts", "!src/webapp/**"],
  coverageReporters: ["text", "lcov"],
};

export default config;
