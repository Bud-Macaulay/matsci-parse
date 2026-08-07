/**
 * Compute the triangulated polyhedron of the first Brillouin zone from the
 * reciprocal lattice vectors, mirroring `seekpath.brillouinzone.BZ`.
 *
 * The output matches the `faces_data` consumed by the
 * `brillouinzone-visualizer` web widget:
 *   - `triangles_vertices`: all polyhedron vertices
 *   - `triangles`: index triples (fan-triangulated convex faces)
 *   - `faces`: the flat faces as lists of vertex coordinates
 */

import { Vector } from "@/core/matrix/vector";
import { dot, cross, norm } from "@/core/matrix/operations/vector";

/** Round a vector direction to a stable key so ±parallel G-vectors collide. */
function directionKey(v: Vector): string {
  const n = norm(v);
  const x = Math.round((v[0] / n) * 1e6);
  const y = Math.round((v[1] / n) * 1e6);
  const z = Math.round((v[2] / n) * 1e6);
  return `${x},${y},${z}`;
}

function vertexKey(v: Vector, eps = 1e-6): string {
  return `${Math.round(v[0] / eps)},${Math.round(v[1] / eps)},${Math.round(v[2] / eps)}`;
}

/**
 * Solve the 3x3 system A x = d via Cramer's rule. Returns null if singular.
 * Kept local: the lib `solve` throws on singular matrices, but the corner
 * search needs a null result for near-degenerate plane intersections.
 */
function solve3(A: Vector[], d: number[], tolerance: number): Vector | null {
  const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < tolerance) return null;

  const detX = d[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (d[1] * A[2][2] - A[1][2] * d[2]) +
    A[0][2] * (d[1] * A[2][1] - A[1][1] * d[2]);
  const detY = A[0][0] * (d[1] * A[2][2] - A[1][2] * d[2]) -
    d[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * d[2] - d[1] * A[2][0]);
  const detZ = A[0][0] * (A[1][1] * d[2] - d[1] * A[2][1]) -
    A[0][1] * (A[1][0] * d[2] - d[1] * A[2][0]) +
    d[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  return new Float64Array([detX / det, detY / det, detZ / det]);
}

export interface BZPolyhedron {
  triangles_vertices: number[][];
  triangles: number[][];
  faces: number[][][];
}

/**
 * Compute the first Brillouin zone polyhedron from the reciprocal lattice
 * vectors b1, b2, b3 (rows of the reciprocal lattice matrix).
 */
export function getBZPolyhedron(
  b1: number[],
  b2: number[],
  b3: number[],
  supercellSize = 3,
): BZPolyhedron {
  const r1 = new Float64Array(b1);
  const r2 = new Float64Array(b2);
  const r3 = new Float64Array(b3);

  // Reciprocal lattice points, keeping the shortest G-vector per direction
  const best: Map<string, { g: Vector; length2: number }> = new Map();
  for (let i = -supercellSize; i <= supercellSize; i++) {
    for (let j = -supercellSize; j <= supercellSize; j++) {
      for (let k = -supercellSize; k <= supercellSize; k++) {
        if (i === 0 && j === 0 && k === 0) continue;
        const g = new Float64Array([
          i * r1[0] + j * r2[0] + k * r3[0],
          i * r1[1] + j * r2[1] + k * r3[1],
          i * r1[2] + j * r2[2] + k * r3[2],
        ]);
        const key = directionKey(g);
        const length2 = dot(g, g);
        const existing = best.get(key);
        if (!existing || length2 < existing.length2) {
          best.set(key, { g, length2 });
        }
      }
    }
  }

  // Planes: perpendicular bisectors of the G-vectors (normals g, offset |g|^2/2).
  // The faces of the BZ are always among the nearest reciprocal lattice
  // directions, so restricting to the shortest ones is safe and fast.
  const MAX_PLANES = 40;
  const planes: { g: Vector; offset: number }[] = [...best.values()]
    .sort((a, b) => a.length2 - b.length2)
    .slice(0, MAX_PLANES)
    .map(({ g }) => ({ g, offset: dot(g, g) / 2 }));

  // Candidate BZ corners: intersections of three planes inside all planes
  const tolerance = 1e-10;
  const corners: Vector[] = [];
  const n = planes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const v = solve3(
          [planes[i].g, planes[j].g, planes[k].g],
          [planes[i].offset, planes[j].offset, planes[k].offset],
          tolerance,
        );
        if (!v) continue;
        let inside = true;
        for (const p of planes) {
          if (dot(p.g, v) > p.offset + tolerance) {
            inside = false;
            break;
          }
        }
        if (inside) corners.push(v);
      }
    }
  }

  // Deduplicate the corners
  const cornerMap: Map<string, Vector> = new Map();
  for (const v of corners) {
    const key = vertexKey(v);
    if (!cornerMap.has(key)) cornerMap.set(key, v);
  }
  const vertices = [...cornerMap.values()];

  // Group the corners that lie on each face plane; the face of the BZ is a
  // convex polygon of these coplanar vertices
  const faces: Vector[][] = [];
  const triangles: number[][] = [];
  const trianglesVertices: Vector[] = [];
  const vertexIndex: Map<string, number> = new Map();

  const addVertex = (v: Vector): number => {
    const key = vertexKey(v);
    let idx = vertexIndex.get(key);
    if (idx === undefined) {
      idx = trianglesVertices.length;
      vertexIndex.set(key, idx);
      trianglesVertices.push(v);
    }
    return idx;
  };

  for (const p of planes) {
    const on = vertices.filter(
      (v) => Math.abs(dot(p.g, v) - p.offset) < 1e-6,
    );
    if (on.length < 3) continue;

    // Sort the coplanar vertices angularly around the face centroid
    const centroid = [
      on.reduce((s, v) => s + v[0], 0) / on.length,
      on.reduce((s, v) => s + v[1], 0) / on.length,
      on.reduce((s, v) => s + v[2], 0) / on.length,
    ];
    const ref = Math.abs(p.g[0]) < 0.9 ? new Float64Array([1, 0, 0]) : new Float64Array([0, 1, 0]);
    let e1 = cross(p.g, ref);
    const e1Norm = norm(e1);
    e1 = new Float64Array([e1[0] / e1Norm, e1[1] / e1Norm, e1[2] / e1Norm]);
    const e2 = cross(p.g, e1);

    const ordered = [...on].sort((a, b) => {
      const da = new Float64Array([
        a[0] - centroid[0],
        a[1] - centroid[1],
        a[2] - centroid[2],
      ]);
      const db = new Float64Array([
        b[0] - centroid[0],
        b[1] - centroid[1],
        b[2] - centroid[2],
      ]);
      const angleA = Math.atan2(dot(da, e2), dot(da, e1));
      const angleB = Math.atan2(dot(db, e2), dot(db, e1));
      return angleA - angleB;
    });

    faces.push(ordered);

    // Fan triangulation of the face
    const first = addVertex(ordered[0]);
    for (let m = 1; m < ordered.length - 1; m++) {
      triangles.push([first, addVertex(ordered[m]), addVertex(ordered[m + 1])]);
    }
  }

  return {
    triangles_vertices: trianglesVertices.map((v) => Array.from(v)),
    triangles,
    faces: faces.map((face) => face.map((v) => Array.from(v))),
  };
}
