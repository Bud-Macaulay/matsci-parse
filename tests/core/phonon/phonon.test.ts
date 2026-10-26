import { describe, expect, it } from "vitest";

import {
  bandFrequencies,
  connectBands,
  cornerQPoints,
  createPhononBands,
  labelCorners,
  labelHighSymmetryPoints,
  qpointTicks,
  modeEigenvector,
  pathBreaks,
  qpointDistances,
  qpointLabels,
  type PhononBands,
  type QPointLabel,
} from "@/core/phonon";
import { createSampledPath } from "@/core/kpoints";
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

  it("takes Float64Arrays without copying and copies other array-likes", () => {
    const eigenvectors = new Float64Array(18);
    const frequencies = [1, 2, 3];
    const bands = createPhononBands({ structure: cubic, qpoints: [0, 0, 0], frequencies, eigenvectors });
    expect(bands.eigenvectors).toBe(eigenvectors);
    expect(bands.frequencies).toBeInstanceOf(Float64Array);
    expect(Array.from(bands.frequencies)).toEqual(frequencies);
  });
});

describe("path geometry", () => {
  it("merges labels at segment boundaries into ticks", () => {
    const G = [0, 0, 0];
    const X = [0.5, 0, 0];
    const R = [0.5, 0.5, 0.5];
    const M = [0.5, 0.5, 0];
    // Γ→X | R→M, M written twice (a joint), M→Γ
    const qs = [...segment(G, X, 2), X, ...segment(R, M, 2), M, ...segment(M, G, 2), G];
    const labels = [
      { index: 0, label: "Γ" },
      { index: 2, label: "X" },
      { index: 3, label: "R" },
      { index: 5, label: "M" },
      { index: 6, label: "M" },
      { index: 8, label: "Γ" },
    ];
    expect(qpointTicks(onPath(cubic, qs, labels))).toEqual({
      labels: [
        { index: 0, label: "Γ" },
        { index: 2, label: "X|R" },
        { index: 5, label: "M" },
        { index: 8, label: "Γ" },
      ],
      breaks: [2],
    });
  });

  it("keeps a jump between equally labelled points as a break", () => {
    // Γ→X, then a jump to the equivalent X' = (0, 0.5, 0), also labelled X
    const qs = [[0, 0, 0], [0.25, 0, 0], [0.5, 0, 0], [0, 0.5, 0], [0, 0.25, 0], [0, 0, 0]];
    const labels = [
      { index: 0, label: "Γ" },
      { index: 2, label: "X" },
      { index: 3, label: "X" },
      { index: 5, label: "Γ" },
    ];
    const bands = onPath(cubic, qs, labels);
    expect(pathBreaks(bands)).toEqual([2]);
    expect(qpointTicks(bands)).toEqual({
      labels: [{ index: 0, label: "Γ" }, { index: 2, label: "X|X" }, { index: 5, label: "Γ" }],
      breaks: [2],
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
    expect(qpointLabels(labelled)).toEqual([
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

  it("matches modes optimally where greedy matching fails", () => {
    // q0: modes along x, y, z. q1: an orthonormal set whose squared overlaps
    // with them (rows: x, y, z; columns: c0, c1, c2) are
    //   x [0.36 0.352 0.288]
    //   y [0.64 0.198 0.162]
    //   z [0    0.45  0.55 ]
    // Greedy in mode order gives x its best match c0, leaving y on c1
    // (total 1.108); the optimum is x→c1, y→c0, z→c2 (total 1.542).
    const [c, s] = [Math.sqrt(0.55), Math.sqrt(0.45)];
    const vec = ([x, y, z]: number[]) => [x, 0, y, 0, z, 0];
    const bands = createPhononBands({
      structure: cubic,
      qpoints: segment([0, 0, 0], [0.5, 0, 0], 2).flat(),
      frequencies: [1, 2, 3, 1.1, 2.1, 3.1],
      eigenvectors: [
        [1, 0, 0], [0, 1, 0], [0, 0, 1],
        [0.6, 0.8, 0], [-0.8 * c, 0.6 * c, s], [-0.8 * s, 0.6 * s, -c],
      ].flatMap(vec),
    });
    expect(Array.from(connectBands(bands).frequencies)).toEqual([1, 2, 3, 2.1, 1.1, 3.1]);
  });

  it("keeps the frequency order when overlaps tie", () => {
    const bands = onPath(cubic, segment([0, 0, 0], [0.5, 0, 0], 3));
    const freqs = Float64Array.from({ length: 9 }, (_, i) => i);
    const connected = connectBands({ ...bands, frequencies: freqs });
    expect(connected.frequencies).toEqual(freqs);
  });

  it("does not mutate its input", () => {
    const ex = [1, 0, 0, 0, 0, 0];
    const ey = [0, 0, 1, 0, 0, 0];
    const ez = [0, 0, 0, 0, 1, 0];
    const bands = createPhononBands({
      structure: cubic,
      qpoints: [0, 0, 0, 0.1, 0, 0],
      frequencies: [1, 2, 3, 1, 2, 3],
      eigenvectors: [ex, ey, ez, ey, ex, ez].flat(),
    });
    const freqs = bands.frequencies.slice();
    const vecs = bands.eigenvectors.slice();
    const connected = connectBands(bands);
    expect(connected).not.toBe(bands);
    expect(Array.from(connected.frequencies)).toEqual([1, 2, 3, 2, 1, 3]);
    expect(bands.frequencies).toEqual(freqs);
    expect(bands.eigenvectors).toEqual(vecs);
  });

  it("keeps the order across path breaks", () => {
    const ex = [1, 0, 0, 0, 0, 0];
    const ey = [0, 0, 1, 0, 0, 0];
    const ez = [0, 0, 0, 0, 1, 0];
    const bands = createPhononBands({
      structure: cubic,
      qpoints: createSampledPath([0, 0, 0, 0.5, 0, 0], [
        { start: 0, end: 0, from: "A", to: "A" },
        { start: 1, end: 1, from: "B", to: "B" },
      ]),
      frequencies: [1, 2, 3, 1, 2, 3],
      eigenvectors: [ex, ey, ez, ey, ex, ez].flat(),
    });
    expect(pathBreaks(bands)).toEqual([0]);
    expect(connectBands(bands).frequencies).toEqual(bands.frequencies);
  });

  describe("with masses", () => {
    // Two atoms (masses 1 and 16) moving along x. The two x-modes are true
    // eigenvectors rotated by 10° at q0 and 70° at q1 in (x1, x2), so their
    // squared overlaps are [[0.25, 0.75], [0.75, 0.25]]: the branches swap.
    // The file stores displacements u_s ∝ e_s / √M_s, whose plain overlaps
    // favour keeping the order instead. The other four modes are pure y/z.
    const masses = [1, 16];
    const diatomic = {
      lattice: createLattice([2, 2, 2]),
      sites: [
        { species: { symbol: "H" }, frac: [0, 0, 0] },
        { species: { symbol: "O" }, frac: [0.5, 0.5, 0.5] },
      ],
    };
    /** Normalized displacement pattern of a true eigenvector, [site][xyz][re, im]. */
    const displacement = (e: number[]) => {
      const u = e.map((x, k) => x / Math.sqrt(masses[Math.floor(k / 3)]));
      const norm = Math.hypot(...u);
      return u.flatMap((x) => [x / norm, 0]);
    };
    const xModes = (deg: number) => {
      const t = (deg * Math.PI) / 180;
      return [
        [Math.cos(t), 0, 0, Math.sin(t), 0, 0],
        [-Math.sin(t), 0, 0, Math.cos(t), 0, 0],
      ];
    };
    const yzModes = [1, 4, 2, 5].map((k) => [0, 1, 2, 3, 4, 5].map((j) => (j === k ? 1 : 0)));
    const bands = createPhononBands({
      structure: diatomic,
      qpoints: segment([0, 0, 0], [0.5, 0, 0], 2).flat(),
      frequencies: [1, 2, 3, 4, 5, 6, 1.1, 2.1, 3.1, 4.1, 5.1, 6.1],
      eigenvectors: [...xModes(10), ...yzModes, ...xModes(70), ...yzModes].flatMap(displacement),
    });

    it("matches displacement patterns by their mass-weighted eigenvectors", () => {
      const connected = connectBands(bands, { masses });
      expect(Array.from(bandFrequencies(connected, 0))).toEqual([1, 2.1]);
      expect(Array.from(bandFrequencies(connected, 1))).toEqual([2, 1.1]);
    });

    it("is misled by the unweighted displacements", () => {
      expect(connectBands(bands).frequencies).toEqual(bands.frequencies);
    });

    it("rejects a mass list of the wrong length", () => {
      expect(() => connectBands(bands, { masses: [1] })).toThrow(/Expected 2 masses/);
    });
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
    expect(qpointLabels(bands)).toEqual([
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
    expect(qpointLabels(bands).map((l) => l.label)).toEqual(["Γ", "X", "Γ", "L"]);
  });
});
