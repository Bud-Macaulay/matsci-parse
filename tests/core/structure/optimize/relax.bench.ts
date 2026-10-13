import { bench, describe } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { cartesian } from "@/core/site/cartesian";
import { createFIRE } from "@/core/structure/optimize/fire";
import { createLBFGS } from "@/core/structure/optimize/lbfgs";
import { createCG } from "@/core/structure/optimize/cg";
import { makeStructure } from "../../../helpers/structure";

const factories = {
  FIRE: createFIRE,
  LBFGS: createLBFGS,
  CG: createCG,
} as const;

function spreadFracs(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => [
    ((i * 0.37) % 1 + 0.05) % 1,
    ((i * 0.61) % 1 + 0.05) % 1,
    ((i * 0.83) % 1 + 0.05) % 1,
  ]);
}

function pseudoForces(n: number): Float64Array {
  const f = new Float64Array(3 * n);
  for (let i = 0; i < f.length; i++) f[i] = Math.sin(i * 12.9898) * 0.5;
  return f;
}

describe("optimizer step cost", () => {
  for (const [name, create] of Object.entries(factories)) {
    for (const n of [8, 64, 256]) {
      const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
      const fracs = spreadFracs(n);
      const forces = pseudoForces(n);
      const fresh = () => ({ s: makeStructure(lattice, fracs), opt: create({}) });
      let { s, opt } = fresh();
      let count = 0;
      opt.step(s, forces); // warmup (JIT + the one mass warning)

      bench(`${name} step, ${n} atoms`, () => {
        // Fixed forces are not conservative: reset before drift/collapse.
        if (++count % 200 === 0) ({ s, opt } = fresh());
        const out = opt.step(s, forces);
        s = out.structure as never;
      });
    }

    {
      // cell path: same 64-atom setup plus hydrostatic stress
      const n = 64;
      const lattice = createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]);
      const fracs = spreadFracs(n);
      const forces = pseudoForces(n);
      const stress = new Float64Array([0.1, 0, 0, 0, 0.1, 0, 0, 0, 0.1]);
      const fresh = () => ({ s: makeStructure(lattice, fracs), opt: create({}) });
      let { s, opt } = fresh();
      let count = 0;
      opt.step(s, forces, stress); // warmup

      bench(`${name} step, ${n} atoms + cell`, () => {
        if (++count % 200 === 0) ({ s, opt } = fresh());
        const out = opt.step(s, forces, stress);
        s = out.structure as never;
      });
    }
  }
});

describe("full harmonic relaxation", () => {
  for (const [name, create] of Object.entries(factories)) {
    bench(`${name} relax 8 atoms to 1e-3`, () => {
      const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
      let s = makeStructure(lattice, spreadFracs(8));
      const targets = Array.from({ length: 8 }, (_, i) => [
        1 + i * 0.1,
        1 + i * 0.1,
        1 + i * 0.1,
      ]);
      const opt = create({ fmax: 1e-3 });
      for (let step = 0; step < 2000; step++) {
        const forces = new Float64Array(24);
        for (let i = 0; i < 8; i++) {
          const c = cartesian(s.lattice, s.sites[i]);
          for (let d = 0; d < 3; d++) forces[i * 3 + d] = -(c[d] - targets[i][d]);
        }
        const out = opt.step(s, forces);
        s = out.structure as never;
        if (out.converged) break;
      }
    });
  }
});
