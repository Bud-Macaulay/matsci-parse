import { Structure } from "../../structure";
import { getDisplacement } from "../distance/getDisplacement";
import { cross } from "../../../matrix/operations/vector/cross";
import { norm } from "../../../matrix/operations/vector/norm";
import { cartesian } from "../../../site/cartesian";

import { reciprocalLattice } from "@/main";

/** A plane defined by a unit normal and a point on the plane (Cartesian). */
export interface Plane {
  readonly normal: Float64Array;
  readonly point: Float64Array;
}

/** Plane equation in the form ax + by + cz + d = 0. */
export interface PlaneEquation {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** Plane through three non-collinear sites. */
export function planeFromSites(
  structure: Structure,
  i: number,
  j: number,
  k: number,
): Plane {
  // Cartesian displacement vectors
  const r1 = getDisplacement(structure, i, j);
  const r2 = getDisplacement(structure, i, k);

  const n = cross(r1, r2);
  const nNorm = norm(n);

  if (nNorm < 1e-12) {
    throw new Error("Cannot construct plane from collinear sites");
  }

  const normal = new Float64Array([n[0] / nNorm, n[1] / nNorm, n[2] / nNorm]);

  // pick a real point on plane (site i), convert properly
  const point = cartesian(structure.lattice, structure.sites[i]);

  return { normal, point };
}

/** Convert a Plane to PlaneEquation coefficients (ax + by + cz + d = 0). */
export function planeEquation(plane: Plane): PlaneEquation {
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

/** Signed distance from a Cartesian point to a plane. */
export function distanceFromPlane(
  point: Float64Array,
  plane: PlaneEquation,
): number {
  const { a, b, c, d } = plane;

  const denominator = Math.sqrt(a * a + b * b + c * c);

  if (denominator < 1e-12) {
    throw new Error("Invalid plane normal");
  }

  return (a * point[0] + b * point[1] + c * point[2] + d) / denominator;
}

/** Signed distance from a site to a plane. */
export function distanceFromSiteToPlane(
  structure: Structure,
  siteIndex: number,
  plane: PlaneEquation,
): number {
  const point = cartesian(structure.lattice, structure.sites[siteIndex]);

  return distanceFromPlane(point, plane);
}

/** Plane from Miller indices (hkl) using the reciprocal lattice. */
export function planeFromMillerIndex(
  structure: Structure,
  h: number,
  k: number,
  l: number,
): Plane {
  const reciprocal = reciprocalLattice(structure.lattice);

  const normal = new Float64Array([
    h * reciprocal.basis.data[0] +
      k * reciprocal.basis.data[3] +
      l * reciprocal.basis.data[6],

    h * reciprocal.basis.data[1] +
      k * reciprocal.basis.data[4] +
      l * reciprocal.basis.data[7],

    h * reciprocal.basis.data[2] +
      k * reciprocal.basis.data[5] +
      l * reciprocal.basis.data[8],
  ]);

  const length = norm(normal);

  if (length < 1e-12) {
    throw new Error("Invalid Miller index");
  }

  return {
    normal: new Float64Array([
      normal[0] / length,
      normal[1] / length,
      normal[2] / length,
    ]),
    point: new Float64Array([0, 0, 0]),
  };
}
