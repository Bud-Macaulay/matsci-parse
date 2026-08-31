import { Matrix } from "@/core/matrix/matrix";
import { transpose } from "@/core/matrix/operations/transpose";
import { mul } from "@/core/matrix/operations/mul";
import { gjInverse } from "@/core/matrix/operations/inverse/gaussJordan";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import {
  cellParams,
  getReciprocalCellRows,
  getRealCellFromReciprocalRows,
  matrixFromRowMajor,
} from "./seekpathTools";

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

function mulRows(a: number[][], b: number[][]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

export interface APTransform {
  lattice: number[][];
  positions: number[][];
  extBravais: string;
}

/**
 * Apply the Niggli reduction plus the M2/M3 vector transforms of the HPKOT
 * paper to bring a triclinic conventional cell into the all-obtuse (aP2) or
 * all-acute (aP3) setting.
 */
export async function transformAP(
  lattice: number[][],
  positions: number[][],
): Promise<APTransform> {
  const convLattice = matrixFromRowMajor(lattice.flat());

  const reciprocalCellOrig = getReciprocalCellRows(convLattice);
  const reduced = niggli(reciprocalCellOrig);
  if (!reduced) throw new Error("Niggli reduction failed for aP lattice");
  const reciprocalCell2 = reduced.basis;
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

  let extBravais: string;
  if (ca <= 0 && cb <= 0 && cg <= 0) extBravais = "aP2";
  else if (ca >= 0 && cb >= 0 && cg >= 0) extBravais = "aP3";
  else
    throw new Error(
      "Unexpected aP lattice, neither all-obtuse nor all-acute in reciprocal space",
    );

  // Express the (absolute) atomic positions in the new real cell basis
  const finalRows = Array.from(realCellFinal.data).reduce<number[][]>(
    (acc, x, i) => {
      acc[Math.floor(i / 3)][i % 3] = x;
      return acc;
    },
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
  const absPositions = mulRows(positions, lattice);
  const invFinal = gjInverse(matrixFromRowMajor(finalRows.flat()));
  const newPositions = absPositions.map((p) => {
    const v = createVector(p);
    const res = mul(invFinal, v).data;
    return [res[0], res[1], res[2]];
  });

  return {
    lattice: finalRows,
    positions: newPositions,
    extBravais,
  };
}

function createVector(v: number[]): Matrix {
  return { rows: 3, cols: 1, data: new Float64Array(v) };
}

/** Determine the aP label (aP2 / aP3) for a triclinic conventional lattice. */
export async function determineAP(convLattice: Matrix): Promise<string> {
  const rows = Array.from(convLattice.data).reduce<number[][]>(
    (acc, x, i) => {
      acc[Math.floor(i / 3)][i % 3] = x;
      return acc;
    },
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
  const { extBravais } = await transformAP(rows, []);
  return extBravais;
}

/** Determine the Seekpath extended Bravais lattice from a conventional cell. */
export function determineExtBravais(
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
