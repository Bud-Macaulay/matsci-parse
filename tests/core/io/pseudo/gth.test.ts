import { describe, it, expect } from "vitest";

import { fromGTH } from "@/core/io/pseudo/gth";

describe("GTH parser", () => {
  describe("error handling", () => {
    it("throws on empty input", () => {
      expect(() => fromGTH("")).toThrow("No GTH entries found");
    });

    it("handles comment-only input gracefully", () => {
      expect(() => fromGTH("# just comments\n# more comments")).toThrow("No GTH entries found");
    });
  });
});
