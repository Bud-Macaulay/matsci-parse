import { CartesianCoords, FractionalCoords } from "./common";

// --- Helpers ---
export function degToRad(d: number) {
  return (d * Math.PI) / 180;
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
  lattice: CartesianCoords[],
): CartesianCoords {
  const [a, b, c] = lattice;
  return [
    fract[0] * a[0] + fract[1] * b[0] + fract[2] * c[0],
    fract[0] * a[1] + fract[1] * b[1] + fract[2] * c[1],
    fract[0] * a[2] + fract[1] * b[2] + fract[2] * c[2],
  ];
}
