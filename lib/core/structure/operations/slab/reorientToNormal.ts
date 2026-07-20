import { createMatrix } from "@/core/matrix/matrix";
import { cross } from "@/core/matrix/operations/vector/cross";
import { normalize } from "@/core/matrix/operations/vector/normalize";
import { applyTransformationBasis } from "../applyTransformationBasis";
import type { Structure } from "../../structure";

const EPS = 1e-12;

/**
 * Reorient a structure so that the given Cartesian normal aligns with the z-axis.
 * Atom Cartesian positions are preserved exactly.
 * @param structure - The input structure.
 * @param normal - A 3D Cartesian direction vector (need not be unit).
 * @returns A new Structure with reoriented lattice and sites.
 */
export function reorientToNormal(
  structure: Structure,
  normal: Float64Array | number[],
): Structure {
  const n = normalize(new Float64Array(normal));

  let e1: Float64Array;
  const ref = new Float64Array([1, 0, 0]);

  if (Math.abs(Math.abs(n[0]) - 1) < EPS) {
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
