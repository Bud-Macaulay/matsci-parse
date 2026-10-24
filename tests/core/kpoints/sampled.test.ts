import { describe, expect, it } from "vitest";

import {
  createSampledPath,
  kpointCoord,
  labelPath,
  pathBreaks,
  pathDistances,
  pathLabels,
  sampleGrid,
  samplePath,
  samplePoints,
  toKPath,
} from "@/core/kpoints";
import { makeGrid } from "@/core/kpoints/shift";
import { createLattice } from "@/core/lattice";

const G = [0, 0, 0];
const X = [0.5, 0, 0];
const M = [0.5, 0.5, 0];
const R = [0.5, 0.5, 0.5];

describe("createSampledPath", () => {
  it("accepts shared and duplicated corners", () => {
    const path = createSampledPath([G, X, M, M, R].flat(), [
      { start: 0, end: 1, from: "Γ", to: "X" },
      { start: 1, end: 2, from: "X", to: "M" },
      { start: 3, end: 4, from: "M", to: "R" },
    ]);
    expect(path.nkpts).toBe(5);
    expect(kpointCoord(path, 4)).toEqual(R);
  });

  it("rejects segments that do not cover the points in order", () => {
    const coords = [G, X, M].flat();
    expect(() => createSampledPath(coords, [])).toThrow(/at least one segment/);
    expect(() => createSampledPath(coords, [{ start: 1, end: 2 }])).toThrow(/start at 0/);
    expect(() => createSampledPath(coords, [{ start: 0, end: 1 }])).toThrow(/3 k-points/);
    expect(() =>
      createSampledPath(coords, [{ start: 0, end: 0 }, { start: 2, end: 2 }]),
    ).toThrow(/must start at 0 or 1/);
    expect(() =>
      createSampledPath(coords, [{ start: 0, end: 1, to: "X" }, { start: 1, end: 2, from: "Y" }]),
    ).toThrow(/both 'X' and 'Y'/);
    expect(() => createSampledPath([0, 0], [{ start: 0, end: 0 }])).toThrow(/multiple of 3/);
  });
});

describe("labelPath", () => {
  // Γ → X → M, a jump, R → X: 8 points
  const coords = [G, [0.25, 0, 0], X, [0.5, 0.25, 0], M, R, [0.5, 0.25, 0.25], X].flat();

  it("splits at corners and between consecutive labels", () => {
    const path = samplePath(coords, [
      { index: 0, label: "Γ" },
      { index: 2, label: "X" },
      { index: 4, label: "M" },
      { index: 5, label: "R" },
      { index: 7, label: "X" },
    ]);
    expect(path.segments).toEqual([
      { start: 0, end: 2, from: "Γ", to: "X" },
      { start: 2, end: 4, from: "X", to: "M" },
      { start: 5, end: 7, from: "R", to: "X" },
    ]);
    expect(pathBreaks(path)).toEqual([4]);
    expect(pathLabels(path).map((l) => `${l.index}:${l.label}`)).toEqual(["0:Γ", "2:X", "4:M", "5:R", "7:X"]);
  });

  it("keeps segment boundaries when labels are replaced", () => {
    const path = createSampledPath([G, X, X, M].flat(), [
      { start: 0, end: 1, from: "Γ", to: "X" },
      { start: 2, end: 3, from: "X", to: "M" },
    ]);
    const relabelled = labelPath(path, [{ index: 0, label: "G" }]);
    expect(relabelled.segments).toEqual([
      { start: 0, end: 1, from: "G" },
      { start: 2, end: 3 },
    ]);
    // a two-point segment labelled at both ends is not split
    expect(labelPath(path, pathLabels(path)).segments).toEqual(path.segments);
  });

  it("rejects labels out of range", () => {
    expect(() => samplePath([G, X].flat(), [{ index: 2, label: "M" }])).toThrow(/out of range/);
  });
});

describe("pathBreaks", () => {
  it("is a jump between segments, not a duplicated corner", () => {
    const path = createSampledPath([G, X, X, M, R].flat(), [
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
    expect(pathBreaks(path)).toEqual([3]);
    // |b1| = 1/2 Å⁻¹ for a = 2 Å; no distance across the joint or the break
    const d = pathDistances(path, createLattice([2, 2, 2]));
    expect(Array.from(d)).toEqual([0, 0.25, 0.25, 0.5, 0.5]);
  });
});

describe("toKPath", () => {
  it("names the segment ends", () => {
    const path = samplePath([G, [0.25, 0, 0], X, [0.5, 0.25, 0], M].flat(), [
      { index: 0, label: "Γ" },
      { index: 2, label: "X" },
      { index: 4, label: "M" },
    ]);
    expect(toKPath(path)).toEqual({
      kind: "path",
      points: { Γ: G, X, M },
      segments: [["Γ", "X"], ["X", "M"]],
    });
  });

  it("rejects unnamed ends and names reused for different points", () => {
    expect(() => toKPath(samplePath([G, X].flat()))).toThrow(/no label/);
    const reused = samplePath([G, X, M].flat(), [
      { index: 0, label: "A" },
      { index: 1, label: "B" },
      { index: 2, label: "A" },
    ]);
    expect(() => toKPath(reused)).toThrow(/'A' names two different/);
  });
});

describe("sampleGrid / samplePoints", () => {
  it("lists grid points with the first index fastest", () => {
    const grid = sampleGrid(makeGrid([2, 3, 1], [0, 0, 0]));
    expect(grid.nkpts).toBe(6);
    expect(kpointCoord(grid, 1)).toEqual([0.5, 0, 0]);
    expect(kpointCoord(grid, 2)).toEqual([0, 1 / 3, 0]);
  });

  it("checks weights against the points", () => {
    expect(samplePoints([G, X].flat(), [1, 3]).weights).toEqual(Float64Array.from([1, 3]));
    expect(() => samplePoints([G, X].flat(), [1])).toThrow(/Expected 2 weights/);
  });
});
