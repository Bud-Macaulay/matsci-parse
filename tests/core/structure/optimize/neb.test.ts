import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { cartesian } from "@/core/site/cartesian";
import { createFIRE } from "@/core/structure/optimize/fire";
import {
  createNEB,
  interpolateBand,
} from "@/core/structure/optimize/neb";
import { makeStructure } from "../../../helpers/structure";

// V(x, y) = (x²−1)² + 5y²: minima at (±1, 0), barrier 1 at (0, 0).
function well(x: number, y: number): { e: number; fx: number; fy: number } {
  return { e: (x * x - 1) ** 2 + 5 * y * y, fx: 4 * x * (1 - x * x), fy: -10 * y };
}

function evalBand(images: Parameters<ReturnType<typeof createNEB>["step"]>[0]): {
  forces: Float64Array[];
  energies: number[];
} {
  const forces: Float64Array[] = [];
  const energies: number[] = [];
  for (const s of images) {
    const c = cartesian(s.lattice, s.sites[0]);
    const { e, fx, fy } = well(c[0] - 5, c[1] - 5);
    energies.push(e);
    forces.push(new Float64Array([fx, fy, 0]));
  }
  return { forces, energies };
}

describe("NEB", () => {
  it("relaxes a perturbed band onto the symmetric path", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const start = makeStructure(lattice, [[0.4, 0.5, 0.5]]);
    const end = makeStructure(lattice, [[0.6, 0.5, 0.5]]);
    let images = interpolateBand(start as never, end as never, 5);
    // push interior images off the path (y += 0.2 Å)
    images = images.map((s, k) => {
      if (k === 0 || k === 4) return s;
      const f = s.sites[0].frac;
      return {
        lattice: s.lattice,
        sites: [
          { ...s.sites[0], frac: new Float64Array([f[0], f[1] + 0.02, f[2]]) },
        ],
      };
    });
    const neb = createNEB((o) => createFIRE(o), { fmax: 1e-3 });
    let converged = false;
    let steps = 0;
    for (; steps < 2000 && !converged; steps++) {
      const { forces, energies } = evalBand(images as never);
      const out = neb.step(images as never, forces, energies);
      images = out.images as never;
      converged = out.converged;
    }
    expect(converged).toBe(true);
    const mid = cartesian(images[2].lattice, images[2].sites[0]);
    expect(mid[1] - 5).toBeCloseTo(0, 2);
    const { energies } = evalBand(images as never);
    expect(energies[2]).toBeCloseTo(1, 1);
    expect(energies[0]).toBeCloseTo(0, 6);
    expect(energies[4]).toBeCloseTo(0, 6);
  });

  it("keeps endpoints fixed", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const start = makeStructure(lattice, [[0.4, 0.5, 0.5]]);
    const end = makeStructure(lattice, [[0.6, 0.5, 0.5]]);
    const images = interpolateBand(start as never, end as never, 3);
    const neb = createNEB((o) => createFIRE(o), { fmax: 1e-3 });
    const { forces, energies } = evalBand(images as never);
    const out = neb.step(images as never, forces, energies);
    expect(out.images[0].sites[0].frac).toEqual(start.sites[0].frac);
    expect(out.images[2].sites[0].frac).toEqual(end.sites[0].frac);
  });

  it("throws on malformed bands", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const start = makeStructure(lattice, [[0.4, 0.5, 0.5]]);
    const end = makeStructure(lattice, [[0.6, 0.5, 0.5]]);
    const images = interpolateBand(start as never, end as never, 3);
    const neb = createNEB((o) => createFIRE(o));
    const { forces, energies } = evalBand(images as never);
    expect(() => neb.step(images.slice(0, 2) as never, forces.slice(0, 2), energies.slice(0, 2))).toThrow();
    expect(() => neb.step(images as never, forces.slice(0, 2), energies)).toThrow();
    expect(() => neb.step(images as never, forces, energies.slice(0, 2))).toThrow();
  });
});

describe("interpolateBand", () => {
  it("reproduces endpoints and unwraps across PBC", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const start = makeStructure(lattice, [[0.05, 0.5, 0.5]]);
    const end = makeStructure(lattice, [[0.95, 0.5, 0.5]]);
    const images = interpolateBand(start as never, end as never, 3);
    expect(images[0].sites[0].frac).toEqual(start.sites[0].frac);
    // end frac differs from the literal by exactly one cell (fp): compare carts
    // (unwrapped: 9.5 − 10 = −0.5, periodic-equivalent to the input)
    const last = cartesian(images[2].lattice, images[2].sites[0]);
    expect(last[0]).toBeCloseTo(-0.5, 8);
    // short way across the boundary: middle lands at cart x ≈ 0, not 5
    const mid = cartesian(images[1].lattice, images[1].sites[0]);
    expect(mid[0]).toBeCloseTo(0, 8);
  });

  it("throws on mismatched endpoints", () => {
    const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
    const start = makeStructure(lattice, [[0.4, 0.5, 0.5]]);
    const other = makeStructure(lattice, [
      [0.6, 0.5, 0.5],
      [0.7, 0.5, 0.5],
    ]);
    expect(() => interpolateBand(start as never, other as never, 3)).toThrow();
    expect(() => interpolateBand(start as never, start as never, 1)).toThrow();
  });
});
