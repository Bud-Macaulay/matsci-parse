import { createLattice } from "@/core/lattice/lattice";
import type { Structure } from "../structure";
import type { Site } from "@/core/site/site";

type SupercellSize = number | [number, number, number];

/**
 * Creates a supercell by repeating the structure a specified number of times.
 *
 * Expands the unit cell along one or more directions, creating a larger supercell
 * with multiple copies of each atom. The fractional coordinates are updated accordingly.
 *
 * @param structure - The original structure
 * @param size - Number of repetitions: either a single number (uniform) or [nx, ny, nz]
 * @returns A new structure with the supercell and duplicated atoms
 * @throws Error if supercell dimensions are not positive integers
 *
 * @remarks
 * - Lattice basis vectors are scaled by the repetition factors
 * - Each atom is copied to all equivalent positions in the supercell
 * - Fractional coordinates are scaled accordingly (position / repetition)
 * - Useful for calculating properties that require larger cells
 * - Equivalent to a k-point mesh reduction in some contexts
 *
 * @example
 * ```typescript
 * const structure = {
 *   lattice: cubic(3.14),
 *   sites: [{ species: 'Fe', frac: [0, 0, 0] }]
 * };
 *
 * // Create 2×2×2 supercell (8 atoms total)
 * const super2x2x2 = supercell(structure, 2);
 *
 * // Create 2×3×2 supercell (asymmetric)
 * const superAsym = supercell(structure, [2, 3, 2]);
 * ```
 */
export function supercell(
  structure: Structure,
  size: SupercellSize,
): Structure {
  const [nx, ny, nz] = typeof size === "number" ? [size, size, size] : size;

  if (
    nx < 1 ||
    ny < 1 ||
    nz < 1 ||
    !Number.isInteger(nx) ||
    !Number.isInteger(ny) ||
    !Number.isInteger(nz)
  ) {
    throw new Error("Supercell dimensions must be positive integers");
  }

  const m = structure.lattice.basis.data;

  // row-major scaling
  const newBasis = [
    m[0] * nx,
    m[1] * nx,
    m[2] * nx,

    m[3] * ny,
    m[4] * ny,
    m[5] * ny,

    m[6] * nz,
    m[7] * nz,
    m[8] * nz,
  ];

  const sites: Site[] = [];

  for (const site of structure.sites) {
    const [x, y, z] = site.frac;

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          sites.push({
            species: site.species,

            frac: new Float64Array([(x + i) / nx, (y + j) / ny, (z + k) / nz]),
          });
        }
      }
    }
  }

  return {
    lattice: createLattice(newBasis),
    sites,
  };
}
