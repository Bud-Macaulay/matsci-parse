import { describe, it, expect } from "vitest";
import { fnv1a32 } from "@/core/math/hash";

describe("fnv1a32", () => {
  it("matches the canonical test vectors on byte input", () => {
    expect(fnv1a32([])).toBe(0x811c9dc5);
    expect(fnv1a32([0x61])).toBe(0xe40c292c);
    // "foobar"
    expect(fnv1a32([102, 111, 111, 98, 97, 114])).toBe(0xbf9cf968);
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("accepts typed arrays and distinguishes wider integers", () => {
    expect(fnv1a32(new Uint8Array([1, 2, 3]))).toBe(fnv1a32([1, 2, 3]));
    expect(fnv1a32([1, 2, 3])).not.toBe(fnv1a32([1, 2, 4]));
    expect(fnv1a32([300])).not.toBe(fnv1a32([300 + 65536]));
    expect(fnv1a32([1, 2, 3])).toBe(fnv1a32([1, 2, 3]));
  });
});
