import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { calculateScaleFactor } from "./calculateScaleFactor";
import { makeSupercell } from "../makeSupercell";
import { supercell } from "../supercell";
import { addVacuum } from "./addVacuum";
import type { Structure } from "../../structure";

interface SlabOptions {
  /** Number of unit cell replications along c (surface normal). Default 1. */
  layers?: number;
  /** Vacuum thickness in Angstroms. Default 0. */
  vacuum?: number;
}

/**
 * Generate a slab oriented along the (hkl) plane, following pymatgen's algorithm.
 *
 * Steps:
 * 1. Calculate an integer scale factor U that puts in-plane vectors perpendicular
 *    to the surface normal, and a c-vector with max projection onto the normal.
 * 2. Apply make_supercell(U) to create an oriented unit cell (OUC).
 * 3. Replicate the OUC along c to get the desired number of layers.
 * 4. Add vacuum by stretching the c-vector.
 *
 * @param structure - The bulk input structure.
 * @param h - Miller index h.
 * @param k - Miller index k.
 * @param l - Miller index l.
 * @param opts - Slab options.
 * @returns A new Structure representing the slab.
 */
export function slabFromMillerIndex(
  structure: Structure,
  h: number,
  k: number,
  l: number,
  opts: SlabOptions = {},
): Structure {
  const { layers = 1, vacuum = 0 } = opts;

  // Step 1: Calculate the scale factor
  const U = calculateScaleFactor([h, k, l], structure.lattice);

  // Step 2: Create the oriented unit cell
  const ouc = makeSupercell(structure, U);

  // Step 3: Replicate along c
  const replicated = supercell(ouc, [1, 1, layers]);

  // Step 4: Add vacuum
  return addVacuum(replicated, vacuum);
}
