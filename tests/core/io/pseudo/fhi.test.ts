import { describe, it, expect } from "vitest";

import { fromFHI } from "@/core/io/pseudo/fhi";

describe("FHI parser", () => {
  describe("error handling", () => {
    it("throws on too-short input", () => {
      expect(() => fromFHI("line1\nline2\n")).toThrow("too short");
    });
  });
});
