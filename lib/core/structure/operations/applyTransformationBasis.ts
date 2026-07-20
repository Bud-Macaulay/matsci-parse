import { createLattice } from "@/core/lattice/lattice";
import { mul } from "@/core/matrix/operations/mul";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import type { Matrix } from "@/core/matrix/matrix";
import type { Site } from "@/core/site/site";
import type { Structure } from "../structure";

/** Apply a transformation basis matrix to a structure.
 *  The new lattice is P * oldBasis and fractional coordinates are inv(P) * oldFrac.
 * @param structure - The input structure.
 * @param basis - A 3x3 transformation matrix.
 * @returns A new Structure with transformed lattice and sites. */
export function applyTransformationBasis(
  structure: Structure,
  basis: Matrix,
): Structure {
  const invP = inverse3x3(basis);
  const newBasis = mul(basis, structure.lattice.basis);

  const sites: Site[] = structure.sites.map((site) => {
    const f = site.frac;
    const vec = {
      rows: 3,
      cols: 1,
      data: new Float64Array([f[0], f[1], f[2]]),
    };
    const result = mul(invP, vec);

    return {
      ...site,
      frac: new Float64Array([result.data[0], result.data[1], result.data[2]]),
    };
  });

  return {
    lattice: createLattice(newBasis),
    sites,
  };
}
