import { Matrix, createMatrix } from "@/core/matrix/matrix";
import { transpose } from "@/core/matrix/operations/transpose";
import { scale } from "@/core/matrix/operations/scale";
import { gjInverse } from "@/core/matrix/operations/inverse/gaussJordan";

const TWO_PI = 2 * Math.PI;

/** Build a 3x3 Matrix from 9 row-major values. */
export function matrixFromRowMajor(data: ArrayLike<number>): Matrix {
  if (data.length !== 9) throw new Error("Expected 9 lattice values");
  return createMatrix(3, 3, Array.from(data));
}

/**
 * Return [a, b, c, cosalpha, cosbeta, cosgamma] for a 3x3 lattice whose
 * rows are the lattice vectors.
 */
export function cellParams(
  lattice: Matrix,
): [number, number, number, number, number, number] {
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
export function getReciprocalCellRows(real: Matrix): Matrix {
  return transpose(scale(gjInverse(real), TWO_PI));
}

/** Real-space cell rows given reciprocal rows, such that dot(recip, real.T) = 2π I. */
export function getRealCellFromReciprocalRows(recip: Matrix): Matrix {
  return transpose(scale(gjInverse(recip), TWO_PI));
}

/**
 * Return the (P, invP) transformation matrices from the crystallographic
 * conventional cell to the primitive cell, as in Table 3 of the HPKOT paper:
 * (a_P, b_P, c_P) = (a, b, c) P and (x_P, y_P, z_P)^T = P^-1 (x, y, z)^T.
 */
export function getPmatrix(
  bravaisLattice: string,
): { P: number[][]; invP: number[][] } {
  if (["cP", "tP", "hP", "oP", "mP"].includes(bravaisLattice)) {
    return {
      P: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      invP: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    };
  }
  if (["cF", "oF"].includes(bravaisLattice)) {
    return {
      P: [
        [0, 0.5, 0.5],
        [0.5, 0, 0.5],
        [0.5, 0.5, 0],
      ],
      invP: [
        [-1, 1, 1],
        [1, -1, 1],
        [1, 1, -1],
      ],
    };
  }
  if (["cI", "tI", "oI"].includes(bravaisLattice)) {
    return {
      P: [
        [-0.5, 0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, -0.5],
      ],
      invP: [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
      ],
    };
  }
  if (bravaisLattice === "hR") {
    return {
      P: [
        [2 / 3, -1 / 3, -1 / 3],
        [1 / 3, 1 / 3, -2 / 3],
        [1 / 3, 1 / 3, 1 / 3],
      ],
      invP: [
        [1, 0, 1],
        [-1, 1, 1],
        [0, -1, 1],
      ],
    };
  }
  if (bravaisLattice === "oC") {
    return {
      P: [
        [0.5, 0.5, 0],
        [-0.5, 0.5, 0],
        [0, 0, 1],
      ],
      invP: [
        [1, -1, 0],
        [1, 1, 0],
        [0, 0, 1],
      ],
    };
  }
  if (bravaisLattice === "oA") {
    return {
      P: [
        [0, 0, 1],
        [0.5, 0.5, 0],
        [-0.5, 0.5, 0],
      ],
      invP: [
        [0, 1, -1],
        [0, 1, 1],
        [1, 0, 0],
      ],
    };
  }
  if (bravaisLattice === "mC") {
    return {
      P: [
        [0.5, -0.5, 0],
        [0.5, 0.5, 0],
        [0, 0, 1],
      ],
      invP: [
        [1, 1, 0],
        [-1, 1, 0],
        [0, 0, 1],
      ],
    };
  }
  if (bravaisLattice === "aP") {
    return {
      P: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      invP: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    };
  }
  throw new Error(`Invalid bravais_lattice ${bravaisLattice}`);
}

export interface PrimitiveCellResult {
  lattice: number[][];
  positions: number[][];
  types: number[];
  mapping: number[];
}

/**
 * Build the crystallographic primitive cell from a standardized conventional
 * cell using the HPKOT P matrices, deduplicating atoms that coincide modulo 1.
 */
export function getPrimitive(
  lattice: number[][],
  positions: number[][],
  types: number[],
  bravaisLattice: string,
  threshold = 1e-6,
): PrimitiveCellResult {
  const { P, invP } = getPmatrix(bravaisLattice);

  const volumeRatio = Math.round(Math.abs(det3(invP)));

  // (a_P, b_P, c_P) = (a, b, c) P  => prim vector j = sum_k P[k][j] * a_k,
  // i.e. prim_lattice = P^T @ lattice
  const primLattice = matmul3(transpose3(P), lattice);
  // (x_P, y_P, z_P)^T = P^-1 (x, y, z)^T  => row-vector form: positions @ invP.T
  const primPositions = matmul3(positions, transpose3(invP));

  const n = positions.length;

  // Mark equivalent atoms (same position modulo 1, shifted so that ±0.5 wrap)
  const match = (u: number, v: number) => {
    const diff = Math.abs(((u - v + 0.5) % 1 + 1) % 1 - 0.5);
    return diff < threshold;
  };

  const groups: number[][] = [];
  const assigned = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) {
    if (assigned[i]) continue;
    const group: number[] = [];
    for (let j = i; j < n; j++) {
      if (
        match(primPositions[j][0], primPositions[i][0]) &&
        match(primPositions[j][1], primPositions[i][1]) &&
        match(primPositions[j][2], primPositions[i][2])
      ) {
        group.push(j);
        assigned[j] = true;
      }
    }
    groups.push(group);
  }

  for (const group of groups) {
    if (group.length !== volumeRatio) {
      throw new Error(
        `Problem creating primitive cell, found group of atoms with length ${group.length} != ${volumeRatio}`,
      );
    }
    const typeSet = new Set(group.map((idx) => types[idx]));
    if (typeSet.size !== 1) {
      throw new Error(
        "The following atoms go on top of each other, but they are of different type!",
      );
    }
  }

  groups.sort((a, b) => a[0] - b[0]);

  const mapping = new Array<number>(n).fill(-1);
  for (let primIdx = 0; primIdx < groups.length; primIdx++) {
    for (const atIdx of groups[primIdx]) mapping[atIdx] = primIdx;
  }

  return {
    lattice: primLattice,
    positions: groups.map((g) => primPositions[g[0]]),
    types: groups.map((g) => types[g[0]]),
    mapping,
  };
}

function transpose3(m: number[][]): number[][] {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

function matmul3(a: number[][], b: number[][]): number[][] {
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

function det3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** Evaluate an expression that only requires precomputed k-parameters. */
export function evalExprSimple(expr: string, kparam: Record<string, number>): number {
  switch (expr) {
    case "0":
      return 0;
    case "1/2":
      return 0.5;
    case "1":
      return 1;
    case "-1/2":
      return -0.5;
    case "1/4":
      return 0.25;
    case "3/8":
      return 0.375;
    case "3/4":
      return 0.75;
    case "5/8":
      return 0.625;
    case "1/3":
      return 1 / 3;
    default: {
      const val = kparam[expr];
      if (val === undefined) {
        throw new Error(
          `Asking for evaluation of symbol '${expr}' in eval_expr_simple but this has not been defined or not yet computed`,
        );
      }
      return val;
    }
  }
}

/** Extend kparam with derived expressions (1-x, -x, 1/2-x, ...). */
export function extendKparam(kparam: Record<string, number>): Record<string, number> {
  const extended: Record<string, number> = {};
  for (const [key, val] of Object.entries(kparam)) {
    extended[key] = val;
    extended[`-${key}`] = -val;
    extended[`1-${key}`] = 1 - val;
    extended[`-1+${key}`] = -1 + val;
    extended[`1/2-${key}`] = 0.5 - val;
    extended[`1/2+${key}`] = 0.5 + val;
  }
  return extended;
}

/**
 * Evaluate a k-parameter expression as a function of the cell parameters and
 * previously computed k-parameters. Mirrors the hardcoded table in seekpath.
 */
export function evalExpr(
  expr: string,
  a: number,
  b: number,
  c: number,
  cosalpha: number,
  cosbeta: number,
  cosgamma: number,
  kparam: Record<string, number>,
): number {
  const sinbeta = Math.sqrt(1 - cosbeta * cosbeta);

  const k = (name: string): number => {
    const val = kparam[name];
    if (val === undefined) {
      throw new Error(
        `Asking for evaluation of symbol '${name}' but this has not been defined or not yet computed`,
      );
    }
    return val;
  };
  const Z = () => k("Z");
  const E = () => k("E");
  const F = () => k("F");
  const U = () => k("U");
  const W = () => k("W");
  const S = () => k("S");
  const M = () => k("M");
  const X = () => k("X");
  const D = () => k("D");
  const Y = () => k("Y");

  switch (expr) {
    case "(a*a/b/b+(1+a/c*cosbeta)/sinbeta/sinbeta)/4":
      return (a * a / b / b + (1 + a / c * cosbeta) / sinbeta / sinbeta) / 4;
    case "1-Z*b*b/a/a":
      return 1 - Z() * b * b / a / a;
    case "1/2-2*Z*c*cosbeta/a":
      return 0.5 - 2 * Z() * c * cosbeta / a;
    case "E/2+a*a/4/b/b+a*c*cosbeta/2/b/b":
      return E() / 2 + a * a / 4 / b / b + a * c * cosbeta / 2 / b / b;
    case "2*F-Z":
      return 2 * F() - Z();
    case "c/2/a/cosbeta*(1-4*U+a*a*sinbeta*sinbeta/b/b)":
      return (
        c / 2 / a / cosbeta * (1 - 4 * U() + a * a * sinbeta * sinbeta / b / b)
      );
    case "-1/4+W/2-Z*c*cosbeta/a":
      return -0.25 + W() / 2 - Z() * c * cosbeta / a;
    case "(2+a/c*cosbeta)/4/sinbeta/sinbeta":
      return (2 + a / c * cosbeta) / 4 / sinbeta / sinbeta;
    case "3/4-b*b/4/a/a/sinbeta/sinbeta":
      return 3 / 4 - b * b / 4 / a / a / sinbeta / sinbeta;
    case "S-(3/4-S)*a*cosbeta/c":
      return S() - (3 / 4 - S()) * a * cosbeta / c;
    case "(1+a*a/b/b)/4":
      return (1 + a * a / b / b) / 4;
    case "-a*c*cosbeta/2/b/b":
      return -a * c * cosbeta / 2 / b / b;
    case "1+Z-2*M":
      return 1 + Z() - 2 * M();
    case "X-2*D":
      return X() - 2 * D();
    case "(1+a/c*cosbeta)/2/sinbeta/sinbeta":
      return (1 + a / c * cosbeta) / 2 / sinbeta / sinbeta;
    case "1/2+Y*c*cosbeta/a":
      return 0.5 + Y() * c * cosbeta / a;
    case "a*a/4/c/c":
      return a * a / 4 / c / c;
    case "5/6-2*D":
      return 5 / 6 - 2 * D();
    case "1/3+D":
      return 1 / 3 + D();
    case "1/6-c*c/9/a/a":
      return 1 / 6 - c * c / 9 / a / a;
    case "1/2-2*Z":
      return 0.5 - 2 * Z();
    case "1/2+Z":
      return 0.5 + Z();
    case "(1+b*b/c/c)/4":
      return (1 + b * b / c / c) / 4;
    case "(1+c*c/b/b)/4":
      return (1 + c * c / b / b) / 4;
    case "(1+b*b/a/a)/4":
      return (1 + b * b / a / a) / 4;
    case "(1+a*a/b/b-a*a/c/c)/4":
      return (1 + a * a / b / b - a * a / c / c) / 4;
    case "(1+a*a/b/b+a*a/c/c)/4":
      return (1 + a * a / b / b + a * a / c / c) / 4;
    case "(1+c*c/a/a-c*c/b/b)/4":
      return (1 + c * c / a / a - c * c / b / b) / 4;
    case "(1+c*c/a/a+c*c/b/b)/4":
      return (1 + c * c / a / a + c * c / b / b) / 4;
    case "(1+b*b/a/a-b*b/c/c)/4":
      return (1 + b * b / a / a - b * b / c / c) / 4;
    case "(1+c*c/b/b-c*c/a/a)/4":
      return (1 + c * c / b / b - c * c / a / a) / 4;
    case "(1+a*a/c/c)/4":
      return (1 + a * a / c / c) / 4;
    case "(b*b-a*a)/4/c/c":
      return (b * b - a * a) / 4 / c / c;
    case "(a*a+b*b)/4/c/c":
      return (a * a + b * b) / 4 / c / c;
    case "(1+c*c/a/a)/4":
      return (1 + c * c / a / a) / 4;
    case "(c*c-b*b)/4/a/a":
      return (c * c - b * b) / 4 / a / a;
    case "(b*b+c*c)/4/a/a":
      return (b * b + c * c) / 4 / a / a;
    case "(a*a-c*c)/4/b/b":
      return (a * a - c * c) / 4 / b / b;
    case "(c*c+a*a)/4/b/b":
      return (c * c + a * a) / 4 / b / b;
    case "a*a/2/c/c":
      return a * a / 2 / c / c;
    default:
      throw new Error(
        `Unknown expression, define a new case: '${expr}'`,
      );
  }
}

/** Wrap a cell in a Matrix to use matrix helpers. */
export function toMatrix(rows: number[][]): Matrix {
  return createMatrix(3, 3, rows.flat());
}

/** Row-vector times matrix: x_abs[i] = v . col_i(m). */
export function vecMulMat(v: number[], m: number[][]): number[] {
  return [
    v[0] * m[0][0] + v[1] * m[1][0] + v[2] * m[2][0],
    v[0] * m[0][1] + v[1] * m[1][1] + v[2] * m[2][1],
    v[0] * m[0][2] + v[1] * m[1][2] + v[2] * m[2][2],
  ];
}
