import { Voro3D } from "voro3d";
import { CartesianCoords } from "../../io/common";
import { getReciprocalLattice } from "../../main";

/**
 * Represents a vertex in the Voronoi cell
 */
export interface VoronoiVertex {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a face in the Voronoi cell
 */
export interface VoronoiFace {
  /** Indices of vertices that make up this face */
  vertexIndices: number[];
  /** IDs of neighboring Voronoi cells */
  neighbors: number[];
}

/**
 * Represents a Voronoi cell (our Wigner-Seitz cell)
 */
export interface VoronoiCell {
  /** ID of the particle this cell belongs to */
  id: number;
  /** Coordinates of the particle */
  particle: { x: number; y: number; z: number };
  /** List of vertices in this cell */
  vertices: VoronoiVertex[];
  /** List of faces with their vertex indices and neighbors */
  faces: VoronoiFace[];
}

/**
 * Generates reciprocal lattice points around the origin.
 *
 * @param reciprocalLattice - The reciprocal lattice vectors
 * @param range - Range of indices to generate (default: 2)
 * @returns Flattened array of points [x1,y1,z1, x2,y2,z2, ...]
 */
function generateReciprocalLatticePoints(
  reciprocalLattice: CartesianCoords[],
  range: number = 3,
): number[] {
  const [aStar, bStar, cStar] = reciprocalLattice;
  const points: number[] = [];

  let originIndex = -1;
  let index = 0;

  // Generate all combinations including the origin
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      for (let k = -range; k <= range; k++) {
        // Calculate G = i*a* + j*b* + k*c*
        const x = i * aStar[0] + j * bStar[0] + k * cStar[0];
        const y = i * aStar[1] + j * bStar[1] + k * cStar[1];
        const z = i * aStar[2] + j * bStar[2] + k * cStar[2];

        if (i === 0 && j === 0 && k === 0) {
          originIndex = index;
        }

        points.push(x, y, z);
        index++;
      }
    }
  }

  return { points, originIndex };
}

/**
 * Finds the bounding box that contains all generated points.
 */
function findBoundingBox(points: number[]): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
} {
  let xMin = Infinity,
    xMax = -Infinity;
  let yMin = Infinity,
    yMax = -Infinity;
  let zMin = Infinity,
    zMax = -Infinity;

  for (let i = 0; i < points.length; i += 3) {
    xMin = Math.min(xMin, points[i]);
    xMax = Math.max(xMax, points[i]);
    yMin = Math.min(yMin, points[i + 1]);
    yMax = Math.max(yMax, points[i + 1]);
    zMin = Math.min(zMin, points[i + 2]);
    zMax = Math.max(zMax, points[i + 2]);
  }

  // Add 20% margin to ensure we capture the full Voronoi cell
  const marginX = (xMax - xMin) * 0.2;
  const marginY = (yMax - yMin) * 0.2;
  const marginZ = (zMax - zMin) * 0.2;

  return {
    xMin: xMin - marginX,
    xMax: xMax + marginX,
    yMin: yMin - marginY,
    yMax: yMax + marginY,
    zMin: zMin - marginZ,
    zMax: zMax + marginZ,
  };
}

/**
 * Computes the Brillouin zone (Wigner-Seitz cell) using Voronoi tessellation.
 *
 * @param crystal - CrystalStructure instance
 * @returns The Voronoi cell containing the origin (the Brillouin zone)
 */
export async function computeBrillouinZone(crystal: any) {
  const reciprocalLattice = getReciprocalLattice(crystal.lattice);

  const { points, originIndex } = generateReciprocalLatticePoints(
    reciprocalLattice,
    3,
  );

  const bounds = findBoundingBox(points);

  const container = await Voro3D.create(
    bounds.xMin,
    bounds.xMax,
    bounds.yMin,
    bounds.yMax,
    bounds.zMin,
    bounds.zMax,
    4,
    4,
    4,
  );

  const cells = container.computeCells(points, true);

  const cell = cells.find((c) => c.particleID === originIndex);

  if (!cell) {
    throw new Error("Could not find central Voronoi cell");
  }

  // -----------------------------
  // SeekPath-style transformation
  // -----------------------------

  const tri_verts: number[][] = [];

  for (let i = 0; i < cell.vertices.length; i += 3) {
    tri_verts.push([
      cell.vertices[i],
      cell.vertices[i + 1],
      cell.vertices[i + 2],
    ]);
  }
  const tris: number[][] = [];
  const faces: number[][][] = [];

  for (const face of cell.faces) {
    const faceVerts = face.map((idx: number) => tri_verts[idx]);

    faces.push(faceVerts);

    // triangulate polygon face (fan method)
    for (let i = 1; i < face.length - 1; i++) {
      tris.push([face[0], face[i], face[i + 1]]);
    }
  }

  return {
    particle: [cell.x, cell.y, cell.z],
    vertices: tri_verts,
    faces,
    tris,
    tri_verts,
    neighbors: cell.neighbors,
    particleID: cell.particleID,
  };
}
