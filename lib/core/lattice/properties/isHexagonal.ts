import { parameters } from "../parameters";
import { Lattice } from "../lattice";

/** Angle tolerance in degrees for hexagonal detection. */
const HEX_ANGLE_TOL = 5;

/** Length tolerance in angstroms for hexagonal detection. */
const HEX_LENGTH_TOL = 0.01;

function isClose(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

/** Check whether the lattice is hexagonal within pymatgen's tolerances.
 * @param lattice - The lattice to test.
 * @returns True if two angles are right angles, one is 60 or 120 degrees,
 * and the two lattice vectors spanning the right angles have equal length.
 * Hexagonal peaks are reported with 4-index Miller-Bravais notation. */
export function isHexagonal(lattice: Lattice): boolean {
  const [a, b, c, alpha, beta, gamma] = parameters(lattice);

  const lens = [a, b, c];
  const angs = [alpha, beta, gamma];

  const rightAngles: number[] = [];
  const hexAngles: number[] = [];

  for (let i = 0; i < 3; i++) {
    if (isClose(angs[i], 90, HEX_ANGLE_TOL)) {
      rightAngles.push(i);
    }

    if (isClose(angs[i], 60, HEX_ANGLE_TOL) || isClose(angs[i], 120, HEX_ANGLE_TOL)) {
      hexAngles.push(i);
    }
  }

  return (
    rightAngles.length === 2 &&
    hexAngles.length === 1 &&
    isClose(lens[rightAngles[0]], lens[rightAngles[1]], HEX_LENGTH_TOL)
  );
}
