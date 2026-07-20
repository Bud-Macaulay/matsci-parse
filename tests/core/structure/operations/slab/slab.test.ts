import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { mul } from "@/core/matrix/operations/mul";
import { norm } from "@/core/matrix/operations/vector/norm";
import { dot } from "@/core/matrix/operations/vector/dot";
import { transpose } from "@/core/matrix/operations/transpose";
import { determinant } from "@/core/matrix/operations/determinant";
import { latticePointsInSupercell } from "@/core/matrix/operations/latticePointsInSupercell";
import { reorientToNormal } from "@/core/structure/operations/slab/reorientToNormal";
import { addVacuum } from "@/core/structure/operations/slab/addVacuum";
import { calculateScaleFactor } from "@/core/structure/operations/slab/calculateScaleFactor";
import { makeSupercell } from "@/core/structure/operations/makeSupercell";
import { slabFromMillerIndex } from "@/core/structure/operations/slab/slabFromMillerIndex";
import { slabFromSites } from "@/core/structure/operations/slab/slabFromSites";
import type { Structure } from "@/core/structure/structure";

function cubicSi(): Structure {
  const a = 5.43;
  return {
    lattice: createLattice([a, 0, 0, 0, a, 0, 0, 0, a]),
    sites: [
      { species: { symbol: "Si" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "Si" }, frac: new Float64Array([0.5, 0.5, 0]) },
      { species: { symbol: "Si" }, frac: new Float64Array([0.5, 0, 0.5]) },
      { species: { symbol: "Si" }, frac: new Float64Array([0, 0.5, 0.5]) },
    ],
  };
}

function toCart(lattice: ReturnType<typeof createLattice>, frac: Float64Array): Float64Array {
  const bT = transpose(lattice.basis);
  const vec = { rows: 3, cols: 1, data: new Float64Array([frac[0], frac[1], frac[2]]) };
  const r = mul(bT, vec);
  return new Float64Array([r.data[0], r.data[1], r.data[2]]);
}

function pairwiseDistances(st: Structure): number[] {
  const dists: number[] = [];
  for (let i = 0; i < st.sites.length; i++) {
    for (let j = i + 1; j < st.sites.length; j++) {
      const ci = toCart(st.lattice, st.sites[i].frac);
      const cj = toCart(st.lattice, st.sites[j].frac);
      let d = 0;
      for (let k = 0; k < 3; k++) d += (ci[k] - cj[k]) ** 2;
      dists.push(Math.sqrt(d));
    }
  }
  return dists.sort((a, b) => a - b);
}

function getNormal(h: number, k: number, l: number, lattice: ReturnType<typeof createLattice>): Float64Array {
  const recip = reciprocalLatticeCrystallographic(lattice);
  const rb = recip.basis.data;
  const raw = new Float64Array([
    h * rb[0] + k * rb[3] + l * rb[6],
    h * rb[1] + k * rb[4] + l * rb[7],
    h * rb[2] + k * rb[5] + l * rb[8],
  ]);
  return new Float64Array(raw.map((x) => x / norm(raw)));
}

// ── reorientToNormal ──────────────────────────────────────────────

describe("reorientToNormal", () => {
  it("aligns [0,0,1] normal (already along z)", () => {
    const s = cubicSi();
    const r = reorientToNormal(s, new Float64Array([0, 0, 1]));
    const b = r.lattice.basis.data;
    expect(b[6]).toBeCloseTo(0, 10);
    expect(b[7]).toBeCloseTo(0, 10);
    expect(b[8]).toBeGreaterThan(0);
  });

  it("aligns [1,0,0] normal: c-vector ends up along x", () => {
    const s = cubicSi();
    const r = reorientToNormal(s, new Float64Array([1, 0, 0]));
    const b = r.lattice.basis.data;
    expect(Math.abs(b[6])).toBeCloseTo(5.43, 8);
    expect(b[7]).toBeCloseTo(0, 8);
    expect(b[8]).toBeCloseTo(0, 8);
  });

  it("preserves Cartesian positions", () => {
    const s = cubicSi();
    const normals = [
      new Float64Array([1, 0, 0]),
      new Float64Array([0, 1, 0]),
      new Float64Array([1, 1, 0]),
      new Float64Array([1, 1, 1]),
      new Float64Array([1, 2, 3]),
    ];
    for (const n of normals) {
      const r = reorientToNormal(s, n);
      for (let i = 0; i < s.sites.length; i++) {
        const cOrig = toCart(s.lattice, s.sites[i].frac);
        const cNew = toCart(r.lattice, r.sites[i].frac);
        for (let j = 0; j < 3; j++) {
          expect(cNew[j]).toBeCloseTo(cOrig[j], 8);
        }
      }
    }
  });
});

// ── addVacuum ─────────────────────────────────────────────────────

describe("addVacuum", () => {
  it("extends c-vector by vacuum thickness", () => {
    const s = cubicSi();
    const origCLen = norm(new Float64Array([s.lattice.basis.data[6], s.lattice.basis.data[7], s.lattice.basis.data[8]]));
    const vac = addVacuum(s, 10.0);
    const newCLen = norm(new Float64Array([vac.lattice.basis.data[6], vac.lattice.basis.data[7], vac.lattice.basis.data[8]]));
    expect(newCLen).toBeCloseTo(origCLen + 10, 10);
  });

  it("preserves Cartesian positions", () => {
    const s = cubicSi();
    const vac = addVacuum(s, 15.0);
    for (let i = 0; i < s.sites.length; i++) {
      const cOrig = toCart(s.lattice, s.sites[i].frac);
      const cNew = toCart(vac.lattice, vac.sites[i].frac);
      for (let j = 0; j < 3; j++) {
        expect(cNew[j]).toBeCloseTo(cOrig[j], 8);
      }
    }
  });

  it("returns same structure for thickness <= 0", () => {
    const s = cubicSi();
    expect(addVacuum(s, 0)).toBe(s);
    expect(addVacuum(s, -5)).toBe(s);
  });
});

// ── calculateScaleFactor ──────────────────────────────────────────

describe("calculateScaleFactor", () => {
  it("returns integer matrix with nonzero determinant", () => {
    const s = cubicSi();
    const cases: [number, number, number][] = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [1, 1, 0], [1, 0, 1], [0, 1, 1],
      [1, 1, 1], [1, 2, 3], [2, 1, 0],
    ];
    for (const [h, k, l] of cases) {
      const U = calculateScaleFactor([h, k, l], s.lattice);
      expect(U.rows).toBe(3);
      expect(U.cols).toBe(3);
      expect(Math.abs(determinant(U))).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < 9; i++) {
        expect(U.data[i]).toBe(Math.round(U.data[i]));
      }
    }
  });

  it("in-plane rows are perpendicular to the surface normal", () => {
    const s = cubicSi();
    const cases: [number, number, number][] = [
      [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 2, 3], [2, 1, 0],
    ];
    for (const [h, k, l] of cases) {
      const U = calculateScaleFactor([h, k, l], s.lattice);
      const normal = getNormal(h, k, l, s.lattice);
      const basis = s.lattice.basis.data;
      for (let row = 0; row < 2; row++) {
        const r = U.data.slice(row * 3, row * 3 + 3);
        const rv = new Float64Array([
          r[0] * basis[0] + r[1] * basis[3] + r[2] * basis[6],
          r[0] * basis[1] + r[1] * basis[4] + r[2] * basis[7],
          r[0] * basis[2] + r[1] * basis[5] + r[2] * basis[8],
        ]);
        expect(Math.abs(dot(rv, normal))).toBeLessThan(1e-10);
      }
    }
  });
});

// ── latticePointsInSupercell ──────────────────────────────────────

describe("latticePointsInSupercell", () => {
  it("returns 1 point for identity", () => {
    expect(latticePointsInSupercell(identity(3)).length).toBe(1);
  });

  it("returns 2 points for diag(2,1,1)", () => {
    const U = createMatrix(3, 3, [2, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(latticePointsInSupercell(U).length).toBe(2);
  });

  it("returns 4 points for diag(2,2,1)", () => {
    const U = createMatrix(3, 3, [2, 0, 0, 0, 2, 0, 0, 0, 1]);
    expect(latticePointsInSupercell(U).length).toBe(4);
  });

  it("returns |det(U)| points for non-diagonal U", () => {
    const s = cubicSi();
    const U = calculateScaleFactor([1, 1, 1], s.lattice);
    const absDet = Math.abs(Math.round(determinant(U)));
    expect(latticePointsInSupercell(U).length).toBe(absDet);
  });
});

// ── makeSupercell ─────────────────────────────────────────────────

describe("makeSupercell", () => {
  it("identity produces same structure", () => {
    const s = cubicSi();
    expect(makeSupercell(s, identity(3)).sites.length).toBe(s.sites.length);
  });

  it("diag(2,1,1) doubles atoms along a", () => {
    const s = cubicSi();
    const U = createMatrix(3, 3, [2, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(makeSupercell(s, U).sites.length).toBe(8);
  });

  it("preserves inter-atomic distances", () => {
    const s = cubicSi();
    const U = calculateScaleFactor([1, 1, 1], s.lattice);
    const sc = makeSupercell(s, U);
    const origDists = pairwiseDistances(s);
    const scDists = pairwiseDistances(sc);
    for (const d of origDists) {
      expect(scDists.some((sd) => Math.abs(sd - d) < 1e-8)).toBe(true);
    }
  });
});

// ── slabFromMillerIndex ───────────────────────────────────────────

describe("slabFromMillerIndex", () => {
  it("all fractional coords in [0,1)", () => {
    const s = cubicSi();
    const cases: [number, number, number][] = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [1, 1, 0], [1, 1, 1], [1, 2, 3],
    ];
    for (const [h, k, l] of cases) {
      const slab = slabFromMillerIndex(s, h, k, l, { layers: 3 });
      for (let i = 0; i < slab.sites.length; i++) {
        const f = slab.sites[i].frac;
        for (let d = 0; d < 3; d++) {
          expect(f[d], `(${h}${k}${l}) site ${i} dim ${d}`).toBeGreaterThanOrEqual(0);
          expect(f[d], `(${h}${k}${l}) site ${i} dim ${d}`).toBeLessThan(1 + 1e-10);
        }
      }
    }
  });

  it("(001) with vacuum has correct c-length", () => {
    const s = cubicSi();
    const a = 5.43;
    const slab = slabFromMillerIndex(s, 0, 0, 1, { layers: 3, vacuum: 20 });
    const cLen = norm(new Float64Array([slab.lattice.basis.data[6], slab.lattice.basis.data[7], slab.lattice.basis.data[8]]));
    expect(cLen).toBeCloseTo(3 * a + 20, 8);
  });

  it("(111) has correct site count", () => {
    const s = cubicSi();
    const slab = slabFromMillerIndex(s, 1, 1, 1, { layers: 4 });
    expect(slab.sites.length).toBe(s.sites.length * 4);
  });

  it("(111) preserves inter-atomic distances", () => {
    const s = cubicSi();
    const origDists = pairwiseDistances(s);
    const slabDists = pairwiseDistances(slabFromMillerIndex(s, 1, 1, 1, { layers: 2 }));
    for (const d of origDists) {
      expect(slabDists.some((sd) => Math.abs(sd - d) < 1e-8)).toBe(true);
    }
  });

  it("(110) preserves inter-atomic distances", () => {
    const s = cubicSi();
    const origDists = pairwiseDistances(s);
    const slabDists = pairwiseDistances(slabFromMillerIndex(s, 1, 1, 0, { layers: 2 }));
    for (const d of origDists) {
      expect(slabDists.some((sd) => Math.abs(sd - d) < 1e-8)).toBe(true);
    }
  });

  it("(100) preserves inter-atomic distances", () => {
    const s = cubicSi();
    const origDists = pairwiseDistances(s);
    const slabDists = pairwiseDistances(slabFromMillerIndex(s, 1, 0, 0, { layers: 2 }));
    for (const d of origDists) {
      expect(slabDists.some((sd) => Math.abs(sd - d) < 1e-8)).toBe(true);
    }
  });

  it("(123) works for non-symmetric indices", () => {
    const s = cubicSi();
    const slab = slabFromMillerIndex(s, 1, 2, 3, { layers: 2 });
    expect(slab.sites.length).toBeGreaterThan(0);
    for (const site of slab.sites) {
      for (let d = 0; d < 3; d++) {
        expect(site.frac[d]).toBeGreaterThanOrEqual(-1e-10);
        expect(site.frac[d]).toBeLessThan(1 + 1e-10);
      }
    }
  });
});

// ── slabFromSites ─────────────────────────────────────────────────

describe("slabFromSites", () => {
  it("preserves inter-atomic distances", () => {
    const s = cubicSi();
    const origDists = pairwiseDistances(s);
    const slabDists = pairwiseDistances(slabFromSites(s, 0, 1, 2, { layers: 2 }));
    for (const d of origDists) {
      expect(slabDists.some((sd) => Math.abs(sd - d) < 1e-8)).toBe(true);
    }
  });

  it("preserves species", () => {
    const s = cubicSi();
    const slab = slabFromSites(s, 0, 1, 2, { layers: 2 });
    for (const site of slab.sites) {
      expect(site.species.symbol).toBe("Si");
    }
  });
});
