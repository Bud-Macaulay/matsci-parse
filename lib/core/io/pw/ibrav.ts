/**
 * QE ibrav → Lattice vector mapping.
 *
 * Implements all 29 QE ibrav values (-14 to +14, excluding 0).
 * Maps the ibrav index + celldm or A,B,C parameters to a 3x3 lattice basis.
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html
 */

import { createLattice } from "../../lattice";
import type { Lattice } from "../../lattice";
import { fromParameters } from "../../lattice/create/fromParameters";

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

function clean(x: number): number {
  return Math.abs(x) < 1e-12 ? 0 : x;
}

/**
 * Construct a Lattice from QE ibrav index and crystal parameters.
 *
 * **Output units: Bohr.** The caller must convert to Angstrom if needed.
 *
 * @param ibrav  Bravais lattice index (-14 to +14, excluding 0)
 * @param celldm  celldm(1..6): celldm(1) in Bohr, others unitless ratios/cosines
 * @param ABC  Optional alternative: [A, B, C, cosAB, cosAC, cosBC] with A,B,C in Angstrom
 */
export function ibravToLattice(
  ibrav: number,
  celldm: number[],
  ABC?: [number, number, number, number, number, number],
): Lattice {
  if (ibrav === 0) {
    throw new Error("ibrav=0 requires explicit CELL_PARAMETERS");
  }

  // resolve lattice parameter a in Bohr
  let a: number;
  let b: number;
  let c: number;
  let cosab: number;
  let cosac: number;
  let cosbc: number;

  if (ABC) {
    // A,B,C in Angstrom → convert to Bohr
    const [Av, Bv, Cv, cosAB, cosAC, cosBC] = ABC;
    a = Av * BOHR_PER_ANGSTROM;
    b = Bv * BOHR_PER_ANGSTROM;
    c = Cv * BOHR_PER_ANGSTROM;
    cosab = cosAB;
    cosac = cosAC;
    cosbc = cosBC;
  } else {
    a = celldm[0] ?? 0;
    b = a * (celldm[1] ?? 0);
    c = a * (celldm[2] ?? 0);

    // meaning of celldm(4..6) depends on ibrav
    // defaults set per-case below
    cosab = 0;
    cosac = 0;
    cosbc = 0;
  }

  const v: number[] = new Array(9);

  switch (ibrav) {
    case 1: {
      // Cubic P (sc): v1 = a(1,0,0), v2 = a(0,1,0), v3 = a(0,0,1)
      const pp = fromParameters(a, a, a, 90, 90, 90);
      return pp;
    }

    case 2: {
      // Cubic F (fcc): v1 = (a/2)(-1,0,1), v2 = (a/2)(0,1,1), v3 = (a/2)(-1,1,0)
      const h = a / 2;
      v[0] = -h; v[1] = 0; v[2] = h;
      v[3] = 0; v[4] = h; v[5] = h;
      v[6] = -h; v[7] = h; v[8] = 0;
      break;
    }

    case 3: {
      // Cubic I (bcc): v1 = (a/2)(1,1,1), v2 = (a/2)(-1,1,1), v3 = (a/2)(-1,-1,1)
      const h = a / 2;
      v[0] = h; v[1] = h; v[2] = h;
      v[3] = -h; v[4] = h; v[5] = h;
      v[6] = -h; v[7] = -h; v[8] = h;
      break;
    }

    case -3: {
      // Cubic I (bcc), more symmetric: v1 = (a/2)(-1,1,1), v2 = (a/2)(1,-1,1), v3 = (a/2)(1,1,-1)
      const h = a / 2;
      v[0] = -h; v[1] = h; v[2] = h;
      v[3] = h; v[4] = -h; v[5] = h;
      v[6] = h; v[7] = h; v[8] = -h;
      break;
    }

    case 4: {
      // Hexagonal and Trigonal P: celldm(3) = c/a
      // v1 = a(1,0,0), v2 = a(-1/2, sqrt(3)/2, 0), v3 = a(0,0,c/a)
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      return fromParameters(a, a, a * ca, 90, 90, 120);
    }

    case 5: {
      // Trigonal R, 3fold axis c: celldm(4) = cos(gamma)
      const c4 = ABC ? cosbc : (celldm[3] ?? 0);
      const tx = Math.sqrt((1 - c4) / 2);
      const ty = Math.sqrt((1 - c4) / 6);
      const tz = Math.sqrt((1 + 2 * c4) / 3);
      v[0] = a * tx; v[1] = -a * ty; v[2] = a * tz;
      v[3] = 0; v[4] = a * 2 * ty; v[5] = a * tz;
      v[6] = -a * tx; v[7] = -a * ty; v[8] = a * tz;
      break;
    }

    case -5: {
      // Trigonal R, 3fold axis <111>: celldm(4) = cos(gamma)
      const c4 = ABC ? cosbc : (celldm[3] ?? 0);
      const tx = Math.sqrt((1 - c4) / 2);
      const ty = Math.sqrt((1 - c4) / 6);
      const tz = Math.sqrt((1 + 2 * c4) / 3);
      const u = tz - 2 * SQRT2 * ty;
      const vv = tz + SQRT2 * ty;
      const ap = a / SQRT3;
      v[0] = ap * u; v[1] = ap * vv; v[2] = ap * vv;
      v[3] = ap * vv; v[4] = ap * u; v[5] = ap * vv;
      v[6] = ap * vv; v[7] = ap * vv; v[8] = ap * u;
      break;
    }

    case 6: {
      // Tetragonal P (st): celldm(3) = c/a
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      return fromParameters(a, a, a * ca, 90, 90, 90);
    }

    case 7: {
      // Tetragonal I (bct): celldm(3) = c/a
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const h = a / 2;
      const hh = h * ca;
      v[0] = h; v[1] = -h; v[2] = hh;
      v[3] = h; v[4] = h; v[5] = hh;
      v[6] = -h; v[7] = -h; v[8] = hh;
      break;
    }

    case 8: {
      // Orthorhombic P: celldm(2) = b/a, celldm(3) = c/a
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      return fromParameters(a, a * ba, a * ca, 90, 90, 90);
    }

    case 9: {
      // Orthorhombic base-centered (bco): celldm(2) = b/a, celldm(3) = c/a
      // v1 = (a/2, b/2, 0), v2 = (-a/2, b/2, 0), v3 = (0, 0, c)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = bb / 2; v[2] = 0;
      v[3] = -a / 2; v[4] = bb / 2; v[5] = 0;
      v[6] = 0; v[7] = 0; v[8] = cc;
      break;
    }

    case -9: {
      // Orthorhombic BC, alternate: v1 = (a/2, -b/2, 0), v2 = (a/2, b/2, 0), v3 = (0, 0, c)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = -bb / 2; v[2] = 0;
      v[3] = a / 2; v[4] = bb / 2; v[5] = 0;
      v[6] = 0; v[7] = 0; v[8] = cc;
      break;
    }

    case 91: {
      // Orthorhombic one-face base-centered A-type
      // v1 = (a, 0, 0), v2 = (0, b/2, -c/2), v3 = (0, b/2, c/2)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a; v[1] = 0; v[2] = 0;
      v[3] = 0; v[4] = bb / 2; v[5] = -cc / 2;
      v[6] = 0; v[7] = bb / 2; v[8] = cc / 2;
      break;
    }

    case 10: {
      // Orthorhombic face-centered
      // v1 = (a/2, 0, c/2), v2 = (a/2, b/2, 0), v3 = (0, b/2, c/2)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = 0; v[2] = cc / 2;
      v[3] = a / 2; v[4] = bb / 2; v[5] = 0;
      v[6] = 0; v[7] = bb / 2; v[8] = cc / 2;
      break;
    }

    case 11: {
      // Orthorhombic body-centered
      // v1 = (a/2, b/2, c/2), v2 = (-a/2, b/2, c/2), v3 = (-a/2, -b/2, c/2)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = bb / 2; v[2] = cc / 2;
      v[3] = -a / 2; v[4] = bb / 2; v[5] = cc / 2;
      v[6] = -a / 2; v[7] = -bb / 2; v[8] = cc / 2;
      break;
    }

    case 12: {
      // Monoclinic P, unique axis c: celldm(2) = b/a, celldm(3) = c/a, celldm(4) = cos(gamma)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const cg = ABC ? cosab : (celldm[3] ?? 0);
      const gamma = Math.acos(cg) * (180 / Math.PI);
      return fromParameters(a, a * ba, a * ca, 90, 90, gamma);
    }

    case -12: {
      // Monoclinic P, unique axis b: celldm(2) = b/a, celldm(3) = c/a, celldm(5) = cos(beta)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const cb = ABC ? cosac : (celldm[4] ?? 0);
      const beta = Math.acos(cb) * (180 / Math.PI);
      return fromParameters(a, a * ba, a * ca, 90, beta, 90);
    }

    case 13: {
      // Monoclinic base-centered, unique axis c: celldm(2) = b/a, celldm(3) = c/a, celldm(4) = cos(gamma)
      // v1 = (a/2, 0, -c/2), v2 = (b*cos(gamma), b*sin(gamma), 0), v3 = (a/2, 0, c/2)
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const cg = ABC ? cosab : (celldm[3] ?? 0);
      const sg = Math.sqrt(Math.max(0, 1 - cg * cg));
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = 0; v[2] = -cc / 2;
      v[3] = bb * cg; v[4] = bb * sg; v[5] = 0;
      v[6] = a / 2; v[7] = 0; v[8] = cc / 2;
      break;
    }

    case -13: {
      // Monoclinic base-centered, unique axis b: celldm(2) = b/a, celldm(3) = c/a, celldm(5) = cos(beta)
      // v1 = (a/2, b/2, 0), v2 = (-a/2, b/2, 0), v3 = (c*cos(beta), 0, c*sin(beta))
      const ba = ABC ? b / a : (celldm[1] ?? 1);
      const ca = ABC ? c / a : (celldm[2] ?? 1);
      const cb = ABC ? cosac : (celldm[4] ?? 0);
      const sb = Math.sqrt(Math.max(0, 1 - cb * cb));
      const bb = a * ba;
      const cc = a * ca;
      v[0] = a / 2; v[1] = bb / 2; v[2] = 0;
      v[3] = -a / 2; v[4] = bb / 2; v[5] = 0;
      v[6] = cc * cb; v[7] = 0; v[8] = cc * sb;
      break;
    }

    case 14: {
      // Triclinic: celldm(2..6)
      // Same as fromParameters with explicit angles
      if (ABC) {
        return fromParameters(a, b, c,
          Math.acos(cosbc) * (180 / Math.PI),
          Math.acos(cosac) * (180 / Math.PI),
          Math.acos(cosab) * (180 / Math.PI),
        );
      }
      const ba = celldm[1] ?? 1;
      const ca = celldm[2] ?? 1;
      const cbc = celldm[3] ?? 0; // cos(alpha) between b and c
      const cac = celldm[4] ?? 0; // cos(beta) between a and c
      const cab = celldm[5] ?? 0; // cos(gamma) between a and b
      const bb = a * ba;
      const cc = a * ca;
      return fromParameters(a, bb, cc,
        Math.acos(cbc) * (180 / Math.PI),
        Math.acos(cac) * (180 / Math.PI),
        Math.acos(cab) * (180 / Math.PI),
      );
    }

    default:
      throw new Error(`Unsupported ibrav value: ${ibrav}`);
  }

  return createLattice(v.map(clean));
}
