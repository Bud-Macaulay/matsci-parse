import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { supercell } from "@/core/structure/operations/supercell";
import { calculateScaleFactor } from "@/core/structure/operations/slab/calculateScaleFactor";
import { slabFromMillerIndex } from "@/core/structure/operations/slab/slabFromMillerIndex";
import { possibleTerminations } from "@/core/structure/operations/slab/possibleTerminations";
import type { Structure } from "@/core/structure/structure";
import {
  referenceCases,
  SiBulk,
  NaClBulk,
  SkewBulk,
  type RefStruct,
  type RefCase,
} from "./pymatgen-reference";

function buildBulk(r: RefStruct): Structure {
  const flat = r.lattice.flat();
  return {
    lattice: createLattice(flat),
    sites: r.frac.map((f, i) => ({
      species: { symbol: r.species[i] },
      frac: new Float64Array(f),
    })),
  };
}

function latticeClose(
  a: Float64Array | number[],
  b: number[][],
  tol = 1e-6,
): boolean {
  const flat = b.flat();
  for (let i = 0; i < 9; i++) {
    if (Math.abs(a[i] - flat[i]) > tol) return false;
  }
  return true;
}

function siteKeys(r: RefStruct): string[] {
  return r.frac
    .map((f, i) => `${r.species[i]}:${f.map((x) => x.toFixed(6)).join(",")}`)
    .sort();
}

function structKeys(s: Structure): string[] {
  return s.sites
    .map(
      (site) =>
        `${site.species.symbol}:${Array.from(site.frac)
          .map((x) => x.toFixed(6))
          .join(",")}`,
    )
    .sort();
}

const cases: RefCase[] = referenceCases;
const bulks: Record<string, RefStruct> = {
  Si: SiBulk,
  NaCl: NaClBulk,
  Skew: SkewBulk,
};

describe("pymatgen parity", () => {
  for (const c of cases) {
    const label = `${c.structure} (${c.hkl.join("")})`;

    it(`${label}: scale factor matches`, () => {
      const bulk = buildBulk(bulks[c.structure]);
      const U = calculateScaleFactor(c.hkl, bulk.lattice);
      expect(Array.from(U.data)).toEqual(c.scale.flat());
    });

    it(`${label}: oriented unit cell matches`, () => {
      const bulk = buildBulk(bulks[c.structure]);
      const U = calculateScaleFactor(c.hkl, bulk.lattice);
      const ouc = supercell(bulk, U);
      expect(latticeClose(ouc.lattice.basis.data, c.ouc.lattice)).toBe(true);
      expect(structKeys(ouc)).toEqual(siteKeys(c.ouc));
    });

    it(`${label}: slab at shift=0 matches`, () => {
      const bulk = buildBulk(bulks[c.structure]);
      const slab = slabFromMillerIndex(bulk, c.hkl[0], c.hkl[1], c.hkl[2], {
        layers: c.layers,
        shift: 0,
      });
      const expected = c.slabs["0"];
      expect(slab.sites.length).toBe(expected.frac.length);
      expect(latticeClose(slab.lattice.basis.data, expected.lattice)).toBe(
        true,
      );
      expect(structKeys(slab)).toEqual(siteKeys(expected));
    });

    it(`${label}: terminations match`, () => {
      const bulk = buildBulk(bulks[c.structure]);
      const got = [...possibleTerminations(bulk, c.hkl)].sort((a, b) => a - b);
      const want = [...c.terminations].sort((a, b) => a - b);
      expect(got.length).toBe(want.length);
      for (let i = 0; i < want.length; i++) {
        expect(got[i]).toBeCloseTo(want[i], 3);
      }
    });

    for (const t of c.terminations) {
      it(`${label}: slab at termination ${t.toFixed(4)} matches`, () => {
        const bulk = buildBulk(bulks[c.structure]);
        const slab = slabFromMillerIndex(bulk, c.hkl[0], c.hkl[1], c.hkl[2], {
          layers: c.layers,
          shift: t,
        });
        const expected = c.slabs[String(t)];
        expect(slab.sites.length).toBe(expected.frac.length);
        expect(latticeClose(slab.lattice.basis.data, expected.lattice)).toBe(
          true,
        );
        expect(structKeys(slab)).toEqual(siteKeys(expected));
      });
    }
  }
});
