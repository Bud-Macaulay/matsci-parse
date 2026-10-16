import { describe, expect, it } from "vitest";

import { gcd, wrapFrac } from "@/core/math/numeric";

describe("wrapFrac", () => {
  it("leaves values in [0, 1) unchanged", () => {
    expect(wrapFrac(0)).toBe(0);
    expect(wrapFrac(0.3)).toBe(0.3);
    expect(wrapFrac(0.75)).toBe(0.75);
  });

  it("wraps values outside [0, 1)", () => {
    expect(wrapFrac(1)).toBe(0);
    expect(wrapFrac(1.25)).toBe(0.25);
    expect(wrapFrac(-0.25)).toBe(0.75);
    expect(wrapFrac(-3.5)).toBe(0.5);
  });

  it("never returns 1 for tiny negatives", () => {
    expect(wrapFrac(-1e-17)).toBe(0);
  });

  it("snaps values within eps of 0 or 1 to 0", () => {
    expect(wrapFrac(1e-13, 1e-12)).toBe(0);
    expect(wrapFrac(-1e-13, 1e-12)).toBe(0);
    expect(wrapFrac(1 - 1e-13, 1e-12)).toBe(0);
    expect(wrapFrac(0.5, 1e-12)).toBe(0.5);
  });

  it("does not snap without eps", () => {
    expect(wrapFrac(1e-13)).toBe(1e-13);
  });
});

describe("gcd", () => {
  it("computes the greatest common divisor", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(-12, 18)).toBe(6);
    expect(gcd(7, 0)).toBe(7);
    expect(gcd(0, 0)).toBe(0);
  });
});
