import { describe, it, expect, vi } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { cartesian } from "@/core/site/cartesian";
import { createFIRE } from "@/core/structure/optimize/fire";
import { makeStructure } from "../../../helpers/structure";

describe("FIRE", () => {
  it("relaxes positions in a harmonic well", () => {
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    let s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.7, 0.6, 0.5],
    ]);
    // target Cartesians; Hookean forces F = -(x - x0)
    const targets = [
      [1.0, 1.0, 1.0],
      [3.0, 3.0, 3.0],
    ];
    const opt = createFIRE({ fmax: 1e-4 });
    let converged = false;
    for (let step = 0; step < 2000 && !converged; step++) {
      const forces = new Float64Array(6);
      for (let i = 0; i < 2; i++) {
        const c = cartesian(s.lattice, s.sites[i]);
        for (let d = 0; d < 3; d++) forces[i * 3 + d] = -(c[d] - targets[i][d]);
      }
      const out = opt.step(s, forces);
      s = out.structure as never;
      converged = out.converged;
    }
    expect(converged).toBe(true);
    for (let i = 0; i < 2; i++) {
      const c = cartesian(s.lattice, s.sites[i]);
      for (let d = 0; d < 3; d++) expect(c[d]).toBeCloseTo(targets[i][d], 3);
    }
  });

  it("expands the cell under tensile stress (fake elastic response)", () => {
    const lattice = createLattice([4, 0, 0, 0, 4, 0, 0, 0, 4]);
    let s = makeStructure(lattice, [[0.0, 0.0, 0.0]]);
    const opt = createFIRE({ fmax: 1e-9, smax: 1e-4 });
    let converged = false;
    // σ = k·(a - a_target)·I: compressed cell pushes back (negative =
    // compressive), zero only at a = 5
    for (let step = 0; step < 2000 && !converged; step++) {
      const a = (s.lattice as { basis: { data: Float64Array } }).basis.data[0];
      const sv = 0.5 * (a - 5);
      const out = opt.step(
        s as never,
        new Float64Array(3),
        new Float64Array([sv, 0, 0, 0, sv, 0, 0, 0, sv]),
      );
      s = out.structure as never;
      converged = out.converged;
    }
    expect(converged).toBe(true);
    const b = (s.lattice as { basis: { data: Float64Array } }).basis.data;
    expect(b[0]).toBeCloseTo(5, 2);
    expect(b[4]).toBeCloseTo(5, 2);
    expect(b[8]).toBeCloseTo(5, 2);
  });

  it("scales steps by mass: light atom moves further per step", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const s = {
      lattice,
      sites: [
        {
          species: { symbol: "H" },
          frac: new Float64Array([0.1, 0.1, 0.1]),
          properties: { mass: 1 },
        },
        {
          species: { symbol: "Pb" },
          frac: new Float64Array([0.5, 0.5, 0.5]),
          properties: { mass: 100 },
        },
      ],
    };
    const opt = createFIRE({ fmax: 1e-12 });
    // uniform +x force on both; first step is pure v += F·dt/m, x += v·dt
    const out = opt.step(s as never, new Float64Array([1, 0, 0, 1, 0, 0]));
    const c0 = cartesian(out.structure.lattice, out.structure.sites[0]);
    const c1 = cartesian(out.structure.lattice, out.structure.sites[1]);
    const d0 = c0[0] - 1; // started at x=1
    const d1 = c1[0] - 5; // started at x=5
    // velocity mixing compresses ratios toward 1, but ordering holds and
    // the ratio stays inside (1, massRatio)
    expect(d0 / d1).toBeGreaterThan(1);
    expect(d0 / d1).toBeLessThan(100);
  });

  it("infers mass from the periodic table by species symbol", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const s = {
      lattice,
      sites: [
        { species: { symbol: "H" }, frac: new Float64Array([0.1, 0.1, 0.1]) },
        { species: { symbol: "Si" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
      ],
    };
    const opt = createFIRE({ fmax: 1e-12 });
    const out = opt.step(s as never, new Float64Array([1, 0, 0, 1, 0, 0]));
    const c0 = cartesian(out.structure.lattice, out.structure.sites[0]);
    const c1 = cartesian(out.structure.lattice, out.structure.sites[1]);
    // H (1.00794) vs Si (28.0855): lighter atom moves further, ratio
    // inside (1, massRatio) after velocity mixing
    const ratio = (c0[0] - 1) / (c1[0] - 5);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(28.0855 / 1.00794);
  });

  it("respects the trust radius under huge forces", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const s = makeStructure(lattice, [[0.5, 0.5, 0.5]]);
    const opt = createFIRE({ fmax: 1e-12, maxStep: 0.2 });
    const before = cartesian(s.lattice, s.sites[0]);
    const out = opt.step(s, new Float64Array([1000, 0, 0]));
    const after = cartesian(out.structure.lattice, out.structure.sites[0]);
    expect(after[0] - before[0]).toBeLessThanOrEqual(0.2 + 1e-12);
    expect(after[0] - before[0]).toBeGreaterThan(0);
  });

  it("warns once and falls back to 1.0 for unknown species", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
      const s = {
        lattice,
        sites: [
          { species: { symbol: "Xx" }, frac: new Float64Array([0.1, 0.1, 0.1]) },
        ],
      };
      const opt = createFIRE({ fmax: 1e-12 });
      const before = cartesian(s.lattice, s.sites[0]);
      const out = opt.step(s as never, new Float64Array([1, 0, 0]));
      const after = cartesian(out.structure.lattice, out.structure.sites[0]);
      // mass 1.0, dt 0.1: dx = F·dt²/m = 0.01
      expect(after[0] - before[0]).toBeCloseTo(0.01, 10);
      expect(warn).toHaveBeenCalledTimes(1);
      opt.step(out.structure as never, new Float64Array([1, 0, 0]));
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
