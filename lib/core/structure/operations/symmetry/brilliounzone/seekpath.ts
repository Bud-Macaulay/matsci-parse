import { generateBZVertices } from "./generateBZVertices";
import { getSymmetry } from "../spglib";
import { Structure } from "../../../structure";

import { spgroup_data } from "../spgData";

import { parameters } from "../../../../lattice/parameters";
import { niggli_reduce } from "../spglib-wasm";

import { Matrix, createMatrix } from "../../../../matrix/matrix";
import { transpose } from "../../../../matrix/operations/transpose";
import { mul } from "../../../../matrix/operations/mul";
import { scale } from "../../../../matrix/operations/scale";
import { gjInverse } from "../../../../matrix/operations/inverse/gaussJordan";

const TWO_PI = 2 * Math.PI;

function matrixFromRowMajor(data: ArrayLike<number>): Matrix {
  if (data.length !== 9) throw new Error("Expected 9 lattice values");
  return createMatrix(
    3,
    3,
    Array.from(data).map((x) => x),
  );
}

function cellParams(lattice: Matrix): number[] {
  const d = lattice.data;
  const v1 = [d[0], d[1], d[2]];
  const v2 = [d[3], d[4], d[5]];
  const v3 = [d[6], d[7], d[8]];
  const a = Math.hypot(v1[0], v1[1], v1[2]);
  const b = Math.hypot(v2[0], v2[1], v2[2]);
  const c = Math.hypot(v3[0], v3[1], v3[2]);
  const dot = (u: number[], v: number[]) =>
    u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cosalpha = dot(v2, v3) / b / c;
  const cosbeta = dot(v1, v3) / a / c;
  const cosgamma = dot(v1, v2) / a / b;
  return [a, b, c, cosalpha, cosbeta, cosgamma];
}

/** Reciprocal-space cell rows, such that dot(real, recip.T) = 2π I. */
function getReciprocalCellRows(real: Matrix): Matrix {
  return transpose(scale(gjInverse(real), TWO_PI));
}

function getRealCellFromReciprocalRows(recip: Matrix): Matrix {
  return transpose(scale(gjInverse(recip), TWO_PI));
}

const M2_MATRICES = [
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
];

/** Determine the aP label (aP2 all-obtuse / aP3 all-acute) as in HPKOT. */
const M3_I = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const M3_XX = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
];
const M3_YY = [
  [-1, 0, 0],
  [0, 1, 0],
  [0, 0, -1],
];
const M3_ZZ = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, 1],
];

async function determineAP(convLattice: Matrix): Promise<string> {
  const reciprocalCellOrig = getReciprocalCellRows(convLattice);
  const reduced = await niggli_reduce(Array.from(reciprocalCellOrig.data));
  if (!reduced) throw new Error("Niggli reduction failed for aP lattice");
  const reciprocalCell2 = matrixFromRowMajor(reduced);
  const realCell2 = getRealCellFromReciprocalRows(reciprocalCell2);

  const [ka2, kb2, kc2, coskalpha2, coskbeta2, coskgamma2] =
    cellParams(reciprocalCell2);
  const conditions = [
    Math.abs(kb2 * kc2 * coskalpha2),
    Math.abs(kc2 * ka2 * coskbeta2),
    Math.abs(ka2 * kb2 * coskgamma2),
  ];

  let smallest = 0;
  if (conditions[1] < conditions[smallest]) smallest = 1;
  if (conditions[2] < conditions[smallest]) smallest = 2;
  const M2 = matrixFromRowMajor(M2_MATRICES[smallest].flat());
  const realCell3 = mul(transpose(M2), realCell2);

  const reciprocalCell3 = getReciprocalCellRows(realCell3);
  const [, , , ca3, cb3, cg3] = cellParams(reciprocalCell3);

  let M3: number[][];
  if ((ca3 > 0 && cb3 > 0 && cg3 > 0) || (ca3 <= 0 && cb3 <= 0 && cg3 <= 0))
    M3 = M3_I;
  else if (
    (ca3 > 0 && cb3 <= 0 && cg3 <= 0) ||
    (ca3 <= 0 && cb3 > 0 && cg3 > 0)
  )
    M3 = M3_XX;
  else if (
    (ca3 <= 0 && cb3 > 0 && cg3 <= 0) ||
    (ca3 > 0 && cb3 <= 0 && cg3 > 0)
  )
    M3 = M3_YY;
  else if (
    (ca3 <= 0 && cb3 <= 0 && cg3 > 0) ||
    (ca3 > 0 && cb3 > 0 && cg3 <= 0)
  )
    M3 = M3_ZZ;
  else
    throw new Error(
      "Problem identifying M3 matrix in aP lattice: sign pattern of cosines ambiguous",
    );

  const M3mat = matrixFromRowMajor(M3.flat());
  const realCellFinal = mul(transpose(M3mat), realCell3);
  const reciprocalCellFinal = getReciprocalCellRows(realCellFinal);
  const [, , , ca, cb, cg] = cellParams(reciprocalCellFinal);

  if (ca <= 0 && cb <= 0 && cg <= 0) return "aP2";
  if (ca >= 0 && cb >= 0 && cg >= 0) return "aP3";
  throw new Error(
    "Unexpected aP lattice, neither all-obtuse nor all-acute in reciprocal space",
  );
}

function determineExtBravais(
  bL: string,
  spgN: number,
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
): string {
  const threshold = 1e-7;

  switch (bL) {
    case "cP":
      if (spgN < 195 || spgN > 230)
        throw new Error("cP requires spacegroup number in [195, 230]");
      return spgN <= 206 ? "cP1" : "cP2";

    case "cF":
      if (spgN < 195 || spgN > 230)
        throw new Error("cF requires spacegroup number in [195, 230]");
      return spgN <= 206 ? "cF1" : "cF2";

    case "cI":
      return "cI1";

    case "tP":
      return "tP1";

    case "tI":
      if (c - a < threshold) {
        console.warn("tI lattice, a ≈ c");
      }
      return c <= a ? "tI1" : "tI2";

    case "oP":
      return "oP1";

    case "oF": {
      const A = 1.0 / a ** 2;
      const B = 1.0 / b ** 2;
      const C = 1.0 / c ** 2;

      if (A > B + C) {
        return "oF1";
      }

      if (C > A + B) {
        return "oF2";
      } else return "oF3";
    }

    case "oI": {
      const sorted = [
        { v: c, id: 1 },
        { v: b, id: 3 },
        { v: a, id: 2 },
      ]
        .sort((x, y) => x.v - y.v || x.id - y.id)
        .reverse();

      if (Math.abs(sorted[0].v - sorted[1].v) < threshold) {
        console.warn("oI near-degeneracy");
      }

      return `${bL}${sorted[0].id}`;
    }

    case "oC":
      return a <= b ? "oC1" : "oC2";

    case "oA":
      return b <= c ? "oA1" : "oA2";

    case "hP":
      return [
        143, 144, 145, 146, 147, 148, 149, 151, 153, 157, 159, 160, 161, 162,
        163,
      ].includes(spgN)
        ? "hP1"
        : "hP2";

    case "hR":
      return Math.sqrt(3) * a <= Math.sqrt(2) * c ? "hR1" : "hR2";

    case "mP":
      return "mP1";

    case "mC": {
      const rad = Math.PI / 180;
      const cosbeta = Math.cos(beta * rad);
      const sinbeta = Math.sin(beta * rad);

      const term1 = b - a * Math.sqrt(1 - cosbeta ** 2);

      if (Math.abs(term1) < threshold) {
        console.warn("mC near-degeneracy");
      }

      if (b < a * sinbeta) return "mC1";

      const expr = (-a * cosbeta) / c + (a ** 2 * (1 - cosbeta ** 2)) / b ** 2;
      if (Math.abs(expr - 1.0) < threshold) {
        console.warn("mC second degeneracy");
      }

      return expr <= 1 ? "mC2" : "mC3";
    }

    case "aP":
      throw new Error("aP must be handled by determineAP");

    default:
      throw new Error(`Unknown bravais lattice: ${bL}`);
  }
}

/** Determine the Seekpath extended Bravais lattice from symmetry data. */
export async function getSeekPathHighSymPath(
  structure: Structure,
  symTol = 1e-6,
): Promise<string> {
  const symData = await getSymmetry(structure, symTol);

  const conventionalLattice = symData.conventional.lattice;
  const [a, b, c, alpha, beta, gamma] = parameters(conventionalLattice);
  const spgN = symData.calculationResults.number;

  const props = spgroup_data[spgN];
  if (!props) throw new Error(`No space group data for SG ${spgN}`);
  const bL = `${props[0]}${props[1]}`;

  if (bL === "aP") {
    return determineAP(conventionalLattice.basis);
  }

  return determineExtBravais(bL, spgN, a, b, c, alpha, beta, gamma);
}
