import { createLattice } from "@/core/lattice/lattice";
import { createMatrix } from "@/core/matrix/matrix";
import { cross } from "@/core/matrix/operations/vector/cross";
import { normalize } from "@/core/matrix/operations/vector/normalize";
import { norm } from "@/core/matrix/operations/vector/norm";
import { mul } from "@/core/matrix/operations/mul";
import { transpose } from "@/core/matrix/operations/transpose";
import type { Structure } from "../../structure";
import { EPSILON } from "@/core/math/constants";

/** Right-handed orthonormal frame with third axis `w` (unit). */
function frame(w: Float64Array): { e1: Float64Array; e2: Float64Array } {
  const ref =
    Math.abs(Math.abs(w[0]) - 1) < EPSILON
      ? new Float64Array([0, 1, 0])
      : new Float64Array([1, 0, 0]);
  const e1 = normalize(cross(w, ref));
  return { e1, e2: cross(w, e1) };
}

/**
 * Rigidly rotate the crystal so the c-axis aligns with the given Cartesian
 * direction. Fractional coordinates are unchanged; Cartesian positions rotate
 * with the lattice, so all distances and angles are preserved.
 *
 * @param structure - The input structure.
 * @param normal - A 3D Cartesian direction vector (need not be unit).
 * @returns A new Structure with rotated lattice and original sites.
 */
export function reorientToNormal(
  structure: Structure,
  normal: Float64Array | number[],
): Structure {
  const n = normalize(new Float64Array(normal));

  const b = structure.lattice.basis.data;
  const cVec = new Float64Array([b[6], b[7], b[8]]);
  if (norm(cVec) < EPSILON) {
    throw new Error("c-vector has zero length");
  }
  const chat = normalize(cVec);

  // Rotation Q = T·Sᵀ maps chat → n (both frames right-handed, so det Q = +1).
  const s = frame(chat);
  const t = frame(n);
  const S = createMatrix(3, 3, [
    s.e1[0], s.e2[0], chat[0],
    s.e1[1], s.e2[1], chat[1],
    s.e1[2], s.e2[2], chat[2],
  ]);
  const T = createMatrix(3, 3, [
    t.e1[0], t.e2[0], n[0],
    t.e1[1], t.e2[1], n[1],
    t.e1[2], t.e2[2], n[2],
  ]);
  const Q = mul(T, transpose(S));

  // Rotate each lattice vector: B_new = B·Qᵀ. New c = Q·c ∥ n, same length.
  const newBasis = mul(structure.lattice.basis, transpose(Q));

  return { lattice: createLattice(newBasis), sites: structure.sites };
}
