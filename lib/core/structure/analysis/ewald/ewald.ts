import { selectErfc, type ErfcMethod } from "@/core/math/erfc";
import { volume } from "@/core/lattice/volume";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { lengths } from "@/core/lattice/lengths";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { row } from "@/core/matrix/operations/row";
import { norm } from "@/core/matrix/operations/vector/norm";
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
  /** Significant figures each sum is converged to. Default 8. */
  accuracy?: number;
  /**
   * erfc evaluator for the real-space sum. `"fast"` is a table (~3e-13
   * relative error on the energy, ~8x quicker), so it cannot honour
   * `accuracy` above ~12; `"exact"` (~1e-15) is the reference path.
   * Default `"auto"`: fast for `accuracy` <= 12, exact above.
   */
  erfc?: "auto" | ErfcMethod;
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

  const accuracy = opts.accuracy ?? 8;
  if (!(accuracy > 0 && Number.isFinite(accuracy))) {
    throw new Error("ewaldSum: accuracy must be positive");
  }
  const vol = volume(structure.lattice);
  const erfcFn = selectErfc(
    opts.erfc === "exact" || (opts.erfc !== "fast" && accuracy > 12)
      ? "exact"
      : "fast",
  );
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
  // Cartesian translations T = n B (rows), computed once for all pairs,
  // then sorted by length so each pair can stop at the first T that cannot
  // reach the cutoff: |d + T| >= |T| - |d| > rmax once |T| > rmax + |d|.
  const T0 = mul(
    createMatrix(shifts.length / 3, 3, shifts),
    structure.lattice.basis,
  ).data;
  const nT = T0.length / 3;
  const tLen2 = new Float64Array(nT);
  for (let t = 0; t < nT; t++) {
    tLen2[t] = T0[3 * t] ** 2 + T0[3 * t + 1] ** 2 + T0[3 * t + 2] ** 2;
  }
  const order = Array.from({ length: nT }, (_, t) => t).sort(
    (a, b) => tLen2[a] - tLen2[b],
  );
  const T = new Float64Array(3 * nT);
  const tLen = new Float64Array(nT);
  for (let t = 0; t < nT; t++) {
    const o = order[t];
    T[3 * t] = T0[3 * o];
    T[3 * t + 1] = T0[3 * o + 1];
    T[3 * t + 2] = T0[3 * o + 2];
    tLen[t] = Math.sqrt(tLen2[o]);
  }
  // Pair Cartesian offsets straight from fractional differences: each
  // offset is wrapped into [-0.5, 0.5] in locals (minimumImage() would
  // allocate per pair) and pushed through the basis inline, so there are no
  // per-row products and no per-pair allocation.
  const B = structure.lattice.basis.data;
  const b0 = B[0];
  const b1 = B[1];
  const b2 = B[2];
  const b3 = B[3];
  const b4 = B[4];
  const b5 = B[5];
  const b6 = B[6];
  const b7 = B[7];
  const b8 = B[8];
  const rmax2 = rmax * rmax;
  let pairSum = 0;
  for (let i = 0; i < n; i++) {
    if (q[i] === 0) continue;
    const fi = structure.sites[i].frac;
    const fi0 = fi[0];
    const fi1 = fi[1];
    const fi2 = fi[2];
    for (let j = i; j < n; j++) {
      const qiqj = q[i] * q[j];
      if (qiqj === 0) continue;
      const fj = structure.sites[j].frac;
      let fu = fj[0] - fi0;
      let fv = fj[1] - fi1;
      let fw = fj[2] - fi2;
      fu -= Math.round(fu);
      fv -= Math.round(fv);
      fw -= Math.round(fw);
      const dx = fu * b0 + fv * b3 + fw * b6;
      const dy = fu * b1 + fv * b4 + fw * b7;
      const dz = fu * b2 + fv * b5 + fw * b8;
      // Sum erfc(sqrt(eta) r) / r over the images r = d + T within the
      // cutoff (allocation-free hot loop), up to the last T that can reach.
      const tStop = rmax + Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9;
      let s = 0;
      for (let t = 0; t < nT && tLen[t] <= tStop; t++) {
        const x = dx + T[3 * t];
        const y = dy + T[3 * t + 1];
        const z = dz + T[3 * t + 2];
        const r2 = x * x + y * y + z * z;
        // The zero translation of a self pair lands here (r2 = 0).
        if (r2 > rmax2 || r2 < 1e-16) continue;
        const r = Math.sqrt(r2);
        s += erfcFn(sqrtEta * r) / r;
      }
      // i<j pairs count twice (both orderings), self-images once each (the
      // translation box is symmetric, so +/-T both appear); the outer 1/2
      // fixes the double count as usual.
      pairSum += (i === j ? 1 : 2) * qiqj * s;
    }
  }
  const real = 0.5 * COULOMB_EV_ANGSTROM * pairSum;

  let reciprocal = 0;
  // Charged sites only; uncharged sites contribute nothing to S(G).
  const active = q.flatMap((qi, i) => (qi !== 0 ? [i] : []));
  if (active.length > 0) {
    const rb = reciprocalLattice(structure.lattice).basis.data;
    // Miller-index box: G . a_i = 2 pi n_i, so |n_i| <= |G| |a_i| / 2pi.
    // (pointsInSphere's ceil((gmax + 0.15) |a|) box is sized for the
    // crystallographic convention without 2pi, ~2pi too wide per axis here:
    // ~250x the candidates.) Inclusion |G| < gmax + 1e-8 as there.
    const [l0, l1, l2] = lengths(structure.lattice);
    const gcut = gmax + 1e-8;
    const n0 = Math.floor((gcut * l0) / (2 * Math.PI));
    const n1 = Math.floor((gcut * l1) / (2 * Math.PI));
    const n2 = Math.floor((gcut * l2) / (2 * Math.PI));
    const gcut2 = gcut * gcut;
    // Trig-free structure factors: G . r_s = 2 pi (h u_s + k v_s + l w_s)
    // for fractional (u, v, w), so exp(i G . r_s) factors per axis. Tabulate
    // exp(2 pi i m f) for |m| <= n per site and axis (each entry from its
    // own cos/sin, no recurrence drift), laid out [m][site][re, im] so the
    // inner site loop reads contiguously.
    const nA = active.length;
    const qa = new Float64Array(nA);
    for (let s = 0; s < nA; s++) qa[s] = q[active[s]];
    const axisPhases = (axis: number, nAx: number): Float64Array => {
      const out = new Float64Array(2 * nA * (2 * nAx + 1));
      for (let m = -nAx; m <= nAx; m++) {
        const base = 2 * nA * (m + nAx);
        for (let s = 0; s < nA; s++) {
          const ph = 2 * Math.PI * m * structure.sites[active[s]].frac[axis];
          out[base + 2 * s] = Math.cos(ph);
          out[base + 2 * s + 1] = Math.sin(ph);
        }
      }
      return out;
    };
    const E0 = axisPhases(0, n0);
    const E1 = axisPhases(1, n1);
    const E2 = axisPhases(2, n2);
    // q_s exp(2 pi i (h u_s + k v_s)), shared by every l of one (h, k).
    const A = new Float64Array(2 * nA);
    // Friedel symmetry: |S(-G)|^2 = |S(G)|^2, so each +/-G pair is counted
    // once, keeping the member whose first nonzero index is positive.
    for (let h = 0; h <= n0; h++) {
      for (let k = h === 0 ? 0 : -n1; k <= n1; k++) {
        const px = h * rb[0] + k * rb[3];
        const py = h * rb[1] + k * rb[4];
        const pz = h * rb[2] + k * rb[5];
        let haveA = false;
        for (let l = h === 0 && k === 0 ? 1 : -n2; l <= n2; l++) {
          const gx = px + l * rb[6];
          const gy = py + l * rb[7];
          const gz = pz + l * rb[8];
          const g2 = gx * gx + gy * gy + gz * gz;
          if (g2 >= gcut2) continue;
          if (!haveA) {
            const bh = 2 * nA * (h + n0);
            const bk = 2 * nA * (k + n1);
            for (let s = 0; s < nA; s++) {
              const hr = E0[bh + 2 * s];
              const hi = E0[bh + 2 * s + 1];
              const kr = E1[bk + 2 * s];
              const ki = E1[bk + 2 * s + 1];
              A[2 * s] = qa[s] * (hr * kr - hi * ki);
              A[2 * s + 1] = qa[s] * (hr * ki + hi * kr);
            }
            haveA = true;
          }
          const bl = 2 * nA * (l + n2);
          let re = 0;
          let im = 0;
          for (let s = 0; s < nA; s++) {
            const ar = A[2 * s];
            const ai = A[2 * s + 1];
            const lr = E2[bl + 2 * s];
            const li = E2[bl + 2 * s + 1];
            re += ar * lr - ai * li;
            im += ar * li + ai * lr;
          }
          reciprocal +=
            2 * (Math.exp(-g2 / (4 * eta)) / g2) * (re * re + im * im);
        }
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
