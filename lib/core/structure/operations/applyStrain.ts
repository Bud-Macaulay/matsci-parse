import { createLattice, type Lattice } from "../../lattice/lattice";
import { identity, type Matrix } from "../../matrix/matrix";
import { add } from "../../matrix/operations/add";
import { determinant } from "../../matrix/operations/determinant";
import { mul } from "../../matrix/operations/mul";
import { transpose } from "../../matrix/operations/transpose";

/**
 * Deform a structure by a strain tensor ε (3x3, Cartesian): each lattice
 * vector v becomes (I + ε) v, so the basis (rows) becomes B (I + ε)ᵀ.
 * Fractional coordinates are unchanged, so atoms move with the cell.
 *
 * Works for ordered and disordered structures alike (only the lattice
 * changes). For a uniform strain s pass s * I.
 *
 * @param structure - The structure to deform.
 * @param strain - Strain tensor ε as a 3x3 matrix (dimensionless).
 * @returns A new structure with the strained lattice.
 * @throws If ε is not a finite 3x3 matrix, or det(I + ε) <= 0 (the cell
 *   would collapse or invert).
 */
export function applyStrain<T extends { lattice: Lattice }>(
  structure: T,
  strain: Matrix,
): T {
  if (strain.rows !== 3 || strain.cols !== 3) {
    throw new Error("applyStrain: strain must be a 3x3 matrix");
  }
  if (!Array.from(strain.data).every(Number.isFinite)) {
    throw new Error("applyStrain: strain must be finite");
  }
  const deformation = add(identity(3), strain);
  if (determinant(deformation) <= 0) {
    throw new Error(
      "applyStrain: det(I + strain) must be positive (the cell would collapse or invert)",
    );
  }
  return {
    ...structure,
    lattice: createLattice(
      mul(structure.lattice.basis, transpose(deformation)),
    ),
  };
}
