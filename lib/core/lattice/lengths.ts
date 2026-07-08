import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";
/** Compute the three lattice vector lengths (a, b, c). */
export function lengths(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a: Float64Array = new Float64Array([m[0], m[1], m[2]]);
  const b: Float64Array = new Float64Array([m[3], m[4], m[5]]);
  const c: Float64Array = new Float64Array([m[6], m[7], m[8]]);

  return [norm(a), norm(b), norm(c)];
}
