import { erfc } from "@/core/math/erfc";
import { volume } from "@/core/lattice/volume";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { pointsInSphere } from "@/core/structure/analysis/diffraction/reciprocalPoints";
import { cartesian } from "@/core/site/cartesian";
import type { Structure } from "@/core/structure/structure";

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
 */
export function ewaldSum(
  structure: Structure,
  charges: ArrayLike<number>,
  opts: EwaldOptions = {},
): EwaldEnergies {
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

  const cart = structure.sites.map((site) =>
    cartesian(structure.lattice, site),
  );

  // Real space: symmetric pair loop over lattice translations enumerated
  // once (no per-site neighbor rescan). i<j pairs count twice (both
  // orderings), self-images once each (the translation box is symmetric,
  // so +/-T both appear); the outer 1/2 fixes the double count as usual.
  // ponytail: per-pair erfc dominates; Ewald mesh methods if huge cells get slow.
  const b = structure.lattice.basis.data;
  const gb = reciprocalLatticeCrystallographic(structure.lattice).basis.data;
  const gn = [0, 1, 2].map((i) =>
    Math.sqrt(gb[i * 3] ** 2 + gb[i * 3 + 1] ** 2 + gb[i * 3 + 2] ** 2),
  );
  if (!gn.every(Number.isFinite)) {
    throw new Error("ewaldSum: degenerate lattice");
  }
  const nmax = gn.map((g) => Math.floor(rmax * g + 0.5 + 1e-9));
  const rmax2 = rmax * rmax;
  const fracs = structure.sites.map((site) => site.frac);
  let pairSum = 0;
  for (let i = 0; i < n; i++) {
    if (q[i] === 0) continue;
    for (let j = i; j < n; j++) {
      const qiqj = q[i] * q[j];
      if (qiqj === 0) continue;
      const self = i === j;
      const weight = self ? 1 : 2;
      const dx0 = fracs[j][0] - fracs[i][0];
      const dy0 = fracs[j][1] - fracs[i][1];
      const dz0 = fracs[j][2] - fracs[i][2];
      for (let ia = -nmax[0]; ia <= nmax[0]; ia++) {
        for (let ib = -nmax[1]; ib <= nmax[1]; ib++) {
          for (let ic = -nmax[2]; ic <= nmax[2]; ic++) {
            if (self && ia === 0 && ib === 0 && ic === 0) continue;
            const dx = dx0 + ia;
            const dy = dy0 + ib;
            const dz = dz0 + ic;
            const x = dx * b[0] + dy * b[3] + dz * b[6];
            const y = dx * b[1] + dy * b[4] + dz * b[7];
            const z = dx * b[2] + dy * b[5] + dz * b[8];
            const r2 = x * x + y * y + z * z;
            if (r2 > rmax2 || r2 < 1e-16) continue;
            const r = Math.sqrt(r2);
            pairSum += (weight * qiqj * erfc(sqrtEta * r)) / r;
          }
        }
      }
    }
  }
  const real = 0.5 * COULOMB_EV_ANGSTROM * pairSum;

  let reciprocal = 0;
  if (n > 0) {
    const recip = reciprocalLattice(structure.lattice);
    const m = recip.basis.data;
    // Charged sites only; uncharged sites contribute nothing to S(G).
    const active = cart
      .map((c, i) => ({ c, qi: q[i] }))
      .filter(({ qi }) => qi !== 0);
    // Friedel symmetry: |S(-G)|^2 = |S(G)|^2, so count each +/-G pair once.
    const seen = new Set<string>();
    for (const pt of pointsInSphere(structure.lattice, recip, gmax, 0)) {
      const neg = `${-pt.h},${-pt.k},${-pt.l}`;
      if (seen.has(neg)) continue;
      seen.add(`${pt.h},${pt.k},${pt.l}`);
      const gx = pt.h * m[0] + pt.k * m[3] + pt.l * m[6];
      const gy = pt.h * m[1] + pt.k * m[4] + pt.l * m[7];
      const gz = pt.h * m[2] + pt.k * m[5] + pt.l * m[8];
      const g2 = gx * gx + gy * gy + gz * gz;
      let re = 0;
      let im = 0;
      for (const { c, qi } of active) {
        const phase = gx * c[0] + gy * c[1] + gz * c[2];
        re += qi * Math.cos(phase);
        im += qi * Math.sin(phase);
      }
      reciprocal += 2 * (Math.exp(-g2 / (4 * eta)) / g2) * (re * re + im * im);
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
