import { planeFromSites } from "../geometry/plane";
import { canonicalize } from "../canonicalize";
import { supercell } from "../supercell";
import { reorientToNormal } from "./reorientToNormal";
import { addVacuum } from "./addVacuum";
import type { Structure } from "../../structure";

interface SlabOptions {
  /** Number of unit cell replications along c (surface normal). Default 1. */
  layers?: number;
  /** Vacuum thickness in lattice length units. Default 0. */
  vacuum?: number;
}

/**
 * Generate a slab oriented so the plane through three sites is the surface.
 *
 * Steps: plane normal → rotation → replicate → add vacuum.
 * Atom Cartesian positions within the slab are preserved exactly.
 *
 * @param structure - The bulk input structure.
 * @param i - Index of first site defining the surface plane.
 * @param j - Index of second site defining the surface plane.
 * @param k - Index of third site defining the surface plane.
 * @param opts - Slab options.
 * @returns A new Structure representing the slab.
 */
export function slabFromSites(
  structure: Structure,
  i: number,
  j: number,
  k: number,
  opts: SlabOptions = {},
): Structure {
  const { layers = 1, vacuum = 0 } = opts;

  const plane = planeFromSites(structure, i, j, k);
  const reoriented = canonicalize(reorientToNormal(structure, plane.normal));
  const replicated = supercell(reoriented, [1, 1, layers]);

  return addVacuum(replicated, vacuum);
}
