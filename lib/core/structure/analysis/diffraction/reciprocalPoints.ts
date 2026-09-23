import { Lattice } from "../../../lattice/lattice";
import { lengths } from "../../../lattice/lengths";

/** Numerical tolerance matching pymatgen's sphere search cutoff. */
export const SPHERE_TOL = 1e-8;

/** A reciprocal lattice point with Miller indices and |g| in inverse angstroms. */
export interface ReciprocalPoint {
  h: number;
  k: number;
  l: number;
  g: number;
}

/** Convert a two-theta range in degrees to limiting-sphere radii.
 * @param range - Two-theta range, or null for the full limiting sphere.
 * @param wavelength - Wavelength in angstroms.
 * @returns [minR, maxR] in inverse angstroms. */
export function twoThetaRangeToRadii(
  range: readonly [number, number] | null,
  wavelength: number,
): [number, number] {
  if (range === null) {
    return [0, 2 / wavelength];
  }

  return [
    (2 * Math.sin(((range[0] / 2) * Math.PI) / 180)) / wavelength,
    (2 * Math.sin(((range[1] / 2) * Math.PI) / 180)) / wavelength,
  ];
}

/** Enumerate reciprocal lattice points within maxR of the origin.
 * Uses pymatgen's search box ceil((maxR + 0.15) * |a|) per direct-lattice
 * direction, keeps points with |g| < maxR + 1e-8 (and g >= minR when minR
 * is nonzero), and sorts by (g, -h, -k, -l). */
export function pointsInSphere(
  direct: Lattice,
  recip: Lattice,
  maxR: number,
  minR: number,
): ReciprocalPoint[] {
  const m = recip.basis.data;
  const [l0, l1, l2] = lengths(direct);

  const n0 = Math.ceil((maxR + 0.15) * l0);
  const n1 = Math.ceil((maxR + 0.15) * l1);
  const n2 = Math.ceil((maxR + 0.15) * l2);

  const points: ReciprocalPoint[] = [];

  for (let h = -n0; h <= n0; h++) {
    for (let k = -n1; k <= n1; k++) {
      for (let l = -n2; l <= n2; l++) {
        if (h === 0 && k === 0 && l === 0) {
          continue;
        }

        const x = h * m[0] + k * m[3] + l * m[6];
        const y = h * m[1] + k * m[4] + l * m[7];
        const z = h * m[2] + k * m[5] + l * m[8];
        const g = Math.sqrt(x * x + y * y + z * z);

        if (g < maxR + SPHERE_TOL && (minR === 0 || g >= minR)) {
          points.push({ h, k, l, g });
        }
      }
    }
  }

  points.sort((a, b) => a.g - b.g || b.h - a.h || b.k - a.k || b.l - a.l);

  return points;
}
