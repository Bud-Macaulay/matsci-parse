import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { cartesian } from "@/core/site/cartesian";
import { createDisorderedSite } from "@/core/site/disorder";
import { perturb } from "@/core/structure/operations/perturb";
import type { Structure } from "@/core/structure/structure";
import type { DisorderedStructure } from "@/core/structure/disordered";

/** Small seeded generator (mulberry32) for reproducible tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Triclinic, so a wrong fractional conversion shows up in the distances.
const lattice = createLattice([4.1, 0, 0, 0.6, 3.9, 0, -0.4, 0.8, 5.2]);
const many = (n: number): Structure => ({
  lattice,
  sites: Array.from({ length: n }, (_, i) => ({
    species: { symbol: i % 2 ? "Na" : "Cl" },
    frac: new Float64Array([(i * 0.13) % 1, (i * 0.37) % 1, (i * 0.71) % 1]),
  })),
});

/** Cartesian displacement of each site between two structures. */
function displacements(a: Structure, b: Structure): number[][] {
  return a.sites.map((site, i) => {
    const r0 = cartesian(a.lattice, site);
    const r1 = cartesian(b.lattice, b.sites[i]!);
    return [0, 1, 2].map((d) => r1[d]! - r0[d]!);
  });
}
const len = (v: number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

describe("perturb", () => {
  it("moves every site by exactly `distance` angstrom", () => {
    const s = many(50);
    const out = perturb(s, 0.1, { rng: seeded(1) });
    for (const v of displacements(s, out)) expect(len(v)).toBeCloseTo(0.1, 12);
    // Lattice and species untouched.
    expect(out.lattice).toBe(s.lattice);
    expect(out.sites.map((x) => x.species)).toEqual(
      s.sites.map((x) => x.species),
    );
  });

  it("with minDistance, spreads lengths over [minDistance, distance]", () => {
    const s = many(500);
    const lengths = displacements(
      s,
      perturb(s, 0.3, { minDistance: 0.1, rng: seeded(2) }),
    ).map(len);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(0.1 - 1e-12);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(0.3 + 1e-12);
    expect(Math.min(...lengths)).toBeLessThan(0.12);
    expect(Math.max(...lengths)).toBeGreaterThan(0.28);
  });

  it("draws directions uniformly on the sphere", () => {
    const s = many(20_000);
    const d = 0.2;
    const v = displacements(s, perturb(s, d, { rng: seeded(3) }));
    for (let c = 0; c < 3; c++) {
      const mean = v.reduce((acc, x) => acc + x[c]!, 0) / v.length;
      const meanSq = v.reduce((acc, x) => acc + x[c]! ** 2, 0) / v.length;
      expect(Math.abs(mean)).toBeLessThan(0.01 * d);
      expect(meanSq / (d * d)).toBeCloseTo(1 / 3, 1);
    }
  });

  it("is reproducible with a seeded rng", () => {
    const s = many(10);
    const a = perturb(s, 0.1, { rng: seeded(42) });
    const b = perturb(s, 0.1, { rng: seeded(42) });
    const c = perturb(s, 0.1, { rng: seeded(43) });
    expect(a.sites.map((x) => Array.from(x.frac))).toEqual(
      b.sites.map((x) => Array.from(x.frac)),
    );
    expect(a.sites.map((x) => Array.from(x.frac))).not.toEqual(
      c.sites.map((x) => Array.from(x.frac)),
    );
  });

  it("zero distance leaves positions unchanged; the input is never mutated", () => {
    const s = many(5);
    const before = s.sites.map((x) => Array.from(x.frac));
    expect(perturb(s, 0).sites.map((x) => Array.from(x.frac))).toEqual(before);
    perturb(s, 0.5);
    expect(s.sites.map((x) => Array.from(x.frac))).toEqual(before);
  });

  it("works on disordered structures and keeps their type", () => {
    const d: DisorderedStructure = {
      disordered: true,
      lattice: createLattice([4, 4, 4]),
      sites: [createDisorderedSite([0.5, 0.5, 0.5], { Ag: 0.5, Pd: 0.5 })],
    };
    const out = perturb(d, 0.4, { rng: seeded(5) });
    expect(out.disordered).toBe(true);
    expect(out.sites[0]!.occupancy).toEqual(d.sites[0]!.occupancy);
    const df = [0, 1, 2].map(
      (c) => (out.sites[0]!.frac[c]! - d.sites[0]!.frac[c]!) * 4,
    );
    expect(len(df)).toBeCloseTo(0.4, 12);
  });

  it("rejects bad arguments", () => {
    const s = many(2);
    expect(() => perturb(s, -0.1)).toThrow(/distance/);
    expect(() => perturb(s, NaN)).toThrow(/distance/);
    expect(() => perturb(s, 0.1, { minDistance: 0.2 })).toThrow(/minDistance/);
    expect(() => perturb(s, 0.1, { minDistance: -0.01 })).toThrow(
      /minDistance/,
    );
  });
});
