import { metricTensor } from "@/core/lattice/metricTensor";
import { cartesian } from "@/core/site/cartesian";
import { micDisplacement } from "@/core/structure/operations/distance/utils";
import { dot } from "@/core/matrix/operations/vector/dot";
import { norm } from "@/core/matrix/operations/vector/norm";
import type { Structure } from "../structure";
import type { Optimizer, OptimizerOptions } from "./common";

export interface NEBOptions {
  /** Convergence: max NEB force component over movable images. Default 0.05. */
  fmax?: number;
  /** Spring constant in eV/Å². Default 0.1. */
  k?: number;
  /** Options forwarded to the per-image optimizers. */
  inner?: OptimizerOptions;
}

export interface NEBStep {
  images: Structure[];
  converged: boolean;
  maxForce: number;
}

/**
 * Nudged elastic band driver with the improved tangent (Henkelman &
 * Jónsson 2000). Holds one optimizer per movable image — any
 * `(opts) => Optimizer` factory works (FIRE is the classic choice).
 * Loop: `forces/energies = calc(images); ({ images, converged } =
 * neb.step(images, forcesList, energies))`.
 *
 * Fixed endpoints, fixed cell (positions-only inner steps). Each image
 * feels its true force perpendicular to the path plus the spring force
 * parallel to it: F = F⊥ + k·(|R₊−R| − |R−R₋|)·τ̂.
 */
export function createNEB(
  factory: (opts: OptimizerOptions) => Optimizer,
  opts: NEBOptions = {},
): {
  step(
    images: Structure[],
    forcesList: Float64Array[],
    energies: number[],
  ): NEBStep;
  reset(): void;
} {
  const fmax = opts.fmax ?? 0.05;
  const k = opts.k ?? 0.1;
  const innerOpts = opts.inner ?? {};

  let inners: Optimizer[] = [];

  function reset() {
    for (const opt of inners) opt.reset();
    inners = [];
  }

  function cartsOf(structure: Structure): Float64Array {
    const n = structure.sites.length;
    const x = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      const c = cartesian(structure.lattice, structure.sites[i]);
      x[i * 3] = c[0];
      x[i * 3 + 1] = c[1];
      x[i * 3 + 2] = c[2];
    }
    return x;
  }

  function step(
    images: Structure[],
    forcesList: Float64Array[],
    energies: number[],
  ): NEBStep {
    const m = images.length;
    if (m < 3) throw new Error(`NEB needs at least 3 images, got ${m}`);
    if (forcesList.length !== m || energies.length !== m) {
      throw new Error(
        `NEB needs ${m} forces/energies, got ${forcesList.length}/${energies.length}`,
      );
    }
    const n = images[0].sites.length;
    for (let i = 0; i < m; i++) {
      if (images[i].sites.length !== n) {
        throw new Error(
          `NEB image ${i} has ${images[i].sites.length} sites, expected ${n}`,
        );
      }
      if (forcesList[i].length !== 3 * n) {
        throw new Error(
          `NEB forces ${i} has length ${forcesList[i].length}, expected ${3 * n}`,
        );
      }
    }

    if (inners.length !== m - 2) {
      inners = [];
      for (let i = 0; i < m - 2; i++) inners.push(factory({ ...innerOpts }));
    }

    const R = images.map(cartsOf);
    const out: Structure[] = [images[0]];
    let maxForce = 0;

    for (let i = 1; i < m - 1; i++) {
      const tPlus = new Float64Array(3 * n);
      const tMinus = new Float64Array(3 * n);
      for (let j = 0; j < 3 * n; j++) {
        tPlus[j] = R[i + 1][j] - R[i][j];
        tMinus[j] = R[i][j] - R[i - 1][j];
      }
      const tau = improvedTangent(
        energies[i - 1],
        energies[i],
        energies[i + 1],
        tPlus,
        tMinus,
      );

      const F = forcesList[i];
      const fPar = dot(F, tau);
      const spring = k * (norm(tPlus) - norm(tMinus));
      const Fneb = new Float64Array(3 * n);
      for (let j = 0; j < 3 * n; j++) {
        Fneb[j] = F[j] - fPar * tau[j] + spring * tau[j];
        const a = Math.abs(Fneb[j]);
        if (a > maxForce) maxForce = a;
      }

      out.push(inners[i - 1].step(images[i], Fneb).structure);
    }
    out.push(images[m - 1]);

    return { images: out, converged: maxForce < fmax, maxForce };
  }

  return { step, reset };
}

/** Improved tangent: follow the higher-energy neighbor, blend at extrema. */
function improvedTangent(
  eMinus: number,
  e: number,
  ePlus: number,
  tPlus: Float64Array,
  tMinus: Float64Array,
): Float64Array {
  const n = tPlus.length;
  const tau = new Float64Array(n);
  if (ePlus > e && e > eMinus) {
    tau.set(tPlus);
  } else if (ePlus < e && e < eMinus) {
    tau.set(tMinus);
  } else {
    const dMax = Math.max(Math.abs(ePlus - e), Math.abs(eMinus - e));
    const dMin = Math.min(Math.abs(ePlus - e), Math.abs(eMinus - e));
    const [a, b] = ePlus > eMinus ? [dMax, dMin] : [dMin, dMax];
    for (let j = 0; j < n; j++) tau[j] = a * tPlus[j] + b * tMinus[j];
  }
  let len = norm(tau);
  if (!(len > 1e-12)) {
    // Coincident images: fall back without normalizing garbage.
    tau.set(tPlus);
    len = norm(tau);
    if (!(len > 1e-12)) {
      tau.set(tMinus);
      len = norm(tau);
      if (!(len > 1e-12)) return tau; // all zero: plain relaxation
    }
  }
  for (let j = 0; j < n; j++) tau[j] /= len;
  return tau;
}

/**
 * Linear band interpolation between two structures with minimum-image
 * unwrapping, so atoms take the short way across periodic boundaries.
 * Endpoints must share the atom count, species order, and lattice
 * (fixed-cell NEB); returns `count` images including both endpoints.
 */
export function interpolateBand(
  start: Structure,
  end: Structure,
  count: number,
): Structure[] {
  if (count < 2) throw new Error(`Need at least 2 images, got ${count}`);
  const n = start.sites.length;
  if (end.sites.length !== n) {
    throw new Error(
      `Endpoint site counts differ: ${n} vs ${end.sites.length}`,
    );
  }
  for (let i = 0; i < n; i++) {
    if (end.sites[i].species.symbol !== start.sites[i].species.symbol) {
      throw new Error(`Species mismatch at site ${i}`);
    }
  }
  const b0 = start.lattice.basis.data;
  const b1 = end.lattice.basis.data;
  for (let i = 0; i < 9; i++) {
    if (Math.abs(b0[i] - b1[i]) > 1e-6) {
      throw new Error("NEB endpoints must share the lattice (fixed cell)");
    }
  }

  const G = metricTensor(start.lattice).data;
  const deltas: Float64Array[] = start.sites.map((site, i) => {
    const a = site.frac;
    const b = end.sites[i].frac;
    return micDisplacement(
      new Float64Array([b[0] - a[0], b[1] - a[1], b[2] - a[2]]),
      G,
    );
  });

  const images: Structure[] = [];
  for (let img = 0; img < count; img++) {
    const t = img / (count - 1);
    images.push({
      lattice: start.lattice,
      sites: start.sites.map((site, i) => ({
        ...site,
        frac: new Float64Array([
          site.frac[0] + deltas[i][0] * t,
          site.frac[1] + deltas[i][1] * t,
          site.frac[2] + deltas[i][2] * t,
        ]),
      })),
    });
  }
  return images;
}
