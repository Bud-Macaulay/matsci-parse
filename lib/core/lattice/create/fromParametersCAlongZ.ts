import { createLattice } from "../lattice";
import { EPSILON } from "../../math/constants";
import { clean } from "../../math/numeric";

const DEG2RAD = Math.PI / 180;

/**
 * Create a Lattice from cell parameters (angles in degrees) with the
 * c-vector along z: c maps to [0, 0, c], a lies in the xz-plane, and b
 * is placed to satisfy the three cell angles.
 *
 * Unlike {@link fromParameters} (a along x), this pins c to the z-axis —
 * the orientation slab builders use, so vacuum and surface normal stack
 * along z. Prefer this when the c-direction is the distinguished axis.
 */
export function fromParametersCAlongZ(
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
  const sinA = Math.sin(alphaR);
  const sinB = Math.sin(betaR);

  if (Math.abs(sinA) < EPSILON || Math.abs(sinB) < EPSILON) {
    throw new Error(
      "Invalid lattice: alpha or beta too close to 0 or 180 degrees",
    );
  }

  const val = Math.min(1, Math.max(-1, (cosA * cosB - cosG) / (sinA * sinB)));
  const gammaStar = Math.acos(val);

  return createLattice([
    clean(a * sinB),
    0,
    clean(a * cosB),
    clean(-b * sinA * Math.cos(gammaStar)),
    clean(b * sinA * Math.sin(gammaStar)),
    clean(b * cosA),
    0,
    0,
    c,
  ]);
}
