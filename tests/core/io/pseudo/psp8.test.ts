import { describe, it, expect } from "vitest";

import { fromPSP8 } from "@/core/io/pseudo/psp8";

describe("PSP8 parser", () => {
  describe("error handling", () => {
    it("throws on too-short input", () => {
      expect(() => fromPSP8("line1\nline2\n")).toThrow("too short");
    });

    it("throws on non-PSP8 pspcod", () => {
      const bad = `Title
1.0 1.0 0.0
1    11     0     0     5     0
0.0 0.0 0.0
1
0
`;
      expect(() => fromPSP8(bad)).toThrow("pspcod=8");
    });
  });
});
