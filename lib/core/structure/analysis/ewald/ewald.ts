import { selectErfc, type ErfcMethod } from "@/core/math/erfc";
import { volume } from "@/core/lattice/volume";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { lengths } from "@/core/lattice/lengths";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { row } from "@/core/matrix/operations/row";
import { norm } from "@/core/matrix/operations/vector/norm";
import type { Vec3 } from "@/core/site/site";
import type { Structure } from "@/core/structure/structure";
import { assertOrdered } from "@/core/structure/disordered";

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

// ---------------------------------------------------------------- setup
// Geometry-only pieces shared by ewaldSum and ewaldMatrix. None of it
// depends on the charges, so both paths see identical parameters.

/** Point-charge Coulomb constant: e^2 / (4 pi eps0), in eV·Angstrom. */
const COULOMB_EV_ANGSTROM =
  (1e10 * 1.602176634e-19) / (4 * Math.PI * 8.8541878128e-12);

interface EwaldParams {
  vol: number;
  eta: number;
  sqrtEta: number;
  rmax: number;
  rmax2: number;
  gmax: number;
  erfcFn: (x: number) => number;
}

/** Screening and cutoffs from the options (all geometry-only). */
function ewaldParams(
  structure: Structure,
  opts: EwaldOptions,
  ctx: string,
): EwaldParams {
  const n = structure.sites.length;
  const accuracy = opts.accuracy ?? 8;
  if (!(accuracy > 0 && Number.isFinite(accuracy))) {
    throw new Error(`${ctx}: accuracy must be positive`);
  }
  const vol = volume(structure.lattice);
  const erfcFn = selectErfc(
    opts.erfc === "exact" || (opts.erfc !== "fast" && accuracy > 12)
      ? "exact"
      : "fast",
  );
  const eta = opts.eta ?? Math.cbrt(n / Math.SQRT2 / vol ** 2) * Math.PI;
  if (!(eta > 0 && Number.isFinite(eta))) {
    throw new Error(`${ctx}: eta must be positive`);
  }
  const sqrtEta = Math.sqrt(eta);
  const accf = Math.sqrt(accuracy * Math.LN10);
  const rmax = opts.realCutoff ?? accf / sqrtEta;
  const gmax = opts.reciprocalCutoff ?? 2 * sqrtEta * accf;
  return { vol, eta, sqrtEta, rmax, rmax2: rmax * rmax, gmax, erfcFn };
}

interface Translations {
  /** Cartesian lattice translations, 3 per entry, sorted by length. */
  T: Float64Array;
  /** |T| per entry, ascending. */
  tLen: Float64Array;
  nT: number;
}

/**
 * Real-space translations reaching every image within rmax of a pair whose
 * fractional offset is wrapped into [-0.5, 0.5]. Sorted by length so a pair
 * can stop at the first T that cannot reach the cutoff:
 * |d + T| >= |T| - |d| > rmax once |T| > rmax + |d|.
 */
function realTranslations(
  structure: Structure,
  rmax: number,
  ctx: string,
): Translations {
  const gb = reciprocalLatticeCrystallographic(structure.lattice).basis;
  const gn = [0, 1, 2].map((i) => norm(row(gb, i)));
  if (!gn.every(Number.isFinite)) {
    throw new Error(`${ctx}: degenerate lattice`);
  }
  // |n_i| <= rmax |b*_i| + 0.5: the fractional extent along axis i of a
  // sphere of radius rmax is rmax |b*_i|, plus the wrapped offset.
  const nmax = gn.map((g) => Math.floor(rmax * g + 0.5 + 1e-9));
  const shifts: number[] = [];
  for (let ia = -nmax[0]; ia <= nmax[0]; ia++) {
    for (let ib = -nmax[1]; ib <= nmax[1]; ib++) {
      for (let ic = -nmax[2]; ic <= nmax[2]; ic++) {
        shifts.push(ia, ib, ic);
      }
    }
  }
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
  return { T, tLen, nT };
}

/**
 * Cartesian offset r_j - r_i of the nearest image: the fractional difference
 * wrapped into [-0.5, 0.5], through the basis B (row-major). Written into
 * `out` (allocation-free).
 */
function wrappedOffset(
  fi: Vec3,
  fj: Vec3,
  B: Float64Array,
  out: Float64Array,
): void {
  let fu = fj[0] - fi[0];
  let fv = fj[1] - fi[1];
  let fw = fj[2] - fi[2];
  fu -= Math.round(fu);
  fv -= Math.round(fv);
  fw -= Math.round(fw);
  out[0] = fu * B[0] + fv * B[3] + fw * B[6];
  out[1] = fu * B[1] + fv * B[4] + fw * B[7];
  out[2] = fu * B[2] + fv * B[5] + fw * B[8];
}

/**
 * S_ij = sum of erfc(sqrt(eta) r) / r over the periodic images r = d + T
 * of a pair with wrapped offset d, for 0 < r <= rmax. Allocation-free.
 */
function pairImageSum(
  d: Float64Array,
  tr: Translations,
  p: EwaldParams,
): number {
  const dx = d[0];
  const dy = d[1];
  const dz = d[2];
  const { T, tLen, nT } = tr;
  const { rmax, rmax2, sqrtEta, erfcFn } = p;
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
  return s;
}

/**
 * Calls `visit(g2, cos, sin, re, im)` once per reciprocal vector with
 * 0 < |G| < gmax, where cos[s] = cos(G . r_s) and sin[s] = sin(G . r_s)
 * for the listed sites (the arrays are reused between calls) and
 * re + i im = sum_s q_s exp(i G . r_s) is the structure factor for the
 * charges `q` (fused into the same pass). Returns the sum of what `visit`
 * returns.
 *
 * Only one of each +/-G pair is visited, the one whose first nonzero Miller
 * index is positive: |S(-G)|^2 = |S(G)|^2 for real charges, so callers
 * weight each visit by 2.
 *
 * Trig-free: G . r_s = 2 pi (h u_s + k v_s + l w_s) for fractional
 * (u, v, w), so exp(i G . r_s) is a product of per-axis factors
 * exp(2 pi i m f), tabulated once per site and axis.
 */
function forEachG(
  structure: Structure,
  sites: ArrayLike<number>,
  q: ArrayLike<number>,
  gmax: number,
  visit: (
    g2: number,
    cos: Float64Array,
    sin: Float64Array,
    re: number,
    im: number,
  ) => number,
): number {
  const n = sites.length;
  if (n === 0) return 0;
  const rb = reciprocalLattice(structure.lattice).basis.data;

  // Miller box: G . a_i = 2 pi m_i, so |m_i| <= |G| |a_i| / 2pi. (Not
  // pointsInSphere's box, which is sized for the convention without 2pi
  // and would be ~2pi too wide per axis.)
  const [l0, l1, l2] = lengths(structure.lattice);
  const gcut = gmax + 1e-8;
  const gcut2 = gcut * gcut;
  const n0 = Math.floor((gcut * l0) / (2 * Math.PI));
  const n1 = Math.floor((gcut * l1) / (2 * Math.PI));
  const n2 = Math.floor((gcut * l2) / (2 * Math.PI));

  // exp(2 pi i m f_s) for |m| <= nAx, as [m][site][re, im]. Each entry from
  // its own cos/sin, so there is no recurrence drift.
  const phases = (axis: number, nAx: number): Float64Array => {
    const out = new Float64Array(2 * n * (2 * nAx + 1));
    for (let m = -nAx; m <= nAx; m++) {
      const base = 2 * n * (m + nAx);
      for (let s = 0; s < n; s++) {
        const ph = 2 * Math.PI * m * structure.sites[sites[s]].frac[axis];
        out[base + 2 * s] = Math.cos(ph);
        out[base + 2 * s + 1] = Math.sin(ph);
      }
    }
    return out;
  };
  const ph = phases(0, n0);
  const pk = phases(1, n1);
  const pl = phases(2, n2);

  const hk = new Float64Array(2 * n); // exp(2 pi i (h u + k v)), per (h, k)
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  let total = 0;
  for (let h = 0; h <= n0; h++) {
    for (let k = h === 0 ? 0 : -n1; k <= n1; k++) {
      const px = h * rb[0] + k * rb[3];
      const py = h * rb[1] + k * rb[4];
      const pz = h * rb[2] + k * rb[5];
      let haveHk = false;
      for (let l = h === 0 && k === 0 ? 1 : -n2; l <= n2; l++) {
        const gx = px + l * rb[6];
        const gy = py + l * rb[7];
        const gz = pz + l * rb[8];
        const g2 = gx * gx + gy * gy + gz * gz;
        if (g2 >= gcut2) continue;
        if (!haveHk) {
          const bh = 2 * n * (h + n0);
          const bk = 2 * n * (k + n1);
          for (let s = 0; s < n; s++) {
            const hr = ph[bh + 2 * s];
            const hi = ph[bh + 2 * s + 1];
            const kr = pk[bk + 2 * s];
            const ki = pk[bk + 2 * s + 1];
            hk[2 * s] = hr * kr - hi * ki;
            hk[2 * s + 1] = hr * ki + hi * kr;
          }
          haveHk = true;
        }
        const bl = 2 * n * (l + n2);
        let re = 0;
        let im = 0;
        for (let s = 0; s < n; s++) {
          const ar = hk[2 * s];
          const ai = hk[2 * s + 1];
          const lr = pl[bl + 2 * s];
          const li = pl[bl + 2 * s + 1];
          const c = ar * lr - ai * li;
          const sn = ar * li + ai * lr;
          cos[s] = c;
          sin[s] = sn;
          re += q[s] * c;
          im += q[s] * sn;
        }
        total += visit(g2, cos, sin, re, im);
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------- sums

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

  const p = ewaldParams(structure, opts, "ewaldSum");
  const { vol, eta } = p;
  const sites = structure.sites;

  // Real space: pairs j >= i over translations enumerated once. i<j pairs
  // count twice (both orderings), self-images once each (the translation
  // box is symmetric, so +/-T both appear); the outer 1/2 fixes the double
  // count as usual.
  const tr = realTranslations(structure, p.rmax, "ewaldSum");
  const B = structure.lattice.basis.data;
  const d = new Float64Array(3);
  let pairSum = 0;
  for (let i = 0; i < n; i++) {
    if (q[i] === 0) continue;
    for (let j = i; j < n; j++) {
      const qiqj = q[i] * q[j];
      if (qiqj === 0) continue;
      wrappedOffset(sites[i].frac, sites[j].frac, B, d);
      const s = pairImageSum(d, tr, p);
      pairSum += (i === j ? 1 : 2) * qiqj * s;
    }
  }
  const real = 0.5 * COULOMB_EV_ANGSTROM * pairSum;

  // Reciprocal space over the charged sites only (uncharged ones add
  // nothing to S(G)); each visit stands for a +/-G pair, hence the 2.
  const active = q.flatMap((qi, i) => (qi !== 0 ? [i] : []));
  const qa = Float64Array.from(active, (i) => q[i]);
  let reciprocal = forEachG(
    structure,
    active,
    qa,
    p.gmax,
    (g2, _cos, _sin, re, im) =>
      2 * (Math.exp(-g2 / (4 * eta)) / g2) * (re * re + im * im),
  );
  reciprocal *= ((2 * Math.PI) / vol) * COULOMB_EV_ANGSTROM;

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

// ---------------------------------------------------------------- kernel

/**
 * Charge-independent Ewald kernel of one geometry: E(q) = q^T K q.
 * Every term of the Ewald energy is a quadratic form in the charges with
 * coefficients that depend only on the lattice and positions (eta and the
 * cutoffs too), so K is computed once and reused for any charges.
 */
export interface EwaldMatrix {
  /** Number of sites. */
  n: number;
  /** Symmetric n x n kernel, row-major, in eV per e^2. */
  data: Float64Array;
}

/**
 * Ewald kernel K of a structure, such that `ewaldMatrixEnergy(K, q)` equals
 * `ewaldSum(structure, q, opts).total` for every charge vector q.
 *
 * Built in O(n^2 (images + nG)), after which each energy is O(n^2) with no
 * erfc or trig: worth it when many charge assignments share one geometry,
 * e.g. ranking the orderings of one supercell. For a single evaluation,
 * {@link ewaldSum} is cheaper.
 *
 * @param structure - The periodic structure (lengths in Angstrom).
 * @param opts - Screening, cutoffs, and convergence options (as ewaldSum).
 * @returns The kernel.
 */
export function ewaldMatrix(
  structure: Structure,
  opts: EwaldOptions = {},
): EwaldMatrix {
  assertOrdered(structure, "ewaldMatrix");
  const n = structure.sites.length;
  const p = ewaldParams(structure, opts, "ewaldMatrix");
  const sites = structure.sites;
  const K = new Float64Array(n * n);
  // All terms fill the upper triangle (j >= i); mirrored at the end.

  // Real space: E_real = 1/2 C sum_ij q_i q_j S_ij, so K_ij = C S_ij / 2
  // (q^T K q then counts each i<j pair twice, as it should).
  const tr = realTranslations(structure, p.rmax, "ewaldMatrix");
  const B = structure.lattice.basis.data;
  const halfC = 0.5 * COULOMB_EV_ANGSTROM;
  const d = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      wrappedOffset(sites[i].frac, sites[j].frac, B, d);
      K[i * n + j] = halfC * pairImageSum(d, tr, p);
    }
  }

  // Reciprocal space: |S(G)|^2 = sum_ij q_i q_j (c_i c_j + s_i s_j), so
  // each G adds the rank-2 update w_G (c c^T + s s^T); the 2 counts its -G.
  const pref = ((2 * Math.PI) / p.vol) * COULOMB_EV_ANGSTROM;
  const all = Array.from({ length: n }, (_, i) => i);
  const ones = new Float64Array(n).fill(1); // S(G) itself is not needed here
  forEachG(structure, all, ones, p.gmax, (g2, cos, sin) => {
    const w = pref * 2 * (Math.exp(-g2 / (4 * p.eta)) / g2);
    for (let i = 0; i < n; i++) {
      const wc = w * cos[i];
      const ws = w * sin[i];
      const rowI = i * n;
      for (let j = i; j < n; j++) K[rowI + j] += wc * cos[j] + ws * sin[j];
    }
    return 0;
  });

  // Point (self) term on the diagonal; the neutralizing background is
  // -(C/2) pi/(V eta) (sum q)^2, a constant added to every entry.
  const point = -Math.sqrt(p.eta / Math.PI) * COULOMB_EV_ANGSTROM;
  const background = (-COULOMB_EV_ANGSTROM / 2) * (Math.PI / (p.vol * p.eta));
  for (let i = 0; i < n; i++) {
    K[i * n + i] += point;
    for (let j = i; j < n; j++) {
      const v = K[i * n + j] + background;
      K[i * n + j] = v;
      K[j * n + i] = v;
    }
  }
  return { n, data: K };
}

/**
 * Total Ewald energy q^T K q in eV for charges q (units of e), from a
 * kernel built by {@link ewaldMatrix}. O(n^2).
 */
export function ewaldMatrixEnergy(
  matrix: EwaldMatrix,
  charges: ArrayLike<number>,
): number {
  const { n, data } = matrix;
  if (charges.length !== n) {
    throw new Error(
      `ewaldMatrixEnergy: ${charges.length} charges for ${n} sites`,
    );
  }
  let e = 0;
  for (let i = 0; i < n; i++) {
    const qi = charges[i];
    if (qi === 0) continue;
    const rowI = i * n;
    let s = 0;
    for (let j = 0; j < n; j++) s += data[rowI + j] * charges[j];
    e += qi * s;
  }
  return e;
}

/** Same lattice and same site positions (species may differ). */
function geometryKey(s: Structure): string {
  const parts = [Array.from(s.lattice.basis.data).join(",")];
  for (const site of s.sites) parts.push(Array.from(site.frac).join(","));
  return parts.join(";");
}

/**
 * Total Ewald energies (eV) of many structures, as
 * `ewaldSum(structures[i], charges[i], opts).total`, but reusing one
 * {@link ewaldMatrix} per distinct geometry shared by two or more of them
 * (e.g. the orderings of one supercell from the enumerators). A structure
 * whose geometry is unique (e.g. each frame of a trajectory) uses ewaldSum
 * directly: building a kernel to use once costs up to ~8x more at 500 sites.
 *
 * @param structures - Ordered structures.
 * @param charges - Point charges per site of each structure.
 * @param opts - Ewald options, applied to every structure.
 * @returns Total energy of each structure, in input order.
 */
export function ewaldEnergies(
  structures: Structure[],
  charges: ArrayLike<number>[],
  opts: EwaldOptions = {},
): number[] {
  if (charges.length !== structures.length) {
    throw new Error(
      `ewaldEnergies: ${charges.length} charge vectors for ${structures.length} structures`,
    );
  }
  const groups = new Map<string, number[]>();
  structures.forEach((s, i) => {
    const key = geometryKey(s);
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  });
  const out = new Array<number>(structures.length);
  for (const idx of groups.values()) {
    if (idx.length === 1) {
      out[idx[0]] = ewaldSum(structures[idx[0]], charges[idx[0]], opts).total;
      continue;
    }
    const K = ewaldMatrix(structures[idx[0]], opts);
    for (const i of idx) {
      if (!Array.from(charges[i]).every(Number.isFinite)) {
        throw new Error("ewaldEnergies: charges must be finite");
      }
      out[i] = ewaldMatrixEnergy(K, charges[i]);
    }
  }
  return out;
}
