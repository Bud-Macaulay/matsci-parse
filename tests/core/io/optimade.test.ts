import { describe, it, expect } from "vitest";

import { fromOptimade, toOptimade } from "@/core/io/optimade";
import { createLattice } from "@/core/lattice";
import { createSite } from "@/core/site/site";

function approx(a: number, b: number, eps = 1e-8) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

function approxArray(a: number[], b: number[], eps = 1e-8) {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
  }
}

// ── Fixtures ─────────────────────────────────────────────────

const siDiamond = {
  attributes: {
    lattice_vectors: [
      [0, 2.715, 2.715],
      [2.715, 0, 2.715],
      [2.715, 2.715, 0],
    ],
    cartesian_site_positions: [
      [0, 0, 0],
      [1.3575, 1.3575, 1.3575],
    ],
    species_at_sites: ["Si", "Si"],
  },
};

const naCl = {
  attributes: {
    lattice_vectors: [
      [5.6402, 0, 0],
      [0, 5.6402, 0],
      [0, 0, 5.6402],
    ],
    cartesian_site_positions: [
      [0, 0, 0],
      [2.8201, 2.8201, 0],
      [2.8201, 0, 2.8201],
      [0, 2.8201, 2.8201],
    ],
    species_at_sites: ["Na", "Cl", "Na", "Cl"],
  },
};

const multiSpecies = {
  attributes: {
    lattice_vectors: [
      [3.0, 0, 0],
      [0, 3.0, 0],
      [0, 0, 3.0],
    ],
    cartesian_site_positions: [
      [0, 0, 0],
      [1.5, 1.5, 0],
      [1.5, 0, 1.5],
      [0, 1.5, 1.5],
    ],
    species_at_sites: ["Fe", "Ni", "Co", "Fe"],
  },
};

// ── fromOptimade tests ───────────────────────────────────────

describe("fromOptimade", () => {
  it("parses a diamond Si structure", () => {
    const s = fromOptimade(siDiamond);
    expect(s.sites.length).toBe(2);
    expect(s.sites[0].species.symbol).toBe("Si");
    expect(s.sites[1].species.symbol).toBe("Si");
  });

  it("produces correct fractional coordinates", () => {
    const s = fromOptimade(siDiamond);
    // (0,0,0) → (0,0,0)
    approx(s.sites[0].frac[0], 0);
    approx(s.sites[0].frac[1], 0);
    approx(s.sites[0].frac[2], 0);
    // (1.3575, 1.3575, 1.3575) → (0.25, 0.25, 0.25)
    approx(s.sites[1].frac[0], 0.25);
    approx(s.sites[1].frac[1], 0.25);
    approx(s.sites[1].frac[2], 0.25);
  });

  it("parses NaCl with 4 sites", () => {
    const s = fromOptimade(naCl);
    expect(s.sites.length).toBe(4);
    expect(s.sites[0].species.symbol).toBe("Na");
    expect(s.sites[1].species.symbol).toBe("Cl");
    expect(s.sites[2].species.symbol).toBe("Na");
    expect(s.sites[3].species.symbol).toBe("Cl");
  });

  it("NaCl fractional coordinates are correct", () => {
    const s = fromOptimade(naCl);
    // (0,0,0) → (0,0,0)
    approx(s.sites[0].frac[0], 0);
    approx(s.sites[0].frac[1], 0);
    approx(s.sites[0].frac[2], 0);
    // (2.8201, 2.8201, 0) → (0.5, 0.5, 0)
    approx(s.sites[1].frac[0], 0.5);
    approx(s.sites[1].frac[1], 0.5);
    approx(s.sites[1].frac[2], 0);
    // (2.8201, 0, 2.8201) → (0.5, 0, 0.5)
    approx(s.sites[2].frac[0], 0.5);
    approx(s.sites[2].frac[1], 0);
    approx(s.sites[2].frac[2], 0.5);
    // (0, 2.8201, 2.8201) → (0, 0.5, 0.5)
    approx(s.sites[3].frac[0], 0);
    approx(s.sites[3].frac[1], 0.5);
    approx(s.sites[3].frac[2], 0.5);
  });

  it("handles multiple distinct species", () => {
    const s = fromOptimade(multiSpecies);
    expect(s.sites[0].species.symbol).toBe("Fe");
    expect(s.sites[1].species.symbol).toBe("Ni");
    expect(s.sites[2].species.symbol).toBe("Co");
    expect(s.sites[3].species.symbol).toBe("Fe");
  });

  it("lattice basis matches input lattice_vectors", () => {
    const s = fromOptimade(siDiamond);
    const m = s.lattice.basis.data;
    // row 0
    approx(m[0], 0); approx(m[1], 2.715); approx(m[2], 2.715);
    // row 1
    approx(m[3], 2.715); approx(m[4], 0); approx(m[5], 2.715);
    // row 2
    approx(m[6], 2.715); approx(m[7], 2.715); approx(m[8], 0);
  });
});

// ── toOptimade tests ─────────────────────────────────────────

describe("toOptimade", () => {
  it("produces correct attributes shape", () => {
    const s = fromOptimade(siDiamond);
    const opt = toOptimade(s);
    expect(opt.attributes).toBeDefined();
    expect(opt.attributes.lattice_vectors).toHaveLength(3);
    expect(opt.attributes.species_at_sites).toHaveLength(2);
    expect(opt.attributes.cartesian_site_positions).toHaveLength(2);
    expect(opt.attributes.nsites).toBe(2);
    expect(opt.attributes.nelements).toBe(1);
    expect(opt.attributes.elements).toEqual(["Si"]);
    expect(opt.attributes.dimension_types).toEqual([1, 1, 1]);
  });

  it("lattice_vectors round-trip", () => {
    const s = fromOptimade(siDiamond);
    const opt = toOptimade(s);
    for (let i = 0; i < 3; i++) {
      approxArray(
        opt.attributes.lattice_vectors[i],
        siDiamond.attributes.lattice_vectors[i],
      );
    }
  });

  it("cartesian_site_positions round-trip", () => {
    const s = fromOptimade(siDiamond);
    const opt = toOptimade(s);
    for (let i = 0; i < 2; i++) {
      approxArray(
        opt.attributes.cartesian_site_positions[i],
        siDiamond.attributes.cartesian_site_positions[i],
      );
    }
  });

  it("species_at_sites round-trip", () => {
    const s = fromOptimade(naCl);
    const opt = toOptimade(s);
    expect(opt.attributes.species_at_sites).toEqual(["Na", "Cl", "Na", "Cl"]);
  });

  it("elements are sorted and deduplicated", () => {
    const s = fromOptimade(multiSpecies);
    const opt = toOptimade(s);
    expect(opt.attributes.elements).toEqual(["Co", "Fe", "Ni"]);
    expect(opt.attributes.nelements).toBe(3);
  });

  it("nsites is correct", () => {
    const s = fromOptimade(naCl);
    const opt = toOptimade(s);
    expect(opt.attributes.nsites).toBe(4);
  });
});

// ── Round-trip tests ─────────────────────────────────────────

describe("OPTIMADE round-trips", () => {
  function roundTrip(label: string, input: object) {
    it(`round-trips ${label}`, () => {
      const a = fromOptimade(input);
      const opt = toOptimade(a);
      const b = fromOptimade(opt);

      expect(b.sites.length).toBe(a.sites.length);

      for (let i = 0; i < a.sites.length; i++) {
        expect(b.sites[i].species.symbol).toBe(a.sites[i].species.symbol);
        for (let j = 0; j < 3; j++) {
          approx(b.sites[i].frac[j], a.sites[i].frac[j]);
        }
      }

      const aBasis = a.lattice.basis.data;
      const bBasis = b.lattice.basis.data;
      for (let i = 0; i < 9; i++) {
        approx(bBasis[i], aBasis[i]);
      }
    });
  }

  roundTrip("diamond Si", siDiamond);
  roundTrip("NaCl", naCl);
  roundTrip("multi-species", multiSpecies);
});

// ── Manual structure round-trip ──────────────────────────────

describe("fromOptimade with manually built Structure", () => {
  it("toOptimade then fromOptimade preserves structure", () => {
    const lattice = createLattice([3.0, 0, 0, 0, 3.0, 0, 0, 0, 3.0]);
    const sites = [
      createSite({ symbol: "Cu" }, [0, 0, 0]),
      createSite({ symbol: "Cu" }, [0.5, 0.5, 0]),
      createSite({ symbol: "Cu" }, [0.5, 0, 0.5]),
      createSite({ symbol: "Cu" }, [0, 0.5, 0.5]),
    ];

    const structure = { lattice, sites };
    const opt = toOptimade(structure);
    const back = fromOptimade(opt);

    expect(back.sites.length).toBe(4);
    for (const site of back.sites) {
      expect(site.species.symbol).toBe("Cu");
    }

    // (0.5, 0.5, 0) → cartesian (1.5, 1.5, 0) → fractional (0.5, 0.5, 0)
    approx(back.sites[1].frac[0], 0.5);
    approx(back.sites[1].frac[1], 0.5);
    approx(back.sites[1].frac[2], 0);
  });
});
