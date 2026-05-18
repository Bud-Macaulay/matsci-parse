import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { reflect } from "@/core/matrix/operations/vector/reflect";

describe("reflect", () => {
  it("reflects across x-axis normal in 2D", () => {
    const v = createMatrix(2, 1, [1, -1]);
    const n = createMatrix(2, 1, [0, 1]);

    const r = reflect(v, n);

    expect(Array.from(r.data)).toEqual([1, 1]);
  });

  it("reflects a vector correctly in 2D diagonal case", () => {
    const v = createMatrix(2, 1, [1, 0]);
    const n = createMatrix(2, 1, [1, 1]);

    const r = reflect(v, n);

    expect(r.data[0]).toBeCloseTo(0);
    expect(r.data[1]).toBeCloseTo(-1);
  });

  it("reflects in 3D", () => {
    const v = createMatrix(3, 1, [1, 2, 3]);
    const n = createMatrix(3, 1, [0, 0, 1]);

    const r = reflect(v, n);

    expect(Array.from(r.data)).toEqual([1, 2, -3]);
  });

  it("does not mutate inputs", () => {
    const v = createMatrix(2, 1, [2, 3]);
    const n = createMatrix(2, 1, [0, 1]);

    reflect(v, n);

    expect(Array.from(v.data)).toEqual([2, 3]);
    expect(Array.from(n.data)).toEqual([0, 1]);
  });

  it("throws on zero normal", () => {
    const v = createMatrix(2, 1, [1, 2]);
    const n = createMatrix(2, 1, [0, 0]);

    expect(() => reflect(v, n)).toThrow();
  });
});
