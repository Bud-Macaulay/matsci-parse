/** Options for radial grid generation. */
export interface RadialGridOptions {
  /** Number of grid points. */
  npts: number;
  /** Maximum radius in Bohr. */
  rmax: number;
  /** "log" mimics the GTH/log grids; "linear" mimics PSP8. */
  type?: "log" | "linear";
}

/**
 * Generate a radial grid with trapezoidal-style integration weights.
 *
 * @param options - Grid size, extent and type.
 */
export function makeRadialGrid(options: RadialGridOptions): {
  r: Float64Array;
  rab: Float64Array;
} {
  const { npts, rmax, type = "log" } = options;
  const r = new Float64Array(npts);
  const rab = new Float64Array(npts);
  if (type === "linear") {
    const dr = npts > 1 ? rmax / (npts - 1) : 0;
    for (let i = 0; i < npts; i++) {
      r[i] = i * dr;
      rab[i] = dr;
    }
  } else {
    const dx = Math.log(rmax) / (npts - 1);
    for (let i = 0; i < npts; i++) {
      r[i] = Math.exp(dx * i);
      rab[i] = r[i] * dx;
    }
    if (npts > 1) {
      r[0] = r[1] * 0.01;
      rab[0] = r[0] * dx;
    }
  }
  return { r, rab };
}
