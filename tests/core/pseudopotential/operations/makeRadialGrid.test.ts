import { describe, it, expect } from "vitest";

import { makeRadialGrid } from "@/core/pseudopotential/operations";

describe("makeRadialGrid", () => {
  it("builds logarithmic grids", () => {
    const { r, rab } = makeRadialGrid({ npts: 100, rmax: 20, type: "log" });
    expect(r.length).toBe(100);
    expect(rab.length).toBe(100);
    expect(r[99]).toBeCloseTo(20, 10);
    expect(r[1] / r[0]).toBeGreaterThan(1);
  });

  it("builds linear grids", () => {
    const { r, rab } = makeRadialGrid({ npts: 50, rmax: 10, type: "linear" });
    expect(r[0]).toBe(0);
    expect(r[49]).toBeCloseTo(10);
    expect(rab[10]).toBeCloseTo(10 / 49);
  });

  it("collapses single-point grids to the endpoint", () => {
    for (const type of ["log", "linear"] as const) {
      const { r, rab } = makeRadialGrid({ npts: 1, rmax: 20, type });
      expect(Array.from(r)).toEqual([20]);
      expect(Array.from(rab)).toEqual([0]);
    }
  });

  it("rejects empty grids", () => {
    expect(() => makeRadialGrid({ npts: 0, rmax: 20 })).toThrow("npts >= 1");
  });
});
