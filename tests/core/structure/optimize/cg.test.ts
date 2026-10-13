import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { cartesian } from "@/core/site/cartesian";
import { createCG } from "@/core/structure/optimize/cg";
import { makeStructure } from "../../../helpers/structure";

describe("CG", () => {
  it("relaxes positions in a harmonic well", () => {
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    let s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.7, 0.6, 0.5],
    ]);
    const targets = [
      [1.0, 1.0, 1.0],
      [3.0, 3.0, 3.0],
    ];
    const opt = createCG({ fmax: 1e-4 });
    let converged = false;
    let steps = 0;
    for (; steps < 2000 && !converged; steps++) {
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
    expect(steps).toBeLessThan(500);
    for (let i = 0; i < 2; i++) {
      const c = cartesian(s.lattice, s.sites[i]);
      for (let d = 0; d < 3; d++) expect(c[d]).toBeCloseTo(targets[i][d], 3);
    }
  });

  it("expands the cell under tensile stress (fake elastic response)", () => {
    const lattice = createLattice([4, 0, 0, 0, 4, 0, 0, 0, 4]);
    let s = makeStructure(lattice, [[0.0, 0.0, 0.0]]);
    const opt = createCG({ fmax: 1e-9, smax: 1e-4 });
    let converged = false;
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
});
