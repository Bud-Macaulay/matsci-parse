import type { Pseudopotential } from "../pseudopotential";

/**
 * Approximate single-projector KB form from semilocal potentials:
 * β_l(r) = (V_l(r) − V_loc(r))·r / √|D_l|, D_l = ∫(V_l − V_loc) r² dr.
 *
 * Channels with more than one semilocal entry or a vanishing norm are
 * skipped. Intended for diagnostics and format bridging.
 *
 * @param pp - The pseudopotential with semilocal potentials.
 * @returns A new object with derived KB projectors appended.
 */
export function semilocalToKb(pp: Pseudopotential): Pseudopotential {
  const r = pp.mesh.r;
  const rab = pp.mesh.rab;
  const betas = [...pp.nonlocal.betas];
  const dij: Array<[number, number, number]> = [...pp.nonlocal.dij];
  let idx = betas.length + 1;

  if (pp.semilocal) {
    for (const sl of pp.semilocal) {
      const dv = new Float64Array(r.length);
      for (let k = 0; k < r.length; k++) dv[k] = sl.vnl[k] - pp.local.vloc[k];
      let d = 0;
      for (let k = 0; k < r.length; k++) d += dv[k] * r[k] * r[k] * rab[k];
      if (!Number.isFinite(d) || Math.abs(d) < 1e-12) continue;
      const norm = Math.sqrt(Math.abs(d));
      const sign = d >= 0 ? 1 : -1;
      const beta = new Float64Array(r.length);
      for (let k = 0; k < r.length; k++) beta[k] = (dv[k] * r[k]) / norm;
      betas.push({
        index: idx,
        angularMomentum: sl.l,
        ultrasoftCutoffRadius: r[r.length - 1],
        label: `${sl.l}${"spdf"[sl.l] ?? sl.l}`,
        beta,
      });
      dij.push([idx, idx, sign * Math.abs(d)]);
      idx++;
    }
  }

  return {
    ...pp,
    header: { ...pp.header, numberOfProj: betas.length },
    nonlocal: { ...pp.nonlocal, betas, dij },
  };
}
