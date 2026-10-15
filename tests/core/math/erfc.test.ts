import { describe, it, expect } from "vitest";
import { erfc } from "@/core/math/erfc";

// Reference values from Python's math.erfc.
const cases: [number, number][] = [
  [0, 1.0],
  [0.1, 0.8875370839817152],
  [0.5, 0.4795001221869535],
  [1.0, 0.15729920705028513],
  [1.5, 0.033894853524689274],
  [2.0, 0.004677734981047265],
  [2.5, 0.0004069520174449589],
  [3.0, 2.2090496998585438e-5],
  [4.0, 1.541725790028002e-8],
  [5.257, 1.0494779572749548e-13],
  [6.0, 2.1519736712498916e-17],
  [8.0, 1.122429717298506e-29],
  [-0.5, 1.5204998778130465],
  [-2.0, 1.9953222650189528],
];

describe("erfc", () => {
  for (const [x, want] of cases) {
    it(`erfc(${x})`, () => {
      const got = erfc(x);
      const tol = 1e-14 * Math.max(1, Math.abs(want));
      expect(Math.abs(got - want)).toBeLessThan(tol);
    });
  }

  it("is symmetric about 1: erfc(-x) = 2 - erfc(x)", () => {
    for (const x of [0.3, 1.7, 3.1]) {
      expect(erfc(-x)).toBeCloseTo(2 - erfc(x), 14);
    }
  });
});
