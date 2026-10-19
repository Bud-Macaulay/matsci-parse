import { describe, expect, it } from "vitest";

import {
  bandFrequencies,
  connectBands,
  cornerQPoints,
  createPhononBands,
  labelCorners,
  labelHighSymmetryPoints,
  mergeLabels,
  modeEigenvector,
  pathBreaks,
  qpointDistances,
  type PhononBands,
  type QPointLabel,
} from "@/core/phonon";
import { fromPW } from "@/core/io/pw";
import { createLattice } from "@/core/lattice";
import { aluminumPw, bnPw } from "../io/teststrings/phonon";

const cubic = { lattice: createLattice([2, 2, 2]), sites: [{ species: { symbol: "Al" }, frac: [0, 0, 0] }] };

/** Bands on a list of q-points with zero frequencies and eigenvectors. */
function onPath(structure: PhononBands["structure"], qpoints: number[][], labels?: QPointLabel[]): PhononBands {
  const nmodes = 3 * structure.sites.length;
  return createPhononBands({
    structure,
    qpoints: qpoints.flat(),
    frequencies: new Float64Array(qpoints.length * nmodes),
    eigenvectors: new Float64Array(qpoints.length * nmodes * nmodes * 2),
    labels,
  });
}

/** n evenly spaced points from a to b, excluding b. */
function segment(a: number[], b: number[], n: number): number[][] {
  return [...Array(n)].map((_, i) => a.map((x, j) => x + ((b[j] - x) * i) / n));
}

describe("createPhononBands", () => {
  it("validates array sizes and label indices", () => {
    expect(() => onPath(cubic, [[0, 0, 0]], [{ index: 1, label: "X" }])).toThrow(/out of range/);
    expect(() =>
      createPhononBands({ structure: cubic, qpoints: [0, 0, 0], frequencies: [1, 2], eigenvectors: [] }),
    ).toThrow(/Expected 3 frequencies/);
  });

  it("exposes per-band and per-mode slices", () => {
    const bands = createPhononBands({
      structure: cubic,
      qpoints: [0, 0, 0, 0.5, 0, 0],
      frequencies: [1, 2, 3, 4, 5, 6],
      eigenvectors: Array.from({ length: 36 }, (_, i) => i),
    });
    expect(Array.from(bandFrequencies(bands, 2))).toEqual([3, 6]);
    expect(modeEigenvector(bands, 1, 0)).toEqual([[[18, 19], [20, 21], [22, 23]]]);
  });
});

describe("path geometry", () => {
  it("merges adjacent differing labels into breaks", () => {
    const labels = [
      { index: 0, label: "Γ" },
      { index: 9, label: "X" },
      { index: 10, label: "R" },
      { index: 19, label: "M" },
      { index: 20, label: "M" },
    ];
    expect(mergeLabels(labels)).toEqual({
      labels: [{ index: 0, label: "Γ" }, { index: 9, label: "X|R" }, { index: 19, label: "M" }],
      breaks: [9],
    });
  });

  it("does not advance the distance across a break", () => {
    const qs = [[0, 0, 0], [0.5, 0, 0], [0.5, 0.5, 0.5], [0.5, 0.5, 0]];
    const labels = [{ index: 1, label: "X" }, { index: 2, label: "R" }];
    const d = qpointDistances(onPath(cubic, qs, labels));
    // |Δq| = 0.5 · |b1| = 0.5 · 1/2 Å⁻¹ (crystallographic, no 2π)
    expect(Array.from(d)).toEqual([0, 0.25, 0.25, 0.5]);
    expect(pathBreaks(onPath(cubic, qs, labels))).toEqual([1]);
  });

  it("finds corners, including a jump straight back along the path", () => {
    const G = [0, 0, 0];
    const X = [0.5, 0, 0];
    const M = [0.5, 0.5, 0];
    const qs = [...segment(G, X, 4), ...segment(X, M, 4), ...segment(M, G, 4), G, X];
    // corners: Γ(0) X(4) M(8) Γ(12) then the jump back to X at 13 (end)
    expect(cornerQPoints(onPath(cubic, qs))).toEqual([[0, 12], [4, 13], [8]]);
    const labelled = labelCorners(onPath(cubic, qs, [{ index: 4, label: "X" }]));
    expect(labelled.labels).toEqual([
      { index: 0, label: "Q_1" },
      { index: 4, label: "X" },
      { index: 8, label: "Q_2" },
      { index: 12, label: "Q_1" },
      { index: 13, label: "X" },
    ]);
  });
});

describe("connectBands", () => {
  it("follows branches through a crossing", () => {
    // Two branches with eigenvectors along x and y that cross between q=1
    // and q=2; files list modes by ascending frequency, swapping them.
    const ex = [1, 0, 0, 0, 0, 0];
    const ey = [0, 0, 1, 0, 0, 0];
    const ez = [0, 0, 0, 0, 1, 0];
    const bands = createPhononBands({
      structure: cubic,
      qpoints: segment([0, 0, 0], [0.5, 0, 0], 4).flat(),
      frequencies: [1, 4, 9, 2, 3, 9, 2, 3, 9, 1, 4, 9],
      eigenvectors: [ex, ey, ez, ex, ey, ez, ey, ex, ez, ey, ex, ez].flat(),
    });
    const connected = connectBands(bands);
    expect(Array.from(bandFrequencies(connected, 0))).toEqual([1, 2, 3, 4]);
    expect(Array.from(bandFrequencies(connected, 1))).toEqual([4, 3, 2, 1]);
    expect(modeEigenvector(connected, 3, 0)[0]).toEqual([[1, 0], [0, 0], [0, 0]]);
  });

  it("keeps the order across path breaks", () => {
    const ex = [1, 0, 0, 0, 0, 0];
    const ey = [0, 0, 1, 0, 0, 0];
    const ez = [0, 0, 0, 0, 1, 0];
    const bands = createPhononBands({
      structure: cubic,
      qpoints: [0, 0, 0, 0.5, 0, 0],
      frequencies: [1, 2, 3, 1, 2, 3],
      eigenvectors: [ex, ey, ez, ey, ex, ez].flat(),
      labels: [{ index: 0, label: "A" }, { index: 1, label: "B" }],
    });
    expect(connectBands(bands).frequencies).toEqual(bands.frequencies);
  });
});

describe("labelHighSymmetryPoints", () => {
  it("names hexagonal M and K given in a non-standard cell setting", async () => {
    const bn = fromPW(bnPw);
    const G = [0, 0, 0];
    const M = [0.5, 0, 0];
    const K = [1 / 3, 1 / 3, 0];
    const qs = [...segment(G, M, 5), ...segment(M, K, 5), ...segment(K, G, 5), G];
    const bands = await labelHighSymmetryPoints(onPath(bn, qs));
    expect(bands.labels).toEqual([
      { index: 0, label: "Γ" },
      { index: 5, label: "M" },
      { index: 10, label: "K" },
      { index: 15, label: "Γ" },
    ]);
  });

  it("recognizes points equivalent by symmetry or a reciprocal lattice vector", async () => {
    const al = fromPW(aluminumPw);
    // QE fcc basis: X = (1/2, 0, 1/2), L = (1/2, 1/2, 1/2), Γ + G = (1, 1, 1)
    const qs = [[0, 0, 0], [0.5, 0, 0.5], [1, 1, 1], [0.5, 0.5, 0.5]];
    const bands = await labelHighSymmetryPoints(onPath(al, qs));
    expect(bands.labels.map((l) => l.label)).toEqual(["Γ", "X", "Γ", "L"]);
  });
});
