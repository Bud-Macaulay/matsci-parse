import { createLattice } from "@/core/lattice/lattice";
import { mul } from "@/core/matrix/operations/mul";
import { determinant } from "@/core/matrix/operations/determinant";
import { latticePointsInSupercell } from "@/core/matrix/operations/latticePointsInSupercell";
import type { Matrix } from "@/core/matrix/matrix";
import type { Structure } from "../../structure";
import type { Site } from "@/core/site/site";

/**
 * Create a supercell by applying a general integer transformation matrix U.
 *
 * The new lattice basis is U @ oldBasis.  For each original site, we place
 * copies at Cartesian positions site.cart + latticePoint for every lattice
 * point that lies inside the supercell.  This is the same algorithm as
 * pymatgen's `Structure.__mul__` (make_supercell).
 *
 * @param structure - The input structure.
 * @param U - A 3×3 integer transformation matrix.
 * @returns A new Structure with |det(U)| times more sites.
 */
export function makeSupercell(structure: Structure, U: Matrix): Structure {
  const absDet = Math.abs(Math.round(determinant(U)));
  if (absDet < 0.5) {
    throw new Error("Singular transformation matrix");
  }

  const newBasis = mul(U, structure.lattice.basis);
  const newLattice = createLattice(newBasis);

  // Get all lattice point translations (fractional coords in original cell)
  const fracPoints = latticePointsInSupercell(U);

  // Convert lattice points to Cartesian using the NEW lattice basis
  // (same as pymatgen: new_lattice.get_cartesian_coords(frac_lattice))
  const sites: Site[] = [];
  const nb = newBasis.data;

  for (const site of structure.sites) {
    // Compute site's Cartesian coordinates using the ORIGINAL lattice
    const origB = structure.lattice.basis.data;
    const f = site.frac;
    const siteCart = new Float64Array([
      origB[0] * f[0] + origB[3] * f[1] + origB[6] * f[2],
      origB[1] * f[0] + origB[4] * f[1] + origB[7] * f[2],
      origB[2] * f[0] + origB[5] * f[1] + origB[8] * f[2],
    ]);

    for (const lp of fracPoints) {
      // Lattice point in Cartesian (using new lattice)
      const lpCart = new Float64Array([
        nb[0] * lp[0] + nb[3] * lp[1] + nb[6] * lp[2],
        nb[1] * lp[0] + nb[4] * lp[1] + nb[7] * lp[2],
        nb[2] * lp[0] + nb[5] * lp[1] + nb[8] * lp[2],
      ]);

      // Position = siteCart + lpCart, then convert back to fractional in new cell
      const pos = new Float64Array([
        siteCart[0] + lpCart[0],
        siteCart[1] + lpCart[1],
        siteCart[2] + lpCart[2],
      ]);

      // Convert to fractional in the new lattice: frac = inv(B'^T) @ pos
      // B' is row-vector basis, so cart = B'^T @ frac → frac = B'^{-T} @ cart
      const invDet =
        nb[0] * (nb[4] * nb[8] - nb[5] * nb[7]) -
        nb[3] * (nb[1] * nb[8] - nb[2] * nb[7]) +
        nb[6] * (nb[1] * nb[5] - nb[2] * nb[4]);

      const invNb = new Float64Array(9);
      invNb[0] = (nb[4] * nb[8] - nb[5] * nb[7]) / invDet;
      invNb[1] = (nb[2] * nb[7] - nb[1] * nb[8]) / invDet;
      invNb[2] = (nb[1] * nb[5] - nb[2] * nb[4]) / invDet;
      invNb[3] = (nb[5] * nb[6] - nb[3] * nb[8]) / invDet;
      invNb[4] = (nb[0] * nb[8] - nb[2] * nb[6]) / invDet;
      invNb[5] = (nb[2] * nb[3] - nb[0] * nb[5]) / invDet;
      invNb[6] = (nb[3] * nb[7] - nb[4] * nb[6]) / invDet;
      invNb[7] = (nb[1] * nb[6] - nb[0] * nb[7]) / invDet;
      invNb[8] = (nb[0] * nb[4] - nb[1] * nb[3]) / invDet;

      // B'^{-T} = transpose of B'^{-1}
      // frac[i] = sum_j invNb[j*3+i] * pos[j]  (column-major access = transpose)
      const frac = new Float64Array([
        invNb[0] * pos[0] + invNb[3] * pos[1] + invNb[6] * pos[2],
        invNb[1] * pos[0] + invNb[4] * pos[1] + invNb[7] * pos[2],
        invNb[2] * pos[0] + invNb[5] * pos[1] + invNb[8] * pos[2],
      ]);

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
