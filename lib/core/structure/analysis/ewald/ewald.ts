import { erfc } from "@/core/math/erfc";
import { volume } from "@/core/lattice/volume";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { pointsInSphere } from "@/core/structure/analysis/diffraction/reciprocalPoints";
import { cartesian } from "@/core/site/cartesian";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { row } from "@/core/matrix/operations/row";
import { transpose } from "@/core/matrix/operations/transpose";
import { norm } from "@/core/matrix/operations/vector/norm";
import { minimumImage } from "@/core/structure/operations/distance/utils";
import type { Structure } from "@/core/structure/structure";
import { assertOrdered } from "@/core/structure/disordered";

/** Point-charge Coulomb constant: e^2 / (4 pi eps0), in eV·Angstrom. */
const COULOMB_EV_ANGSTROM =
  (1e10 * 1.602176634e-19) / (4 * Math.PI * 8.8541878128e-12);

export interface EwaldOptions {
  /** Screening parameter. Defaults to an auto value balancing real/reciprocal cost. */
  eta?: number;
  /** Real-space cutoff in Angstrom. Defaults to auto from `accuracy`. */
  realCutoff?: number;
  /** Reciprocal-space cutoff in inverse Angstrom. Defaults to auto from `accuracy`. */
  reciprocalCutoff?: number;
  /** Significant figures each sum is converged to. Default 12. */
  accuracy?: number;
}

export interface EwaldEnergies {
  /** Total electrostatic energy in eV (includes charged-cell term). */
  total: number;
  /** Real-space (erfc) term in eV. */
  real: number;
  /** Reciprocal-space term in eV. */
  reciprocal: number;
  /** Self-energy correction in eV. */
  point: number;
  /** Neutralizing-background term in eV (zero for neutral cells). */
  chargedCell: number;
}

/**
 * Ewald-summed electrostatic energy of a periodic point-charge structure.
 *
 * E = E_real + E_recip + E_point (+ E_charged for non-neutral cells), with
 * E_real = 1/2 sum erfc(sqrt(eta) r) q_i q_j / r over periodic images,
 * E_recip = (2 pi / V) sum_{G != 0} exp(-G^2 / 4 eta) / G^2 |S(G)|^2,
 * E_point = -sqrt(eta / pi) sum q_i^2, all scaled to eV.
 *
 * @param structure - The periodic structure (lengths in Angstrom).
 * @param charges - Point charge per site, in units of e.
 * @param opts - Screening, cutoffs, and convergence options.
 * @returns Energy components in eV.
 * @api
 */
export function ewaldSum(
  structure: Structure,
  charges: ArrayLike<number>,
  opts: EwaldOptions = {},
): EwaldEnergies {
  assertOrdered(structure, "ewaldSum");
  const n = structure.sites.length;
  if (charges.length !== n) {
    throw new Error(`ewaldSum: ${charges.length} charges for ${n} sites`);
  }
  const q = Array.from(charges);
  if (!q.every(Number.isFinite)) {
    throw new Error("ewaldSum: charges must be finite");
  }

  const accuracy = opts.accuracy ?? 12;
  if (!(accuracy > 0 && Number.isFinite(accuracy))) {
    throw new Error("ewaldSum: accuracy must be positive");
  }
  const vol = volume(structure.lattice);
  const eta = opts.eta ?? Math.cbrt(n / Math.SQRT2 / vol ** 2) * Math.PI;
  if (!(eta > 0 && Number.isFinite(eta))) {
    throw new Error("ewaldSum: eta must be positive");
  }
  const sqrtEta = Math.sqrt(eta);
  const accf = Math.sqrt(accuracy * Math.LN10);
  const rmax = opts.realCutoff ?? accf / sqrtEta;
  const gmax = opts.reciprocalCutoff ?? 2 * sqrtEta * accf;

  // Real space: symmetric pair loop over lattice translations enumerated
  // once (no per-site neighbor rescan). i<j pairs count twice (both
  // orderings), self-images once each (the translation box is symmetric,
  // so +/-T both appear); the outer 1/2 fixes the double count as usual.
  // NOTE: per-pair erfc dominates; Ewald mesh methods if huge cells get slow.
  const gb = reciprocalLatticeCrystallographic(structure.lattice).basis;
  const gn = [0, 1, 2].map((i) => norm(row(gb, i)));
  if (!gn.every(Number.isFinite)) {
    throw new Error("ewaldSum: degenerate lattice");
  }
  // Pair offsets are wrapped into [-0.5, 0.5], so |n_i| <= rmax |b*_i| + 0.5
  // covers every image within rmax (the fractional extent along axis i of a
  // sphere of radius rmax is rmax |b*_i|).
  const nmax = gn.map((g) => Math.floor(rmax * g + 0.5 + 1e-9));
  const shifts: number[] = [];
  for (let ia = -nmax[0]; ia <= nmax[0]; ia++) {
    for (let ib = -nmax[1]; ib <= nmax[1]; ib++) {
      for (let ic = -nmax[2]; ic <= nmax[2]; ic++) {
        shifts.push(ia, ib, ic);
      }
    }
  }
  // Cartesian translations T = n B (rows), computed once for all pairs.
  const T = mul(
    createMatrix(shifts.length / 3, 3, shifts),
    structure.lattice.basis,
  ).data;
  // Pairs are processed one row i at a time (all j >= i), so buffers
  // stay O(n) rather than O(n^2), and each row needs a single product.
  const rmax2 = rmax * rmax;
  const rowQ = new Float64Array(n);
  const rowFrac = new Float64Array(3 * n);
  const df = new Float64Array(3);
  let pairSum = 0;
  for (let i = 0; i < n; i++) {
    if (q[i] === 0) continue;
    const fi = structure.sites[i].frac;

    // Step 1: collect row i's charged partners j >= i with prefactor
    // weight * q_i q_j and fractional offset wrapped into [-0.5, 0.5].
    let m = 0;
    for (let j = i; j < n; j++) {
      const qiqj = q[i] * q[j];
      if (qiqj === 0) continue;
      const fj = structure.sites[j].frac;
      for (let d = 0; d < 3; d++) df[d] = fj[d] - fi[d];
      rowQ[m] = (i === j ? 1 : 2) * qiqj;
      rowFrac.set(minimumImage(df), 3 * m);
      m++;
    }

    // Step 2: row offsets to Cartesian in one product, D = F B (rows).
    const D = mul(
      createMatrix(m, 3, rowFrac.subarray(0, 3 * m)),
      structure.lattice.basis,
    ).data;

    // Step 3: sum erfc(sqrt(eta) r) / r over the images r = D_p + T of
    // each pair within the cutoff (allocation-free hot loop).
    for (let p = 0; p < m; p++) {
      const dx = D[3 * p];
      const dy = D[3 * p + 1];
      const dz = D[3 * p + 2];
      let s = 0;
      for (let t = 0; t < T.length; t += 3) {
        const x = dx + T[t];
        const y = dy + T[t + 1];
        const z = dz + T[t + 2];
        const r2 = x * x + y * y + z * z;
        // The zero translation of a self pair lands here (r2 = 0).
        if (r2 > rmax2 || r2 < 1e-16) continue;
        const r = Math.sqrt(r2);
        s += erfc(sqrtEta * r) / r;
      }
      pairSum += rowQ[p] * s;
    }
  }
  const real = 0.5 * COULOMB_EV_ANGSTROM * pairSum;

  let reciprocal = 0;
  // Charged sites only; uncharged sites contribute nothing to S(G).
  const active = q.flatMap((qi, i) => (qi !== 0 ? [i] : []));
  if (active.length > 0) {
    const recip = reciprocalLattice(structure.lattice);
    // Friedel symmetry: |S(-G)|^2 = |S(G)|^2, so count each +/-G pair once.
    const seen = new Set<string>();
    const hkl: number[] = [];
    for (const pt of pointsInSphere(structure.lattice, recip, gmax, 0)) {
      if (seen.has(`${-pt.h},${-pt.k},${-pt.l}`)) continue;
      seen.add(`${pt.h},${pt.k},${pt.l}`);
      hkl.push(pt.h, pt.k, pt.l);
    }
    const nG = hkl.length / 3;
    if (nG > 0) {
      const G = mul(createMatrix(nG, 3, hkl), recip.basis);
      const cart = createMatrix(
        active.length,
        3,
        active.flatMap((i) => [
          ...cartesian(structure.lattice, structure.sites[i]),
        ]),
      );
      const qa = active.map((i) => q[i]);
      // phases[g, s] = G_g . r_s
      const phases = mul(G, transpose(cart)).data;
      for (let g = 0; g < nG; g++) {
        const g2 = norm(row(G, g)) ** 2;
        let re = 0;
        let im = 0;
        for (let s = 0; s < qa.length; s++) {
          const phase = phases[g * qa.length + s];
          re += qa[s] * Math.cos(phase);
          im += qa[s] * Math.sin(phase);
        }
        reciprocal +=
          2 * (Math.exp(-g2 / (4 * eta)) / g2) * (re * re + im * im);
      }
    }
    reciprocal *= ((2 * Math.PI) / vol) * COULOMB_EV_ANGSTROM;
  }

  let q2 = 0;
  let totalQ = 0;
  for (const charge of q) {
    q2 += charge * charge;
    totalQ += charge;
  }
  const point = -Math.sqrt(eta / Math.PI) * q2 * COULOMB_EV_ANGSTROM;
  const chargedCell =
    (-COULOMB_EV_ANGSTROM / 2) * (Math.PI / (vol * eta)) * totalQ * totalQ;

  return {
    total: real + reciprocal + point + chargedCell,
    real,
    reciprocal,
    point,
    chargedCell,
  };
}
