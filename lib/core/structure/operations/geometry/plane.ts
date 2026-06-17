import { Structure } from "../../structure";
import { getDisplacement } from "../distance/getDisplacement";
import { cross } from "../../../matrix/operations/vector/cross";
import { norm } from "../../../matrix/operations/vector/norm";
import { cartesian } from "../../../site/cartesian";

export function planeFromSites(
  structure: Structure,
  i: number,
  j: number,
  k: number,
) {
  // Cartesian displacement vectors
  const r1 = getDisplacement(structure, i, j);
  const r2 = getDisplacement(structure, i, k);

  const n = cross(r1, r2);
  const nNorm = norm(n);

  if (nNorm < 1e-12) {
    return {
      normal: new Float64Array([0, 0, 0]),
      point: structure.sites[i].frac, // fallback in fractional space
    };
  }

  const normal = new Float64Array([n[0] / nNorm, n[1] / nNorm, n[2] / nNorm]);

  // pick a real point on plane (site i), convert properly
  const point = cartesian(structure.lattice, structure.sites[i]);

  return { normal, point };
}

export function planeEquation(plane: {
  normal: Float64Array;
  point: Float64Array;
}) {
  const { normal, point } = plane;

  const d = -(
    normal[0] * point[0] +
    normal[1] * point[1] +
    normal[2] * point[2]
  );

  return {
    a: normal[0],
    b: normal[1],
    c: normal[2],
    d,
  };
}
