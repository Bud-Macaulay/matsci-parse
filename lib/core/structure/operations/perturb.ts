import type { Lattice } from "../../lattice/lattice";
import { createMatrix } from "../../matrix/matrix";
import { inverse3x3 } from "../../matrix/operations/inverse/inverse3x3";
import { mul } from "../../matrix/operations/mul";
import type { Vec3 } from "../../site/site";

export interface PerturbOptions {
  /**
   * Smallest displacement in angstrom. When set, each site moves by a
   * random distance in [minDistance, distance]; otherwise exactly `distance`.
   */
  minDistance?: number;
  /** Uniform random numbers in [0, 1). Default Math.random; pass a seeded
   * generator for reproducible perturbations. */
  rng?: () => number;
}

/**
 * Randomly displace every site: a random direction (uniform on the sphere)
 * and a Cartesian distance of `distance` angstrom, or a random distance in
 * [minDistance, distance]. Positions are not wrapped back into the cell.
 *
 * Works for ordered and disordered structures alike.
 *
 * @param structure - The structure to perturb.
 * @param distance - Displacement in angstrom (the maximum if minDistance is set).
 * @param opts - Minimum distance and random number source.
 * @returns A new structure with displaced sites.
 */
export function perturb<
  T extends { lattice: Lattice; sites: readonly { frac: Vec3 }[] },
>(structure: T, distance: number, opts: PerturbOptions = {}): T {
  const { minDistance, rng = Math.random } = opts;
  if (!(distance >= 0 && Number.isFinite(distance))) {
    throw new Error("perturb: distance must be a finite number >= 0");
  }
  if (
    minDistance !== undefined &&
    !(minDistance >= 0 && minDistance <= distance)
  ) {
    throw new Error("perturb: minDistance must be in [0, distance]");
  }

  // Cartesian displacements, one row per site.
  const n = structure.sites.length;
  const disp = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const z = 2 * rng() - 1;
    const phi = 2 * Math.PI * rng();
    const r = Math.sqrt(1 - z * z);
    const length =
      minDistance === undefined
        ? distance
        : minDistance + (distance - minDistance) * rng();
    disp.set(
      [r * Math.cos(phi) * length, r * Math.sin(phi) * length, z * length],
      3 * i,
    );
  }

  // Rows r = f·B, so a Cartesian step dr is df = dr·B⁻¹.
  const df = mul(
    createMatrix(n, 3, disp),
    inverse3x3(structure.lattice.basis),
  ).data;
  return {
    ...structure,
    sites: structure.sites.map((site, i) => ({
      ...site,
      frac: new Float64Array([
        site.frac[0] + df[3 * i]!,
        site.frac[1] + df[3 * i + 1]!,
        site.frac[2] + df[3 * i + 2]!,
      ]),
    })),
  };
}
