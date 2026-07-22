import { describe, it, expect } from "vitest";

import { fromPSML } from "@/core/io/pseudo/psml";

describe("PSML parser", () => {
  describe("error handling", () => {
    it("throws on empty grid", () => {
      expect(() => fromPSML("<psml><grid><grid-data></grid-data></grid></psml>")).toThrow("Missing or empty grid");
    });
  });
});
