import { createLattice } from "../lattice";

const DEG2RAD = Math.PI / 180;
const EPS = 1e-12;

function clean(x: number) {
  return Math.abs(x) < EPS ? 0 : x;
}

export function fromParameters(
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
) {
  const alphaR = alpha * DEG2RAD;
  const betaR = beta * DEG2RAD;
  const gammaR = gamma * DEG2RAD;

  const cosA = Math.cos(alphaR);
  const cosB = Math.cos(betaR);
  const cosG = Math.cos(gammaR);
  const sinG = Math.sin(gammaR);

  // lattice vectors
  const v1 = [a, 0, 0];

  const v2 = [b * cosG, b * sinG, 0];

  // guard against degenerate gamma
  if (Math.abs(sinG) < EPS) {
    throw new Error("Invalid lattice: gamma too close to 0 or 180 degrees");
  }

  const cx = c * cosB;

  const cy = (c * (cosA - cosB * cosG)) / sinG;

  const czSquared = c * c - cx * cx - cy * cy;

  const cz = Math.sqrt(Math.max(0, czSquared));

  return createLattice([
    clean(v1[0]),
    clean(v1[1]),
    clean(v1[2]),
    clean(v2[0]),
    clean(v2[1]),
    clean(v2[2]),
    clean(cx),
    clean(cy),
    clean(cz),
  ]);
}
