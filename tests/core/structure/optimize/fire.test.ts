import { describe, it, expect } from "vitest";
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

  it("caps cell strain under huge stress", () => {
    const lattice = createLattice([4, 0, 0, 0, 4, 0, 0, 0, 4]);
    const s = makeStructure(lattice, [[0.0, 0.0, 0.0]]);
    const opt = createFIRE({ fmax: 1e-9, smax: 1e-9, maxCellStrain: 0.02 });
    // 10 eV/Å³ tensile: uncapped this moves the cell 1.6Å (40%) in one step
    const out = opt.step(
      s,
      new Float64Array(3),
      new Float64Array([10, 0, 0, 0, 10, 0, 0, 0, 10]),
    );
    const b = (out.structure.lattice as { basis: { data: Float64Array } })
      .basis.data;
    // strain cap 0.02 on a=4 → max |dB| ≈ 0.08 per component
    expect(Math.abs(b[0] - 4)).toBeLessThanOrEqual(0.08 + 1e-12);
    expect(Math.abs(b[4] - 4)).toBeLessThanOrEqual(0.08 + 1e-12);
    expect(Math.abs(b[8] - 4)).toBeLessThanOrEqual(0.08 + 1e-12);
  });

  it("ignores species: unit masses, first step is F·dt²", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const s = {
      lattice,
      sites: [
        { species: { symbol: "H" }, frac: new Float64Array([0.1, 0.1, 0.1]) },
        { species: { symbol: "Pb" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
      ],
    };
    const opt = createFIRE({ fmax: 1e-12 });
    const out = opt.step(s as never, new Float64Array([1, 0, 0, 1, 0, 0]));
    const c0 = cartesian(out.structure.lattice, out.structure.sites[0]);
    const c1 = cartesian(out.structure.lattice, out.structure.sites[1]);
    // dt 0.1: dx = F·dt² = 0.01 for both, whatever the element
    expect(c0[0] - 1).toBeCloseTo(0.01, 10);
    expect(c1[0] - 5).toBeCloseTo(0.01, 10);
  });

  it("throws on bad forces/stress shapes instead of stalling", () => {
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.2, 0.2, 0.2],
    ]);
    const opt = createFIRE({});
    expect(() => opt.step(s, new Float64Array([1, 2, 3]))).toThrow();
    expect(() =>
      opt.step(s, new Float64Array(6), new Float64Array([1, 1, 1, 0, 0, 0])),
    ).toThrow();
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
});
