import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { normalize } from "@/core/matrix/operations/vector/normalize";

describe("normalize", () => {
  it("normalizes a simple vector", () => {
    const v = createMatrix(2, 1, [3, 4]);

    const r = normalize(v);

    expect(r.data[0]).toBeCloseTo(0.6);
    expect(r.data[1]).toBeCloseTo(0.8);
  });

  it("produces unit length", () => {
    const v = createMatrix(3, 1, [1, 2, 2]);

    const r = normalize(v);

    const len = Math.sqrt(r.data[0] ** 2 + r.data[1] ** 2 + r.data[2] ** 2);

    expect(len).toBeCloseTo(1);
  });

  it("throws on zero vector", () => {
    const v = createMatrix(3, 1, [0, 0, 0]);

    expect(() => normalize(v)).toThrow();
  });
});
