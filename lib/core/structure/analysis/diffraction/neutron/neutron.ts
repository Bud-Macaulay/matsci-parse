import { reciprocalLatticeCrystallographic } from "../../../../lattice/reciprocalLatticeCrystallographic";
import { isHexagonal } from "../../../../lattice/properties/isHexagonal";
import { Structure } from "../../../structure";
import { NEUTRON_SCATTERING_LENGTHS } from "../../../../data/scattering/neutronScattering";
import { MillerFamily, getUniqueFamilies } from "../uniqueFamilies";
import { pointsInSphere, twoThetaRangeToRadii } from "../reciprocalPoints";
import { SCALED_INTENSITY_TOL, TWO_THETA_TOL } from "../constants";

/** Options for {@link calculateNdPattern}. */
export interface NdOptions {
  /** Neutron wavelength in angstroms. Defaults to 1.54184. */
  wavelength?: number;
  /** Two-theta range in degrees. Defaults to [0, 90]. Null uses the full limiting sphere. */
  twoThetaRange?: readonly [number, number] | null;
  /** Scale the maximum peak to 100. Defaults to true. */
  scaled?: boolean;
  /** Debye-Waller factors keyed by element symbol. Defaults to {}. */
  debyeWallerFactors?: Readonly<Record<string, number>>;
}

/** A calculated powder neutron diffraction pattern. */
export interface NdPattern {
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
  length: number;
  occu: number;
  dw: number;
  fx: number;
  fy: number;
  fz: number;
}

function expandSites(structure: Structure, debyeWallerFactors: Readonly<Record<string, number>>): ExpandedSite[] {
  return structure.sites.map((site) => {
    const symbol = site.species.symbol;
    const length = NEUTRON_SCATTERING_LENGTHS[symbol];

    if (length === undefined) {
      throw new Error(
        `Unable to calculate ND pattern as there is no scattering coefficients for ${symbol}.`,
      );
    }

    const occu = site.species.properties?.occu;

    return {
      length,
      occu: typeof occu === "number" ? occu : 1,
      dw: debyeWallerFactors[symbol] ?? 0,
      fx: site.frac[0],
      fy: site.frac[1],
      fz: site.frac[2],
    };
  });
}

/** Compute the powder neutron diffraction pattern of a crystal structure.
 *
 * Ports pymatgen's NDCalculator (De Graef & McHenry, ch. 13): the same
 * limiting-sphere Bragg formalism as XRD, but with constant coherent
 * scattering lengths instead of s-dependent X-ray factors and without the
 * polarization term of the Lorentz correction. Peak merging uses pymatgen's
 * sequential within-tolerance search. Symmetry refinement (pymatgen's
 * symprec) is not applied; pass a refined structure if needed.
 *
 * @param structure - Crystal structure with lattice basis rows in angstroms.
 * @param options - Wavelength, range, scaling, Debye-Waller factors.
 * @returns Two-theta positions, intensities, Miller families, d-spacings. */
export function calculateNdPattern(structure: Structure, options?: NdOptions): NdPattern {
  const wavelength = options?.wavelength ?? 1.54184;
  const range = options?.twoThetaRange === undefined ? ([0, 90] as const) : options.twoThetaRange;
  const scaled = options?.scaled ?? true;
  const debyeWallerFactors = options?.debyeWallerFactors ?? {};

  const DEG = 180 / Math.PI;

  const [minR, maxR] = twoThetaRangeToRadii(range, wavelength);

  const sites = expandSites(structure, debyeWallerFactors);
  const hex = isHexagonal(structure.lattice);
  const recip = reciprocalLatticeCrystallographic(structure.lattice);
  const points = pointsInSphere(structure.lattice, recip, maxR, minR);

  interface Peak {
    intensity: number;
    hkls: number[][];
    d: number;
  }

  // Sequential merge: each point joins the first peak within TWO_THETA_TOL.
  const keys: number[] = [];
  const peaks = new Map<number, Peak>();

  for (const pt of points) {
    const h = Math.round(pt.h);
    const k = Math.round(pt.k);
    const l = Math.round(pt.l);

    const theta = Math.asin((wavelength * pt.g) / 2);
    const s = pt.g / 2;

    let re = 0;
    let im = 0;

    for (const site of sites) {
      const amp = site.length * site.occu * Math.exp(-site.dw * s * s);
      const phase = 2 * Math.PI * (h * site.fx + k * site.fy + l * site.fz);

      re += amp * Math.cos(phase);
      im += amp * Math.sin(phase);
    }

    const sinT = Math.sin(theta);
    const lorentz = 1 / (sinT * sinT * Math.cos(theta));
    const intensity = (re * re + im * im) * lorentz;
    const twoTheta = 2 * theta * DEG;

    // The Miller-Bravais i index is exactly zero (not -0) when h == k == 0.
    const bIndex = -h - k;
    const hkl = hex ? [h, k, bIndex === 0 ? 0 : bIndex, l] : [h, k, l];

    let found: number | null = null;

    for (const key of keys) {
      if (Math.abs(key - twoTheta) < TWO_THETA_TOL) {
        found = key;
        break;
      }
    }

    if (found === null) {
      keys.push(twoTheta);
      peaks.set(twoTheta, { intensity, hkls: [hkl], d: 1 / pt.g });
    } else {
      const peak = peaks.get(found) as Peak;
      peak.intensity += intensity;
      peak.hkls.push(hkl);
    }
  }

  let maxIntensity = 0;

  for (const peak of peaks.values()) {
    if (peak.intensity > maxIntensity) {
      maxIntensity = peak.intensity;
    }
  }

  const sortedKeys = [...keys].sort((a, b) => a - b);

  const twoTheta: number[] = [];
  const intensities: number[] = [];
  const hkls: MillerFamily[][] = [];
  const dSpacings: number[] = [];

  for (const key of sortedKeys) {
    const peak = peaks.get(key) as Peak;

    if ((peak.intensity / maxIntensity) * 100 > SCALED_INTENSITY_TOL) {
      twoTheta.push(key);
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
