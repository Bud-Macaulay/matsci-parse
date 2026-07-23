import { createMatrix } from "@/core/matrix/matrix";
import { cross } from "@/core/matrix/operations/vector/cross";
import { normalize } from "@/core/matrix/operations/vector/normalize";
import { applyTransformationBasis } from "../applyTransformationBasis";
import type { Structure } from "../../structure";
import { EPSILON } from "@/core/math/constants";

/**
 * Rotate the lattice so that the given Cartesian direction maps to the new c-axis
 * (third lattice vector).  Atom Cartesian positions are preserved exactly.
 *
 * NOTE: this only guarantees the new c-axis aligns with `normal` when the original
 * third lattice vector is parallel to `normal`.  For slab construction, the caller
 * must first apply `calculateScaleFactor` + `supercell` to orient the cell.
 *
 * @param structure - The input structure.
 * @param normal - A 3D Cartesian direction vector (need not be unit).
 * @returns A new Structure with rotated lattice and sites.
 */
export function reorientToNormal(
  structure: Structure,
  normal: Float64Array | number[],
): Structure {
  const n = normalize(new Float64Array(normal));

  let e1: Float64Array;
  const ref = new Float64Array([1, 0, 0]);

  if (Math.abs(Math.abs(n[0]) - 1) < EPSILON) {
    e1 = normalize(cross(n, new Float64Array([0, 1, 0])));
  } else {
    e1 = normalize(cross(n, ref));
  }

  const e2 = cross(n, e1);

  const R = createMatrix(3, 3, [
    e1[0], e2[0], n[0],
    e1[1], e2[1], n[1],
    e1[2], e2[2], n[2],
  ]);

  return applyTransformationBasis(structure, R);
}
