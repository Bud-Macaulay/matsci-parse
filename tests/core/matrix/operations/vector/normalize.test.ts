import { describe, expect, it } from "vitest";
import { normalize } from "@/core/matrix/operations/vector/normalize";

describe("normalize (vector)", () => {
  it("normalizes a simple vector", () => {
    const v = new Float64Array([3, 4]);

    const r = normalize(v);

    expect(r[0]).toBeCloseTo(0.6);
    expect(r[1]).toBeCloseTo(0.8);
  });

  it("produces unit length", () => {
    const v = new Float64Array([1, 2, 2]);

    const r = normalize(v);

    let len = 0;
    for (const x of r) len += x * x;

    expect(Math.sqrt(len)).toBeCloseTo(1);
  });

  it("throws on zero vector", () => {
    const v = new Float64Array([0, 0, 0]);

    expect(() => normalize(v)).toThrow();
  });
});
