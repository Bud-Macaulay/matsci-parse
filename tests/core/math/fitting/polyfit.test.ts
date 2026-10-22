import { describe, expect, it } from "vitest";
import { polyfit, polyval } from "@/core/math/fitting/polyfit";
import { expectVectorClose } from "../../../helpers/matrix";

describe("polyfit", () => {
  it("matches numpy.polyfit (reversed order) on noisy quadratic data", () => {
    const c = polyfit([0, 1, 2, 3, 4, 5], [1.1, 2.9, 9.2, 19.1, 33.2, 50.8], 2);
    // numpy.polyfit(..., 2) = [1.967857142857144, 0.14071428571428174, 0.9928571428571568]
    expectVectorClose(c, [0.9928571428571568, 0.14071428571428174, 1.967857142857144], 11);
  });

  it("recovers an exact cubic far from the origin (internal scaling)", () => {
    const xs = [100, 101, 102, 103, 104, 105, 106];
    const p = [-3, 0.5, 2e-3, -1e-5];
    const c = polyfit(xs, xs.map((x) => polyval(p, x)), 3);
    xs.forEach((x) => expect(polyval(c, x)).toBeCloseTo(polyval(p, x), 8));
    expect(c[3]).toBeCloseTo(-1e-5, 12);
  });

  it("polyval uses ascending coefficients", () => {
    expect(polyval([1, 2, 3], 2)).toBe(17);
    expect(polyval([], 2)).toBe(0);
  });

  it("validates input", () => {
    expect(() => polyfit([1, 2], [1], 1)).toThrow(/same length/);
    expect(() => polyfit([1, 2], [1, 2], 2)).toThrow(/at least 3/);
    expect(() => polyfit([1, 2], [1, 2], -1)).toThrow(/degree/);
    expect(() => polyfit([1, 1, 1], [1, 2, 3], 1)).toThrow(/distinct/);
  });
});
