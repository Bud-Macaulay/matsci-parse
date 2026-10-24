// TODO: see what here can be used for electronic bands

import type { PhononBands } from "../phonon";
import { linearAssignment } from "../../math/assignment";
import { pathBreaks } from "./path";

/**
 * Bonus added to keeping a mode's raw index between consecutive q-points,
 * so ties (degenerate subspaces, zero eigenvectors) and round-off-level
 * differences keep the frequency ordering instead of shuffling it.
 */
const KEEP_BIAS = 1e-9;

/**
 * Reorder modes at each q-point so that band n follows the same branch
 * through crossings. Between consecutive q-points the modes are matched by
 * the permutation σ maximising Σᵢ |⟨e_prev_i|e_σ(i)⟩|², solved exactly as a
 * linear assignment problem (Hungarian method, O(nmodes³) per step), unlike
 * greedy best-overlap matching, which can commit early to a pick that
 * forces a poor one later.
 *
 * When every mode's best match is strict and no two share one, that
 * matching is the unique optimum and the solver is skipped: along smooth
 * stretches of the path it only runs at q-points with crossings.
 *
 * Squared overlaps are the projection weights of one basis onto the other:
 * for orthonormal eigenvectors each row and column of the weight matrix sums
 * to 1, so the score is the total weight carried along the matched branches.
 * Ordering is kept as-is across path breaks, where overlaps are meaningless,
 * and everywhere for bands without eigenvectors.
 *
 * @param opts.masses - Site masses (amu, see {@link siteMasses}), for bands
 *   whose vectors are displacement patterns u_s = e_s / √M_s (QE
 *   matdyn.modes) rather than eigenvectors (phonopy). Each vector is then
 *   scaled back by √M_s and renormalized, recovering the orthonormal
 *   eigenvectors the overlaps assume; without it, modes of crystals with
 *   unequal masses are not orthogonal and overlap spuriously.
 */
export function connectBands(
  bands: PhononBands,
  opts: { masses?: ArrayLike<number> } = {},
): PhononBands {
  const { nqpts, nmodes, frequencies, eigenvectors } = bands;
  // nothing to follow branches by: keep the file's order
  if (!eigenvectors) return { ...bands };
  const vecSize = nmodes * 2; // complex components per mode
  const qSize = nmodes * vecSize;
  const breaks = new Set(pathBreaks(bands));

  // scale[k] = √M of the site owning complex component k (1 without masses)
  const scale = new Float64Array(nmodes).fill(1);
  if (opts.masses) {
    if (opts.masses.length !== nmodes / 3) {
      throw new Error(`Expected ${nmodes / 3} masses, got ${opts.masses.length}`);
    }
    for (let k = 0; k < nmodes; k++) scale[k] = Math.sqrt(opts.masses[Math.floor(k / 3)]);
  }

  const freqOut = new Float64Array(frequencies.length);
  const vecOut = new Float64Array(eigenvectors.length);

  // order[n] = raw mode index at the current q-point that band n maps to
  const order = Int32Array.from({ length: nmodes }, (_, i) => i);
  // best[i] = cheapest column of row i, when strict; taken[j] = column j is someone's best
  const best = new Int32Array(nmodes);
  const taken = new Uint8Array(nmodes);
  // overlap costs (see overlapCosts), minimised by the assignment
  const cost = new Float64Array(nmodes * nmodes);
  // mass-scaled, normalized vectors of the previous and current q-point
  let prevVecs = new Float64Array(qSize);
  let curVecs = new Float64Array(qSize);

  for (let q = 0; q < nqpts; q++) {
    normalizedModes(eigenvectors, q * qSize, nmodes, scale, curVecs);
    if (q > 0 && !breaks.has(q - 1)) {
      overlapCosts(prevVecs, curVecs, nmodes, cost);
      let obvious = true;
      taken.fill(0);
      for (let i = 0; i < nmodes; i++) {
        let bestCost = Infinity;
        let tied = false;
        for (let j = 0; j < nmodes; j++) {
          const c = cost[i * nmodes + j];
          if (c < bestCost) {
            bestCost = c;
            best[i] = j;
            tied = false;
          } else if (c === bestCost) {
            tied = true;
          }
        }
        if (tied || taken[best[i]]) obvious = false;
        taken[best[i]] = 1;
      }
      // connection[i] = raw index at q matched to raw index i at q - 1
      const connection = obvious ? best : linearAssignment(cost, nmodes);
      for (let n = 0; n < nmodes; n++) order[n] = connection[order[n]];
    }
    [prevVecs, curVecs] = [curVecs, prevVecs];

    for (let n = 0; n < nmodes; n++) {
      const raw = order[n];
      freqOut[q * nmodes + n] = frequencies[q * nmodes + raw];
      const src = q * qSize + raw * vecSize;
      vecOut.set(eigenvectors.subarray(src, src + vecSize), q * qSize + n * vecSize);
    }
  }

  return { ...bands, frequencies: freqOut, eigenvectors: vecOut };
}

/**
 * cost[i * nmodes + j] = -|⟨prev_i | cur_j⟩|², less {@link KEEP_BIAS} on the
 * diagonal. Two columns are computed per pass so each loaded component of
 * prev_i is used twice; each sum is still accumulated in component order.
 */
function overlapCosts(prev: Float64Array, cur: Float64Array, nmodes: number, cost: Float64Array): void {
  const vecSize = nmodes * 2;
  for (let i = 0; i < nmodes; i++) {
    const a = i * vecSize;
    let j = 0;
    for (; j + 1 < nmodes; j += 2) {
      const b0 = j * vecSize;
      const b1 = b0 + vecSize;
      let re0 = 0;
      let im0 = 0;
      let re1 = 0;
      let im1 = 0;
      for (let c = 0; c < vecSize; c += 2) {
        const ar = prev[a + c];
        const ai = prev[a + c + 1];
        const br0 = cur[b0 + c];
        const bi0 = cur[b0 + c + 1];
        const br1 = cur[b1 + c];
        const bi1 = cur[b1 + c + 1];
        re0 += ar * br0 + ai * bi0;
        im0 += ar * bi0 - ai * br0;
        re1 += ar * br1 + ai * bi1;
        im1 += ar * bi1 - ai * br1;
      }
      cost[i * nmodes + j] = -(re0 * re0 + im0 * im0) - (i === j ? KEEP_BIAS : 0);
      cost[i * nmodes + j + 1] = -(re1 * re1 + im1 * im1) - (i === j + 1 ? KEEP_BIAS : 0);
    }
    for (; j < nmodes; j++) {
      const b = j * vecSize;
      let re = 0;
      let im = 0;
      for (let c = 0; c < vecSize; c += 2) {
        const ar = prev[a + c];
        const ai = prev[a + c + 1];
        const br = cur[b + c];
        const bi = cur[b + c + 1];
        re += ar * br + ai * bi;
        im += ar * bi - ai * br;
      }
      cost[i * nmodes + j] = -(re * re + im * im) - (i === j ? KEEP_BIAS : 0);
    }
  }
}

/**
 * Copy the modes of one q-point (starting at `start`) into `out`, each
 * complex component k multiplied by `scale[k]` and each vector normalized
 * to 1. Zero vectors (e.g. no eigenvectors in the source) stay zero.
 */
function normalizedModes(
  eigenvectors: Float64Array,
  start: number,
  nmodes: number,
  scale: Float64Array,
  out: Float64Array,
): void {
  const vecSize = nmodes * 2;
  for (let m = 0; m < nmodes; m++) {
    const o = m * vecSize;
    let norm = 0;
    for (let c = 0; c < vecSize; c++) {
      const x = eigenvectors[start + o + c] * scale[c >> 1];
      out[o + c] = x;
      norm += x * x;
    }
    const inv = norm > 0 ? 1 / Math.sqrt(norm) : 0;
    for (let c = 0; c < vecSize; c++) out[o + c] *= inv;
  }
}
