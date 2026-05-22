import { Structure } from "../../structure/structure";

const EPS = 1e-12;

function wrap(x: number): number {
  const v = x - Math.floor(x);
  return Math.abs(v) < EPS ? 0 : v;
}

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

/**
 * Canonicalizes a structure by wrapping fractional coordinates to [0, 1).
 *
 * Ensures all atomic site coordinates are in canonical form:
 * - Fractional coordinates are wrapped to the range [0, 1)
 * - Values near machine epsilon (< 1e-12) are cleaned to 0
 * - Lattice is unchanged
 *
 * @param structure - The structure to canonicalize
 * @returns A new structure with canonicalized site coordinates
 *
 * @remarks
 * - This operation is idempotent (applying it twice gives the same result)
 * - Used for structure comparison and normalization
 * - Preserves the physical structure (atoms in equivalent positions)
 * - Does not alter the lattice
 *
 * @example
 * ```typescript
 * const structure = {
 *   lattice: cubic(4),
 *   sites: [
 *     { species: 'Fe', frac: [1.3, -0.2, 0.5] }
 *   ]
 * };
 * const canon = canonicalize(structure);
 * // frac becomes [0.3, 0.8, 0.5]
 * ```
 */
export function canonicalize(structure: Structure): Structure {
  return {
    ...structure,
    sites: structure.sites.map((site) => ({
      ...site,
      frac: new Float64Array([
        wrap(clean(site.frac[0])),
        wrap(clean(site.frac[1])),
        wrap(clean(site.frac[2])),
      ]),
    })),
  };
}
