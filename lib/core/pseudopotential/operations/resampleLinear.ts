import type { Pseudopotential } from "../pseudopotential";

/** Piecewise-linear interpolation of y(x) at a single point. */
function interp1(x: Float64Array, y: Float64Array, xi: number): number {
  if (xi <= x[0]) return y[0];
  if (xi >= x[x.length - 1]) return y[y.length - 1];
  let lo = 0;
  let hi = x.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= xi) lo = mid;
    else hi = mid;
  }
  const t = (xi - x[lo]) / (x[hi] - x[lo]);
  return y[lo] + t * (y[hi] - y[lo]);
}

/** Resample every radial array of a pseudopotential onto a new grid. */
function resampleArray(
  x: Float64Array,
  y: Float64Array,
  newX: Float64Array,
): Float64Array {
  const out = new Float64Array(newX.length);
  for (let i = 0; i < newX.length; i++) out[i] = interp1(x, y, newX[i]);
  return out;
}

/**
 * Resample a pseudopotential onto a new radial grid (the grid converter).
 * Returns a new object; the header mesh counters and provenance notes are
 * updated accordingly.
 *
 * @param pp - The pseudopotential to resample.
 * @param newR - The new radial grid in Bohr.
 */
export function resampleLinear(
  pp: Pseudopotential,
  newR: Float64Array,
): Pseudopotential {
  const oldR = pp.mesh.r;
  const rab = new Float64Array(newR.length);
  for (let i = 1; i < newR.length; i++) rab[i] = newR[i] - newR[i - 1];
  if (newR.length > 1) rab[0] = rab[1];

  const betas = pp.nonlocal.betas.map((beta) => ({
    ...beta,
    beta: resampleArray(oldR, beta.beta, newR),
  }));
  const semilocal = pp.semilocal?.map((sl) => ({
    ...sl,
    vnl: resampleArray(oldR, sl.vnl, newR),
  }));
  const pswfc = pp.pswfc.map((wfc) => ({
    ...wfc,
    chi: resampleArray(oldR, wfc.chi, newR),
  }));
  const fullWfc = pp.fullWfc?.map((wfc) => ({
    ...wfc,
    aewfc: resampleArray(oldR, wfc.aewfc, newR),
  }));
  const augmentation = pp.nonlocal.augmentation
    ? {
        ...pp.nonlocal.augmentation,
        q: pp.nonlocal.augmentation.q
          ? resampleArray(oldR, pp.nonlocal.augmentation.q, newR)
          : undefined,
        multipoles: pp.nonlocal.augmentation.multipoles
          ? resampleArray(oldR, pp.nonlocal.augmentation.multipoles, newR)
          : undefined,
        qfcoeff: pp.nonlocal.augmentation.qfcoeff
          ? resampleArray(oldR, pp.nonlocal.augmentation.qfcoeff, newR)
          : undefined,
        rinner: pp.nonlocal.augmentation.rinner
          ? resampleArray(oldR, pp.nonlocal.augmentation.rinner, newR)
          : undefined,
        qijl: pp.nonlocal.augmentation.qijl?.map((q) => ({
          ...q,
          qijl: resampleArray(oldR, q.qijl, newR),
        })),
      }
    : undefined;

  return {
    ...pp,
    header: {
      ...pp.header,
      meshSize: newR.length,
    },
    mesh: {
      ...pp.mesh,
      gridType: "custom",
      rmax: newR[newR.length - 1],
      r: newR,
      rab,
    },
    nlcc: pp.nlcc ? resampleArray(oldR, pp.nlcc, newR) : undefined,
    local: { vloc: resampleArray(oldR, pp.local.vloc, newR) },
    semilocal,
    nonlocal: { ...pp.nonlocal, betas, augmentation },
    pswfc,
    fullWfc,
    rhoatom: resampleArray(oldR, pp.rhoatom, newR),
    provenance: {
      ...pp.provenance,
      notes: [
        pp.provenance.notes,
        `resampled from ${oldR.length} to ${newR.length} points`,
      ]
        .filter(Boolean)
        .join("; "),
    },
  };
}
