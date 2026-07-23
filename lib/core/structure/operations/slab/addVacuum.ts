import { createMatrix } from "@/core/matrix/matrix";
import { norm } from "@/core/matrix/operations/vector/norm";
import { applyTransformationBasis } from "../applyTransformationBasis";
import type { Structure } from "../../structure";
import { EPSILON } from "@/core/math/constants";

/**
 * Add vacuum along the c-axis by stretching the c-vector.
 * Atom Cartesian positions are preserved exactly.
 * @param structure - The input structure (should already be reoriented with surface normal along c).
 * @param thickness - Vacuum thickness in the same length units as the lattice.
 * @returns A new Structure with extended c-vector.
 */
export function addVacuum(structure: Structure, thickness: number): Structure {
  if (thickness <= 0) return structure;

  const b = structure.lattice.basis.data;
  const cVec = new Float64Array([b[6], b[7], b[8]]);
  const cLength = norm(cVec);

  if (cLength < EPSILON) {
    throw new Error("c-vector has zero length");
  }

  const scale = (cLength + thickness) / cLength;
  const P = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, scale]);

  return applyTransformationBasis(structure, P);
}
