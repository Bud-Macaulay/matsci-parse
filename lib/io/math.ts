import { CartesianCoords, FractionalCoords, Site } from "./common";
import { CrystalStructure } from "./crystal";

/**
 * Converts an angle in degrees to radians.
 */
export function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

/**
 * Converts an angle in radians to degrees.
 */
export function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

/**
 * Computes the cross product of two 3D vectors.
 *
 * @returns A vector orthogonal to both inputs following the right-hand rule.
 */
export function cross(u: CartesianCoords, v: CartesianCoords): CartesianCoords {
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

/**
 * Computes the dot product of two 3D vectors.
 *
 * @returns Scalar product u · v.
 */
export function dot(u: CartesianCoords, v: CartesianCoords): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

/**
 * Scales a 3D vector by a scalar factor.
 *
 * @returns Scaled vector s * v.
 */
export function scale(v: CartesianCoords, s: number): CartesianCoords {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Multiplies a 3x3 matrix by a 3D vector.
 *
 * The matrix is interpreted as row-major:
 * result_i = sum_j matrix[i][j] * vec[j]
 *
 * @returns Resulting vector.
 */
export function multiplyMatrixVector(
  matrix: number[][],
  vec: number[],
): number[] {
  return matrix.map(
    (row) => row[0] * vec[0] + row[1] * vec[1] + row[2] * vec[2],
  );
}

/**
 * Converts lattice parameters (a, b, c, alpha, beta, gamma)
 * into Cartesian lattice vectors.
 *
 * Angles are provided in degrees.
 *
 * @returns 3x3 lattice vectors in Cartesian coordinates.
 */
export function cellLengthsAnglesToLattice(
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
): CartesianCoords[] {
  const radAlpha = degToRad(alpha);
  const radBeta = degToRad(beta);
  const radGamma = degToRad(gamma);

  const vX: CartesianCoords = [a, 0, 0];

  const vY: CartesianCoords = [
    b * Math.cos(radGamma),
    b * Math.sin(radGamma),
    0,
  ];

  const cx = c * Math.cos(radBeta);
  const cy =
    (c * (Math.cos(radAlpha) - Math.cos(radBeta) * Math.cos(radGamma))) /
    Math.sin(radGamma);

  const cz = Math.sqrt(c * c - cx * cx - cy * cy);

  const vZ: CartesianCoords = [cx, cy, cz];

  return [vX, vY, vZ];
}

/**
 * Converts fractional coordinates to Cartesian coordinates.
 *
 * Uses lattice vectors as basis columns:
 * r = f1 a1 + f2 a2 + f3 a3
 *
 * @returns Cartesian coordinates.
 */
export function fractionalToCartesian(
  fract: FractionalCoords,
  lattice: CartesianCoords[] | number[],
): CartesianCoords {
  const lat = normalizeLattice(lattice);
  const [a, b, c] = lat;

  return [
    fract[0] * a[0] + fract[1] * b[0] + fract[2] * c[0],
    fract[0] * a[1] + fract[1] * b[1] + fract[2] * c[1],
    fract[0] * a[2] + fract[1] * b[2] + fract[2] * c[2],
  ];
}

/**
 * Normalizes a lattice representation into a 3x3 Cartesian matrix.
 *
 * Accepts either:
 * - 3x3 array of vectors
 * - flat array of length 9
 *
 * @returns 3x3 lattice vectors
 */
function normalizeLattice(
  lattice: CartesianCoords[] | number[],
): CartesianCoords[] {
  if (Array.isArray(lattice[0])) {
    return lattice as CartesianCoords[];
  }

  const m = lattice as number[];

  return [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];
}

/**
 * Inverts a 3x3 matrix.
 *
 * Uses analytic adjugate + determinant formula.
 *
 * @throws If matrix is singular or near-singular.
 * @returns Inverse matrix.
 */
function invertMatrix(m: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;

  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);

  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;

  if (Math.abs(det) < 1e-12) {
    throw new Error("Matrix is singular and cannot be inverted");
  }

  const invDet = 1 / det;

  return [
    [A * invDet, D * invDet, G * invDet],
    [B * invDet, E * invDet, H * invDet],
    [C * invDet, F * invDet, I * invDet],
  ];
}

/**
 * Converts Cartesian coordinates to fractional coordinates.
 *
 * Solves r = A · f where A is the lattice matrix.
 *
 * @returns Fractional coordinates.
 */
export function cartesianToFractional(
  cart: CartesianCoords,
  lattice: CartesianCoords[] | number[],
): FractionalCoords {
  const lat = normalizeLattice(lattice);
  const [a, b, c] = lat;

  const latticeMatrix = [
    [a[0], b[0], c[0]],
    [a[1], b[1], c[1]],
    [a[2], b[2], c[2]],
  ];

  const inv = invertMatrix(latticeMatrix);
  const res = multiplyMatrixVector(inv, cart);

  return res as FractionalCoords;
}

/**
 * Computes reciprocal lattice vectors.
 *
 * Convention:
 *   scaleFactor = 1   → crystallography (spglib / SeekPath)
 *   scaleFactor = 2π  → physics (Bloch / band structure)
 */
export function getReciprocalLattice(
  lattice: CartesianCoords[] | number[],
  scaleFactor: number = 1,
): CartesianCoords[] {
  const lat = normalizeLattice(lattice);
  const [a1, a2, a3] = lat;

  const volume = dot(a1, cross(a2, a3));

  if (Math.abs(volume) < 1e-12) {
    throw new Error("Invalid lattice: zero volume");
  }

  const factor = scaleFactor / volume;

  return [
    scale(cross(a2, a3), factor),
    scale(cross(a3, a1), factor),
    scale(cross(a1, a2), factor),
  ];
}

export function applyLatticeTransformation(
  structure: CrystalStructure,
  scale: number | [number, number, number] | number[][],
): CrystalStructure {
  let transform: number[][];

  if (typeof scale === "number") {
    transform = [
      [scale, 0, 0],
      [0, scale, 0],
      [0, 0, scale],
    ];
  } else if (
    Array.isArray(scale) &&
    scale.length === 3 &&
    scale.every((v) => typeof v === "number")
  ) {
    transform = [
      [scale[0], 0, 0],
      [0, scale[1], 0],
      [0, 0, scale[2]],
    ];
  } else if (
    Array.isArray(scale) &&
    scale.length === 3 &&
    scale.every((row) => Array.isArray(row) && row.length === 3)
  ) {
    transform = scale as number[][];
  } else {
    throw new Error(
      "Scale must be a number, a 3-element array, or a 3x3 matrix",
    );
  }

  const newLattice = structure.lattice.map((vec) =>
    multiplyMatrixVector(transform, vec),
  );

  const newSites = structure.sites.map((site) => {
    const newCart = multiplyMatrixVector(transform, site.cart);
    return new Site(site.speciesIndex, newCart, site.props);
  });

  return new CrystalStructure({
    lattice: newLattice,
    species: [...structure.species],
    sites: newSites,
  });
}

export function makeSupercell(
  structure: CrystalStructure,
  dims: [number, number, number],
): CrystalStructure {
  const [nx, ny, nz] = dims;

  if (![nx, ny, nz].every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error("Supercell dims must be positive integers");
  }

  const [a, b, c] = structure.lattice;

  // scale lattice
  const newLattice = [
    [a[0] * nx, a[1] * nx, a[2] * nx],
    [b[0] * ny, b[1] * ny, b[2] * ny],
    [c[0] * nz, c[1] * nz, c[2] * nz],
  ];

  const newSites = [];

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      for (let k = 0; k < nz; k++) {
        const shift = [
          i * a[0] + j * b[0] + k * c[0],
          i * a[1] + j * b[1] + k * c[1],
          i * a[2] + j * b[2] + k * c[2],
        ];

        for (const site of structure.sites) {
          newSites.push(
            new Site(
              site.speciesIndex,
              [
                site.cart[0] + shift[0],
                site.cart[1] + shift[1],
                site.cart[2] + shift[2],
              ],
              site.props,
            ),
          );
        }
      }
    }
  }

  return new CrystalStructure({
    lattice: newLattice,
    species: [...structure.species],
    sites: newSites,
  });
}
