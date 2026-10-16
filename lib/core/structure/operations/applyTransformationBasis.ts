import { createLattice } from "@/core/lattice/lattice";
import { mul } from "@/core/matrix/operations/mul";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { vecMul } from "@/core/matrix/operations/vector/vecMul";
import type { Matrix } from "@/core/matrix/matrix";
import type { Site } from "@/core/site/site";
import type { Structure } from "../structure";

/** Apply a transformation basis matrix to a structure.
 *  The new lattice is P * oldBasis and fractional coordinates are P^{-T} * oldFrac,
 *  preserving Cartesian positions.
 * @param structure - The input structure.
 * @param basis - A 3x3 transformation matrix.
 * @returns A new Structure with transformed lattice and sites. */
export function applyTransformationBasis(
  structure: Structure,
  basis: Matrix,
): Structure {
  const invP = inverse3x3(basis);
  const newBasis = mul(basis, structure.lattice.basis);

  const sites: Site[] = structure.sites.map((site) => ({
    ...site,
    frac: vecMul(site.frac, invP),
  }));

  return {
    lattice: createLattice(newBasis),
    sites,
  };
}
