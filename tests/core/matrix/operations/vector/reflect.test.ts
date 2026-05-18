import { describe, expect, it } from "vitest";
import { reflect } from "@/core/matrix/operations/vector/reflect";

describe("reflect (vector)", () => {
  it("reflects across x-axis normal in 2D", () => {
    const v = new Float64Array([1, -1]);
    const n = new Float64Array([0, 1]);

    const r = reflect(v, n);

    expect(Array.from(r)).toEqual([1, 1]);
  });

  it("reflects diagonal normal case", () => {
    const v = new Float64Array([1, 0]);
    const n = new Float64Array([1, 1]);

    const r = reflect(v, n);

    expect(r[0]).toBeCloseTo(0);
    expect(r[1]).toBeCloseTo(-1);
  });

  it("reflects in 3D", () => {
    const v = new Float64Array([1, 2, 3]);
    const n = new Float64Array([0, 0, 1]);

    const r = reflect(v, n);

    expect(Array.from(r)).toEqual([1, 2, -3]);
  });

  it("does not mutate inputs", () => {
    const v = new Float64Array([2, 3]);
    const n = new Float64Array([0, 1]);

    reflect(v, n);

    expect(Array.from(v)).toEqual([2, 3]);
    expect(Array.from(n)).toEqual([0, 1]);
  });

  it("throws on zero normal", () => {
    const v = new Float64Array([1, 2]);
    const n = new Float64Array([0, 0]);

    expect(() => reflect(v, n)).toThrow();
  });
});
