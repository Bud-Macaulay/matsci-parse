import { Structure } from "../../structure";

import { cross } from "../../../matrix/operations/vector/cross";
import { dot } from "../../../matrix/operations/vector/dot";
import { norm } from "../../../matrix/operations/vector/norm";

import { cartesian } from "../../../site/cartesian";

const RAD2DEG = 180 / Math.PI;

function vecSub(a: Float64Array, b: Float64Array): Float64Array {
  return new Float64Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

// TODO: its probably bad that this uses cartesian positions
// - it would likely be more consistent to use metric tensor to do this math
// I guess some investigation is worth considering

/** Dihedral angle (degrees) of the chain idx1-idx2-idx3-idx4 in Cartesian space. */
export function getDihedral(
  structure: Structure,
  idx1: number,
  idx2: number,
  idx3: number,
  idx4: number,
): number {
  const s1 = structure.sites[idx1];
  const s2 = structure.sites[idx2];
  const s3 = structure.sites[idx3];
  const s4 = structure.sites[idx4];

  // convert to Cartesian (fixes skewed lattice issue)
  const p1 = cartesian(structure.lattice, s1);
  const p2 = cartesian(structure.lattice, s2);
  const p3 = cartesian(structure.lattice, s3);
  const p4 = cartesian(structure.lattice, s4);

  const b1 = vecSub(p1, p2);
  const b2 = vecSub(p2, p3);
  const b3 = vecSub(p3, p4);

  const n1 = cross(b1, b2);
  const n2 = cross(b2, b3);

  const n1Norm = norm(n1);
  const n2Norm = norm(n2);
  const b2Norm = norm(b2);

  if (n1Norm < 1e-12 || n2Norm < 1e-12 || b2Norm < 1e-12) {
    return 0;
  }

  const m1 = cross(n1, b2);

  const x = dot(n1, n2);
  const y = dot(m1, n2) / b2Norm;

  return Math.atan2(y, x) * RAD2DEG;
}
