import { Structure } from "@/core/structure/structure";
import { describe, it, expect } from "vitest";

export function expectArrayClose(
  actual: Float64Array,
  expected: number[],
  eps = 1e-12,
) {
  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(eps);
  }
}

export interface ExpectedSite {
  species: string;
  frac: [number, number, number];
}

/**
 * Assert two structures match site-by-site (species + fractional coordinates).
 * Sites are matched by index — caller must ensure ordering is deterministic.
 */
export function assertStructuresMatch(
  actual: Structure,
  expected: {
    sites: ExpectedSite[];
    lattice?: number[];
  },
  eps = 1e-2,
) {
  const dims = ["x", "y", "z"];

  expect(
    actual.sites.length,
    `site count: got ${actual.sites.length}, expected ${expected.sites.length}`,
  ).toBe(expected.sites.length);

  for (let i = 0; i < expected.sites.length; i++) {
    const a = actual.sites[i];
    const e = expected.sites[i];
    const label = `site ${i} (${e.species})`;

    expect(
      a.species.symbol,
      `${label}: species got "${a.species.symbol}", expected "${e.species}"`,
    ).toBe(e.species);

    for (let d = 0; d < 3; d++) {
      expect(
        Math.abs(a.frac[d] - e.frac[d]),
        `${label}: frac.${dims[d]} got ${a.frac[d]}, expected ${e.frac[d]}`,
      ).toBeLessThan(eps);
    }
  }

  if (expected.lattice) {
    const basis = actual.lattice.basis.data;

    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;

      expect(
        Math.abs(basis[i] - expected.lattice[i]),
        `lattice[${row}][${col}]: got ${basis[i]}, expected ${expected.lattice[i]}`,
      ).toBeLessThan(eps);
    }
  }
}
