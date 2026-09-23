import { Lattice } from "../../../lattice/lattice";
import { lengths } from "../../../lattice/lengths";
import { reciprocalLatticeCrystallographic } from "../../../lattice/reciprocalLatticeCrystallographic";
import { isHexagonal } from "../../../lattice/properties/isHexagonal";
import { Structure } from "../../structure";
import { PeriodicTable } from "../../../data/periodictable/atomicData";
import { ATOMIC_SCATTERING_PARAMS } from "./atomicScattering";
import { MillerFamily, getUniqueFamilies } from "./uniqueFamilies";
import { resolveWavelength } from "./wavelengths";

/** Tolerance in two-theta degrees within which peaks are merged. */
export const TWO_THETA_TOL = 1e-5;

/** Peaks with scaled intensity below this are treated as systematic absences. */
export const SCALED_INTENSITY_TOL = 1e-3;

/** Numerical tolerance matching pymatgen's sphere search cutoff. */
const SPHERE_TOL = 1e-8;

/** Prefactor in the Waasmaier-Kirfel scattering factor formula. */
const SCATTERING_PREFACTOR = 41.78214;

/** Options for {@link calculateXrdPattern}. */
export interface XrdOptions {
  /** Anode/filter key (e.g. "CuKa") or wavelength in angstroms. Defaults to "CuKa". */
  wavelength?: string | number;
  /** Two-theta range in degrees. Defaults to [0, 90]. Null uses the full limiting sphere. */
  twoThetaRange?: readonly [number, number] | null;
  /** Scale the maximum peak to 100. Defaults to true. */
  scaled?: boolean;
  /** Debye-Waller factors keyed by element symbol. Defaults to {}. */
  debyeWallerFactors?: Readonly<Record<string, number>>;
}

/** A calculated X-ray powder diffraction pattern. */
export interface XrdPattern {
  /** Two-theta peak positions in degrees. */
  twoTheta: number[];
  /** Peak intensities (scaled to max 100 when requested). */
  intensities: number[];
  /** Unique Miller-index families contributing to each peak. */
  hkls: MillerFamily[][];
  /** Interplanar spacings in angstroms for each peak. */
  dSpacings: number[];
}

interface ExpandedSite {
  z: number;
  coeffs: ReadonlyArray<readonly [number, number]>;
  occu: number;
  dw: number;
  fx: number;
  fy: number;
  fz: number;
}

const SYMBOL_TO_Z = new Map<string, number>(
  Object.values(PeriodicTable).map((el) => [el.symbol, el.atomicNumber]),
);

function occupancyOf(site: Structure["sites"][number]): number {
  const occu = site.species.properties?.occu;

  return typeof occu === "number" ? occu : 1;
}

function expandSites(structure: Structure, debyeWallerFactors: Readonly<Record<string, number>>): ExpandedSite[] {
  return structure.sites.map((site) => {
    const symbol = site.species.symbol;
    const coeffs = ATOMIC_SCATTERING_PARAMS[symbol];

    if (coeffs === undefined) {
      throw new Error(
        `Unable to calculate XRD pattern as there is no scattering coefficients for ${symbol}.`,
      );
    }

    const z = SYMBOL_TO_Z.get(symbol);

    if (z === undefined) {
      throw new Error(`Unable to calculate XRD pattern as there is no atomic number for ${symbol}.`);
    }

    const frac = site.frac;

    return {
      z,
      coeffs,
      occu: occupancyOf(site),
      dw: debyeWallerFactors[symbol] ?? 0,
      fx: frac[0],
      fy: frac[1],
      fz: frac[2],
    };
  });
}

interface ReciprocalPoint {
  h: number;
  k: number;
  l: number;
  g: number;
}

/** Enumerate reciprocal lattice points within maxR of the origin.
 * Uses pymatgen's search box ceil((maxR + 0.15) * |a|) per direct-lattice
 * direction and keeps points with |g| < maxR + 1e-8. */
function pointsInSphere(direct: Lattice, recip: Lattice, maxR: number, minR: number): ReciprocalPoint[] {
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

/** Compute the X-ray powder diffraction pattern of a crystal structure.
 *
 * Ports pymatgen's XRDCalculator formalism (De Graef & McHenry, ch. 11-12):
 * reciprocal points within the limiting sphere 2/lambda, Bragg condition,
 * Waasmaier-Kirfel atomic scattering factors, structure-factor intensities
 * with Lorentz-polarization correction, and peak merging. Symmetry
 * refinement (pymatgen's symprec) is not applied; pass a refined structure
 * if needed.
 *
 * @param structure - Crystal structure with lattice basis rows in angstroms.
 * @param options - Wavelength, range, scaling, Debye-Waller factors.
 * @returns Two-theta positions, intensities, Miller families, d-spacings. */
export function calculateXrdPattern(structure: Structure, options?: XrdOptions): XrdPattern {
  const wavelength = resolveWavelength(options?.wavelength ?? "CuKa");
  const range = options?.twoThetaRange === undefined ? ([0, 90] as const) : options.twoThetaRange;
  const scaled = options?.scaled ?? true;
  const debyeWallerFactors = options?.debyeWallerFactors ?? {};

  const DEG = 180 / Math.PI;

  let minR = 0;
  let maxR = 2 / wavelength;

  if (range !== null) {
    minR = (2 * Math.sin(((range[0] / 2) * Math.PI) / 180)) / wavelength;
    maxR = (2 * Math.sin(((range[1] / 2) * Math.PI) / 180)) / wavelength;
  }

  const sites = expandSites(structure, debyeWallerFactors);
  const hex = isHexagonal(structure.lattice);
  const recip = reciprocalLatticeCrystallographic(structure.lattice);
  const points = pointsInSphere(structure.lattice, recip, maxR, minR);

  interface Peak {
    intensity: number;
    hkls: number[][];
    twoTheta: number;
    d: number;
  }

  const peaks = new Map<number, Peak>();

  for (const pt of points) {
    const theta = Math.asin(Math.max(-1, Math.min(1, (wavelength * pt.g) / 2)));
    const s2 = (pt.g / 2) * (pt.g / 2);

    let re = 0;
    let im = 0;

    for (const site of sites) {
      let gauss = 0;
      const coeffs = site.coeffs;

      for (let c = 0; c < coeffs.length; c++) {
        gauss += coeffs[c][0] * Math.exp(-coeffs[c][1] * s2);
      }

      const f = site.z - SCATTERING_PREFACTOR * s2 * gauss;
      const amp = f * site.occu * Math.exp(-site.dw * s2);
      const phase = 2 * Math.PI * (pt.h * site.fx + pt.k * site.fy + pt.l * site.fz);

      re += amp * Math.cos(phase);
      im += amp * Math.sin(phase);
    }

    const cos2t = Math.cos(2 * theta);
    const sinT = Math.sin(theta);
    const lorentz = (1 + cos2t * cos2t) / (sinT * sinT * Math.cos(theta));
    const intensity = (re * re + im * im) * lorentz;
    const twoTheta = 2 * theta * DEG;
    const key = Math.round(twoTheta / TWO_THETA_TOL);

    // The Miller-Bravais i index is exactly zero (not -0) when h == k == 0.
    const bIndex = -pt.h - pt.k;
    const hkl = hex ? [pt.h, pt.k, bIndex === 0 ? 0 : bIndex, pt.l] : [pt.h, pt.k, pt.l];

    const existing = peaks.get(key);

    if (existing) {
      existing.intensity += intensity;
      existing.hkls.push(hkl);
    } else {
      peaks.set(key, { intensity, hkls: [hkl], twoTheta, d: 1 / pt.g });
    }
  }

  let maxIntensity = 0;

  for (const peak of peaks.values()) {
    if (peak.intensity > maxIntensity) {
      maxIntensity = peak.intensity;
    }
  }

  const keys = [...peaks.keys()].sort((a, b) => a - b);

  const twoTheta: number[] = [];
  const intensities: number[] = [];
  const hkls: MillerFamily[][] = [];
  const dSpacings: number[] = [];

  for (const key of keys) {
    const peak = peaks.get(key) as Peak;

    if ((peak.intensity / maxIntensity) * 100 > SCALED_INTENSITY_TOL) {
      twoTheta.push(peak.twoTheta);
      intensities.push(peak.intensity);
      hkls.push(getUniqueFamilies(peak.hkls));
      dSpacings.push(peak.d);
    }
  }

  if (scaled && intensities.length > 0) {
    let max = 0;

    for (const v of intensities) {
      if (v > max) {
        max = v;
      }
    }

    for (let i = 0; i < intensities.length; i++) {
      intensities[i] = (intensities[i] / max) * 100;
    }
  }

  return { twoTheta, intensities, hkls, dSpacings };
}
