import type {
  BetaProjector,
  Pseudopotential,
} from "../pseudopotential";

import { listChannels } from "./listChannels";

/**
 * Approximate semilocal potentials from Kleinman-Bylander projectors:
 * V_l(r) = V_loc(r) + Σ_ij β_i(r) D_ij β_j(r) / r².
 *
 * Note: this assumes the UPF convention of storing β(r)·r. Intended for
 * diagnostics and format bridging, not for production KB generation.
 *
 * @param pp - The pseudopotential with KB projectors.
 * @returns A new object with derived semilocal potentials attached.
 */
export function kbToSemilocal(pp: Pseudopotential): Pseudopotential {
  const r = pp.mesh.r;
  const semilocal = listChannels(pp)
    .filter((ch) => ch.betas.length > 0)
    .map((ch) => {
      const vnl = new Float64Array(r.length);
      const globalIdx = new Map<BetaProjector, number>();
      pp.nonlocal.betas.forEach((b, i) => globalIdx.set(b, i + 1));
      const dOf = (i: number, j: number): number => {
        const entry = pp.nonlocal.dij.find(
          ([nb, mb]) => nb === i && mb === j,
        );
        return entry ? entry[2] : 0;
      };
      for (let k = 0; k < r.length; k++) {
        let v = pp.local.vloc[k];
        const rk = r[k] < 1e-15 ? 1e-15 : r[k];
        for (const bi of ch.betas) {
          for (const bj of ch.betas) {
            const i = globalIdx.get(bi) ?? 0;
            const j = globalIdx.get(bj) ?? 0;
            v += (bi.beta[k] * dOf(i, j) * bj.beta[k]) / (rk * rk);
          }
        }
        vnl[k] = v;
      }
      return { l: ch.l, vnl };
    });

  return { ...pp, semilocal };
}
