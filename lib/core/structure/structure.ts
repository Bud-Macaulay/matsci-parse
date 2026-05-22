import { Lattice } from "../lattice/lattice";
import { Site } from "../site/site";

/**
 * A crystal structure combining a lattice with atomic site positions.
 *
 * A structure represents the complete 3D arrangement of atoms in a crystal by specifying:
 * - The crystallographic lattice (basis vectors)
 * - The positions and species of atoms at sites within the unit cell
 *
 * @remarks
 * - Sites are typically expressed in fractional (crystal) coordinates
 * - The lattice and sites together fully define the crystal structure
 * - Used for all crystallographic computations and structure analysis
 *
 * @example
 * ```typescript
 * const structure: Structure = {
 *   lattice: cubic(4.05),
 *   sites: [
 *     { species: 'Al', frac: [0, 0, 0] as Vector },
 *     { species: 'Al', frac: [0.5, 0.5, 0.5] as Vector }
 *   ]
 * };
 * ```
 */
export interface Structure {
  readonly lattice: Lattice;
  readonly sites: Site[];
  readonly [key: string]: unknown;
}
