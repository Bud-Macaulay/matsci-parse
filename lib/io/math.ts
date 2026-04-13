import { CartesianCoords, FractionalCoords } from "./common";

// --- Helpers ---
export function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

export function multiplyMatrixVector(
  matrix: number[][],
  vec: number[],
): number[] {
  return matrix.map(
    (row) => row[0] * vec[0] + row[1] * vec[1] + row[2] * vec[2],
  );
}

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

function normalizeLattice(
  lattice: CartesianCoords[] | number[],
): CartesianCoords[] {
  // already 3x3
  if (Array.isArray(lattice[0])) {
    return lattice as CartesianCoords[];
  }

  // flat 9
  const m = lattice as number[];
  return [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];
}

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

export function cartesianToFractional(
  cart: CartesianCoords,
  lattice: CartesianCoords[] | number[],
): FractionalCoords {
  const lat = normalizeLattice(lattice);
  const [a, b, c] = lat;

  // lattice matrix (columns = lattice vectors)
  const latticeMatrix = [
    [a[0], b[0], c[0]],
    [a[1], b[1], c[1]],
    [a[2], b[2], c[2]],
  ];

  const inv = invertMatrix(latticeMatrix);

  const res = multiplyMatrixVector(inv, cart);

  return res as FractionalCoords;
}
