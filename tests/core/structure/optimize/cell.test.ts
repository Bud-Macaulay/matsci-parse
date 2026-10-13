import { describe, it, expect } from "vitest";
import { createLattice, type Lattice } from "@/core/lattice/lattice";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { sub } from "@/core/matrix/operations/sub";
import { scale } from "@/core/matrix/operations/scale";
import { transpose } from "@/core/matrix/operations/transpose";
import { metricTensor } from "@/core/lattice/metricTensor";
import { volume } from "@/core/lattice/volume";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { createFIRE } from "@/core/structure/optimize/fire";
import { createLBFGS } from "@/core/structure/optimize/lbfgs";
import { createCG } from "@/core/structure/optimize/cg";
import {
  cellGeneralizedForces,
  type Optimizer,
} from "@/core/structure/optimize/common";
import { makeStructure } from "../../../helpers/structure";

// Skewed starting cell and a different skewed target (rows = lattice vectors).
const B_START = [3, 0, 0, 1, 3, 0, 0.5, 0.5, 4];
const B_TARGET = [3.2, 0, 0, 1.3, 3.1, 0, 0.3, 0.7, 4.3];
const F_START = [
  [0.1, 0.2, 0.3],
  [0.6, 0.15, 0.7],
  [0.4, 0.8, 0.1],
];
const F_TARGET = [
  [0.12, 0.18, 0.33],
  [0.55, 0.2, 0.68],
  [0.43, 0.77, 0.12],
];
const KC = 0.01; // cell stiffness, eV/Å⁴
const KA = 1; // fractional-coordinate stiffness, eV

const G_TARGET = metricTensor(createLattice(B_TARGET));

/** Toy model, consistent by construction:
 * E = ½·KC·‖G − G₀‖² + ½·KA·Σ|f − f₀|², with G = B·Bᵀ.
 * Cartesian forces F = −KA·(f − f₀)·B⁻ᵀ (since f = x·B⁻¹), and at fixed f
 * the stress is σ = (2·KC/V)·Bᵀ·(G − G₀)·B (dE = V·σ:ε). */
function model(s: { lattice: Lattice; sites: { frac: Float64Array }[] }) {
  const B = s.lattice.basis;
  const dG = sub(metricTensor(s.lattice), G_TARGET);
  const V = volume(s.lattice);

  const df = createMatrix(
    s.sites.length,
    3,
    s.sites.flatMap((site, a) => [0, 1, 2].map((d) => site.frac[d] - F_TARGET[a][d])),
  );
  const energy =
    0.5 * KC * dG.data.reduce((acc, x) => acc + x * x, 0) +
    0.5 * KA * df.data.reduce((acc, x) => acc + x * x, 0);
  const forces = scale(mul(df, transpose(inverse3x3(B))), -KA).data;
  const stress = scale(mul(mul(transpose(B), dG), B), (2 * KC) / V).data;
  return { energy, forces, stress };
}

function start() {
  return makeStructure(createLattice(B_START), F_START) as never as {
    lattice: { basis: Matrix };
    sites: { species: { symbol: string }; frac: Float64Array }[];
  };
}

const OPTIMIZERS: [string, () => Optimizer][] = [
  ["FIRE", () => createFIRE({ fmax: 1e-4, smax: 1e-6 })],
  ["L-BFGS", () => createLBFGS({ fmax: 1e-4, smax: 1e-6 })],
  ["CG", () => createCG({ fmax: 1e-4, smax: 1e-6 })],
];

describe("cell relaxation on a skewed cell", () => {
  it("cell generalized force is −∂E/∂B at fixed fractional coords", () => {
    const s = start();
    const { stress } = model(s);
    const { cellF } = cellGeneralizedForces(s.lattice.basis as never, stress);
    const h = 1e-6;
    for (let i = 0; i < 9; i++) {
      const plus = Float64Array.from(B_START);
      const minus = Float64Array.from(B_START);
      plus[i] += h;
      minus[i] -= h;
      const eP = model({ ...s, lattice: createLattice(plus) } as never).energy;
      const eM = model({ ...s, lattice: createLattice(minus) } as never).energy;
      expect(cellF.data[i]).toBeCloseTo(-(eP - eM) / (2 * h), 6);
    }
  });

  it.each(OPTIMIZERS)("%s reaches the target cell and positions", (_, make) => {
    const opt = make();
    let s = start();
    let converged = false;
    let steps = 0;
    for (; steps < 3000 && !converged; steps++) {
      const { forces, stress } = model(s);
      const out = opt.step(s as never, forces, stress);
      s = out.structure as never;
      converged = out.converged;
    }
    expect(converged).toBe(true);
    // The energy is rotation invariant, so compare the metric, not B.
    const G = metricTensor(s.lattice as Lattice).data;
    for (let i = 0; i < 9; i++) expect(G[i]).toBeCloseTo(G_TARGET.data[i], 3);
    s.sites.forEach((site, a) => {
      for (let d = 0; d < 3; d++) expect(site.frac[d]).toBeCloseTo(F_TARGET[a][d], 3);
    });
  });

  it.each(OPTIMIZERS)("%s first step lowers the energy", (_, make) => {
    const s = start();
    const before = model(s);
    const out = make().step(s as never, before.forces, before.stress);
    expect(model(out.structure as never).energy).toBeLessThan(before.energy);
  });

  it.each(OPTIMIZERS)("%s carries atoms with the cell (no forces → fractional coords unchanged)", (_, make) => {
    const s = start();
    const stress = new Float64Array([0.02, 0.005, 0, 0.005, -0.01, 0.003, 0, 0.003, 0.015]);
    const out = make().step(s as never, new Float64Array(9), stress);
    const moved = out.structure as never as typeof s;
    // the cell did change...
    expect(Array.from(moved.lattice.basis.data)).not.toEqual(B_START);
    // ...and the atoms rode along with it
    moved.sites.forEach((site, a) => {
      for (let d = 0; d < 3; d++) expect(site.frac[d]).toBeCloseTo(F_START[a][d], 12);
    });
  });
});
