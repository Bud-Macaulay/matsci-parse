import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { Structure } from "@/core/structure/structure";
import { getSymmetry } from "./spglib";
import { lengths } from "@/core/lattice/lengths";
import { dot, mul } from "@/core/matrix/operations";

import { Matrix } from "@/core/matrix/matrix";

import { determinant } from "@/core/matrix/operations";
import { createMatrix } from "@/core/matrix/matrix";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { Vector } from "@/core/matrix/vector";

type KPoint = [number, number, number];

interface FacesData {
  readonly triangleVertices: number[][];
  readonly triangles: number[][];
  readonly faces: number[][][];
}

interface Plane {
  normal: Float64Array;
  offset: number;
}

interface BrillouinZoneData {
  readonly b1: number[];
  readonly b2: number[];
  readonly b3: number[];
  readonly hullVertices: Float64Array[];
  readonly facesData: FacesData;
  readonly kpoints: Record<string, KPoint>;
  readonly kpointsRel: Record<string, KPoint>;
  readonly path: string[][];
  readonly explicitKpointsRel: KPoint[];
  readonly explicitKpointsLinearcoord: number[];
  readonly explicitKpointsLabels: string[];
  readonly explicitKpointsAbs: KPoint[];
  readonly explicitSegments: number[][];
  readonly spgLibStructure: Structure;
}

function intersectPlanes(
  p1: Plane,
  p2: Plane,
  p3: Plane,
  tolerance = 1e-10,
): Float64Array | null {
  const A = createMatrix(3, 3, [...p1.normal, ...p2.normal, ...p3.normal]);

  const detA = determinant(A);

  if (Math.abs(detA) < tolerance) return null;

  const invA = inverse3x3(A);

  const d = createMatrix(3, 1, [p1.offset, p2.offset, p3.offset]);

  const res = mul(invA, d).data;

  return new Float64Array([res[0], res[1], res[2]]);
}

function key(v: Float64Array) {
  const nx = v[0],
    ny = v[1],
    nz = v[2];
  const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

  // normalize direction so ±G collapse
  const x = Math.round(nx * inv * 1e6);
  const y = Math.round(ny * inv * 1e6);
  const z = Math.round(nz * inv * 1e6);

  return `${x},${y},${z}`;
}

function vkey(v: Float64Array, eps = 1e-6) {
  return `${Math.round(v[0] / eps)},${Math.round(v[1] / eps)},${Math.round(v[2] / eps)}`;
}

function isInside(v: Float64Array, planes: Plane[]) {
  const tolerance = 0.0;
  for (const p of planes) {
    const d = p.normal[0] * v[0] + p.normal[1] * v[1] + p.normal[2] * v[2];

    if (d > p.offset + tolerance) return false;
  }
  return true;
}

export async function generateBZVertices(
  structure: Structure,
  tolerance: number = 1e-4,
): Promise<Float64Array[]> {
  const reciprocalLattice = reciprocalLatticeCrystallographic(
    structure.lattice,
  );

  const rcLD = reciprocalLattice.basis.data;

  const aStar = [rcLD[0], rcLD[1], rcLD[2]];
  const bStar = [rcLD[3], rcLD[4], rcLD[5]];
  const cStar = [rcLD[6], rcLD[7], rcLD[8]];

  const range = 2;
  const points: Vector[] = [];

  for (let h = -range; h <= range; h++) {
    for (let k = -range; k <= range; k++) {
      for (let l = -range; l <= range; l++) {
        const point = new Float64Array(3);

        point[0] = h * aStar[0] + k * bStar[0] + l * cStar[0];

        point[1] = h * aStar[1] + k * bStar[1] + l * cStar[1];

        point[2] = h * aStar[2] + k * bStar[2] + l * cStar[2];

        points.push(point);
      }
    }
  }

  // remove center point
  const neighbors = points.filter(
    (p) =>
      Math.abs(p[0]) > tolerance ||
      Math.abs(p[1]) > tolerance ||
      Math.abs(p[2]) > tolerance,
  );

  // sort by distance from origin
  neighbors.sort((a, b) => {
    const da = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];

    const db = b[0] * b[0] + b[1] * b[1] + b[2] * b[2];

    return da - db;
  });

  const map = new Map<string, Float64Array>();

  for (const p of neighbors) {
    const k = key(p);
    if (!map.has(k)) map.set(k, p);
  }

  const uniqueNeighbors = [...map.values()];

  console.log(uniqueNeighbors); // all neighbor recip points

  const planes = uniqueNeighbors.slice(0, 26).map((G) => ({
    normal: G,
    offset: dot(G, G) / 2,
  }));

  const candidateBZCorners: Float64Array[] = [];

  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      for (let k = j + 1; k < planes.length; k++) {
        const v = intersectPlanes(planes[i], planes[j], planes[k], tolerance);

        if (!v) continue;

        if (isInside(v, planes)) {
          candidateBZCorners.push(v);
        }
      }
    }
  }

  const vertexMap = new Map<string, Float64Array>();

  for (const v of candidateBZCorners) {
    const k = vkey(v);
    if (!vertexMap.has(k)) {
      vertexMap.set(k, v);
    }
  }

  const hullVertices = [...vertexMap.values()];

  return hullVertices;
}
