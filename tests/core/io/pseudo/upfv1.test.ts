import { describe, it, expect } from "vitest";

import { fromUPFv1 } from "@/core/io/pseudo/upf-v1";

describe("UPF v1 parser", () => {
  describe("error handling", () => {
    it("throws on non-version first line", () => {
      expect(() => fromUPFv1("not a version number")).toThrow("Not a UPF v1 file");
    });

    it("throws on missing PP_HEADER", () => {
      expect(() => fromUPFv1("0\nno header here")).toThrow("Missing PP_HEADER");
    });
  });
});
