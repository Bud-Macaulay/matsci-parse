import { createLattice } from "@/core/lattice/lattice";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { cartesian } from "@/core/site/cartesian";
import { fractional } from "@/core/site/fractional";
import { latticePointsInSupercell } from "@/core/matrix/operations/latticePointsInSupercell";
import type { Matrix } from "@/core/matrix/matrix";
import type { Structure } from "../structure";
import type { Site } from "@/core/site/site";

type SupercellSize = number | [number, number, number] | Matrix;

function isMatrix(size: SupercellSize): size is Matrix {
  return typeof size !== "number" && !Array.isArray(size);
}

/** Create a supercell by applying an integer transformation matrix U.
 *
 * If `size` is a number or [nx, ny, nz], a diagonal supercell is formed by
 * replicating the structure in each lattice direction.
 *
 * If `size` is a 3x3 integer Matrix, the general supercell algorithm from
 * pymatgen's `Structure.__mul__` (make_supercell) is used: the new basis
 * is U @ oldBasis and lattice points are replicated by |det(U)|.
 *
 * @param structure - The input structure.
 * @param size - Supercell size: number (isotropic), [nx, ny, nz], or 3x3 integer matrix.
 * @returns A new Structure with the supercell applied.
 */
export function supercell(structure: Structure, size: SupercellSize): Structure {
  let U: Matrix;

  if (isMatrix(size)) {
    U = size;
  } else {
    const [nx, ny, nz] = typeof size === "number" ? [size, size, size] : size;
    U = createMatrix(3, 3, [nx, 0, 0, 0, ny, 0, 0, 0, nz]);
  }

  const newBasis = mul(U, structure.lattice.basis);
  const newLattice = createLattice(newBasis);

  const fracPoints = latticePointsInSupercell(U);

  const sites: Site[] = [];

  for (const site of structure.sites) {
    const siteCart = cartesian(structure.lattice, site);

    for (const lp of fracPoints) {
      // Lattice point in Cartesian (using new lattice)
      const lpCart = cartesian(newLattice, {
        species: site.species,
        frac: lp,
      });

      const pos = new Float64Array([
        siteCart[0] + lpCart[0],
        siteCart[1] + lpCart[1],
        siteCart[2] + lpCart[2],
      ]);

      const frac = fractional(newLattice, pos);

      // Wrap to [0, 1)
      for (let d = 0; d < 3; d++) {
        frac[d] = frac[d] - Math.floor(frac[d]);
        if (frac[d] > 1 - 1e-10) frac[d] = 0;
        if (frac[d] < 1e-10) frac[d] = 0;
      }

      sites.push({
        species: site.species,
        frac,
      });
    }
  }

  return {
    lattice: newLattice,
    sites,
  };
}
