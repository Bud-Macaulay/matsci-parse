import { describe, it, expect } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import {
  cellParams,
  evalExpr,
  evalExprSimple,
  extendKparam,
  getPmatrix,
  getPrimitive,
  getRealCellFromReciprocalRows,
  getReciprocalCellRows,
  matrixFromRowMajor,
  toMatrix,
} from "@/core/structure/operations/symmetry/brilliounzone/seekpathTools";

const eps = 1e-12;

function expectMatrixClose(actual: Float64Array, expected: number[], e = eps) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(e);
  }
}

function matmul(a: number[][], b: number[][]): number[][] {
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

describe("matrixFromRowMajor", () => {
  it("builds a 3x3 matrix from 9 values", () => {
    const m = matrixFromRowMajor([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(m.rows).toBe(3);
    expect(m.cols).toBe(3);
    expect(Array.from(m.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("rejects a wrong number of values", () => {
    expect(() => matrixFromRowMajor([1, 2, 3])).toThrow();
  });
});

describe("cellParams", () => {
  it("returns orthogonal angles for an orthorhombic cell", () => {
    const m = toMatrix([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ]);
    const [a, b, c, ca, cb, cg] = cellParams(m);
    expect([a, b, c]).toEqual([2, 3, 4]);
    expect([ca, cb, cg]).toEqual([0, 0, 0]);
  });

  it("returns the correct cosines for a monoclinic cell (beta=105deg)", () => {
    // b along y, a along x, c in the x-z plane with beta=105deg
    const beta = (105 * Math.PI) / 180;
    const m = toMatrix([
      [4, 0, 0],
      [0, 5, 0],
      [6 * Math.cos(beta), 0, 6 * Math.sin(beta)],
    ]);
    const [a, b, c, ca, cb, cg] = cellParams(m);
    expect(Math.abs(a - 4)).toBeLessThan(eps);
    expect(Math.abs(b - 5)).toBeLessThan(eps);
    expect(Math.abs(c - 6)).toBeLessThan(eps);
    expect(ca).toBeLessThan(eps);
    expect(Math.abs(cb - Math.cos(beta))).toBeLessThan(eps);
    expect(cg).toBeLessThan(eps);
  });
});

describe("reciprocal cell roundtrip", () => {
  const real = toMatrix([
    [4, 0.5, 0],
    [0, 5, 0.5],
    [0.5, 0, 6],
  ]);

  it("dot(real, recip.T) = 2π I", () => {
    const recip = getReciprocalCellRows(real);
    const r = rows(real);
    const q = rows(recip);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let dot = 0;
        for (let k = 0; k < 3; k++) dot += r[i][k] * q[j][k];
        const expected = i === j ? 2 * Math.PI : 0;
        expect(Math.abs(dot - expected)).toBeLessThan(1e-10);
      }
    }
  });

  it("recovers the real cell from the reciprocal rows", () => {
    const recip = getReciprocalCellRows(real);
    const real2 = getRealCellFromReciprocalRows(recip);
    expectMatrixClose(real2.data, Array.from(real.data));
  });

  it("reciprocal of an orthorhombic cell is diagonal", () => {
    const ortho = toMatrix([
      [4, 0, 0],
      [0, 5, 0],
      [0, 0, 6],
    ]);
    const recip = getReciprocalCellRows(ortho);
    const expected = [
      Math.PI / 2,
      0,
      0,
      0,
      (2 * Math.PI) / 5,
      0,
      0,
      0,
      Math.PI / 3,
    ];
    expectMatrixClose(recip.data, expected);
  });
});

function rows(m: { rows: number; cols: number; data: Float64Array }): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < m.rows; i++) {
    out.push(Array.from(m.data.slice(i * m.cols, (i + 1) * m.cols)));
  }
  return out;
}

describe("getPmatrix", () => {
  const primitive: Record<string, number> = {
    cP: 1,
    tP: 1,
    hP: 1,
    oP: 1,
    mP: 1,
    aP: 1,
    cF: 4,
    oF: 4,
    cI: 2,
    tI: 2,
    oI: 2,
    hR: 3,
    oC: 2,
    oA: 2,
    mC: 2,
  };

  it.each(Object.keys(primitive))("P @ invP = I for %s", (bL) => {
    const { P, invP } = getPmatrix(bL);
    const prod = matmul(P, invP);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const expected = i === j ? 1 : 0;
        expect(Math.abs(prod[i][j] - expected)).toBeLessThan(1e-12);
      }
    }
  });

  it.each(Object.entries(primitive))(
    "det(invP) gives the correct primitive:conv volume ratio for %s",
    (bL, ratio) => {
      const { invP } = getPmatrix(bL);
      const det =
        invP[0][0] * (invP[1][1] * invP[2][2] - invP[1][2] * invP[2][1]) -
        invP[0][1] * (invP[1][0] * invP[2][2] - invP[1][2] * invP[2][0]) +
        invP[0][2] * (invP[1][0] * invP[2][1] - invP[1][1] * invP[2][0]);
      expect(Math.abs(Math.abs(det) - Number(ratio))).toBeLessThan(1e-12);
    },
  );

  it("uses the exact HPKOT cF / hR matrices", () => {
    const cF = getPmatrix("cF");
    expect(cF.P).toEqual([
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [0.5, 0.5, 0],
    ]);
    expect(cF.invP).toEqual([
      [-1, 1, 1],
      [1, -1, 1],
      [1, 1, -1],
    ]);

    const hR = getPmatrix("hR");
    expect(hR.P).toEqual([
      [2 / 3, -1 / 3, -1 / 3],
      [1 / 3, 1 / 3, -2 / 3],
      [1 / 3, 1 / 3, 1 / 3],
    ]);
    expect(hR.invP).toEqual([
      [1, 0, 1],
      [-1, 1, 1],
      [0, -1, 1],
    ]);
  });

  it("throws for an unknown lattice", () => {
    expect(() => getPmatrix("xx")).toThrow(/Invalid bravais_lattice/);
  });
});

describe("getPrimitive", () => {
  it("returns the cell unchanged for a primitive P lattice", () => {
    const lattice = [
      [4, 0, 0],
      [0, 5, 0],
      [0, 0, 6],
    ];
    const positions = [
      [0, 0, 0],
      [0.3, 0.3, 0.3],
    ];
    const types = [0, 1];
    const res = getPrimitive(lattice, positions, types, "oP");
    expect(res.lattice).toEqual(lattice);
    expect(res.positions).toEqual(positions);
    expect(res.types).toEqual(types);
    expect(res.mapping).toEqual([0, 1]);
  });

  it("reduces an fcc conventional cell to one primitive atom", () => {
    const a = 5;
    const lattice = [
      [a, 0, 0],
      [0, a, 0],
      [0, 0, a],
    ];
    const positions = [
      [0, 0, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [0.5, 0.5, 0],
    ];
    const types = [0, 0, 0, 0];
    const res = getPrimitive(lattice, positions, types, "cF");
    expect(res.positions).toEqual([[0, 0, 0]]);
    expect(res.types).toEqual([0]);
    expect(res.mapping).toEqual([0, 0, 0, 0]);
    // (a_P, b_P, c_P) = (a, b, c) P with P = 1/2[[0,1,1],[1,0,1],[1,1,0]]
    expect(res.lattice).toEqual([
      [0, 2.5, 2.5],
      [2.5, 0, 2.5],
      [2.5, 2.5, 0],
    ]);
  });

  it("reduces a body-centered cubic conventional cell to one primitive atom", () => {
    const a = 5;
    const lattice = [
      [a, 0, 0],
      [0, a, 0],
      [0, 0, a],
    ];
    const positions = [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
    ];
    const types = [0, 0];
    const res = getPrimitive(lattice, positions, types, "cI");
    expect(res.positions).toEqual([[0, 0, 0]]);
    expect(res.types).toEqual([0]);
    expect(res.mapping).toEqual([0, 0]);
  });

  it("reduces an oC cell with a C-face center", () => {
    const lattice = [
      [4, 0, 0],
      [0, 6, 0],
      [0, 0, 7],
    ];
    const positions = [
      [0, 0, 0],
      [0.5, 0.5, 0],
    ];
    const types = [0, 0];
    const res = getPrimitive(lattice, positions, types, "oC");
    expect(res.positions).toEqual([[0, 0, 0]]);
    expect(res.mapping).toEqual([0, 0]);
  });

  it("keeps distinct species in separate primitive atoms", () => {
    const lattice = [
      [4, 0, 0],
      [0, 6, 0],
      [0, 0, 7],
    ];
    const positions = [
      [0, 0, 0],
      [0.5, 0.5, 0],
    ];
    const types = [0, 1];
    expect(() => getPrimitive(lattice, positions, types, "oC")).toThrow(
      /different type/,
    );
  });

  it("throws if the group size does not match the volume ratio", () => {
    const lattice = [
      [4, 0, 0],
      [0, 6, 0],
      [0, 0, 7],
    ];
    const positions = [[0, 0, 0]];
    const types = [0];
    expect(() => getPrimitive(lattice, positions, types, "oC")).toThrow(
      /Problem creating primitive cell/,
    );
  });
});

describe("evalExprSimple", () => {
  it("evaluates known fractions", () => {
    expect(evalExprSimple("0", {})).toBe(0);
    expect(evalExprSimple("1/2", {})).toBe(0.5);
    expect(evalExprSimple("-1/2", {})).toBe(-0.5);
    expect(evalExprSimple("1/4", {})).toBe(0.25);
    expect(evalExprSimple("3/8", {})).toBe(0.375);
    expect(evalExprSimple("3/4", {})).toBe(0.75);
    expect(evalExprSimple("5/8", {})).toBe(0.625);
    expect(evalExprSimple("1/3", {})).toBe(1 / 3);
    expect(evalExprSimple("1", {})).toBe(1);
  });

  it("looks up precomputed k-parameters", () => {
    expect(evalExprSimple("Z", { Z: 0.25 })).toBe(0.25);
  });

  it("throws for an unknown symbol", () => {
    expect(() => evalExprSimple("NOPE", {})).toThrow(/has not been defined/);
  });
});

describe("extendKparam", () => {
  it("derives the extended set", () => {
    const ext = extendKparam({ Z: 0.25 });
    expect(ext.Z).toBe(0.25);
    expect(ext["-Z"]).toBe(-0.25);
    expect(ext["1-Z"]).toBe(0.75);
    expect(ext["-1+Z"]).toBe(-0.75);
    expect(ext["1/2-Z"]).toBe(0.25);
    expect(ext["1/2+Z"]).toBe(0.75);
  });
});

describe("evalExpr", () => {
  it("evaluates cell-parameter-only expressions", () => {
    // (1 + a^2/b^2)/4 with a=2, b=4
    expect(evalExpr("(1+a*a/b/b)/4", 2, 4, 6, 0, 0, 0, {})).toBeCloseTo(
      0.3125,
      12,
    );
    // a^2/4/c^2 with a=4, c=8
    expect(evalExpr("a*a/4/c/c", 4, 5, 8, 0, 0, 0, {})).toBeCloseTo(0.0625, 12);
  });

  it("evaluates expressions that depend on other k-parameters", () => {
    // 1 - Z*b^2/a^2 with Z=0.5, a=4, b=2
    expect(evalExpr("1-Z*b*b/a/a", 4, 2, 6, 0, 0, 0, { Z: 0.5 })).toBeCloseTo(
      0.875,
      12,
    );
    // 2*F-Z with F=0.2, Z=0.1
    expect(evalExpr("2*F-Z", 4, 4, 4, 0, 0, 0, { F: 0.2, Z: 0.1 })).toBeCloseTo(
      0.3,
      12,
    );
  });

  it("throws for unknown expressions and missing k-parameters", () => {
    expect(() => evalExpr("bogus", 1, 1, 1, 0, 0, 0, {})).toThrow(
      /Unknown expression/,
    );
    expect(() => evalExpr("1-Z*b*b/a/a", 4, 2, 6, 0, 0, 0, {})).toThrow(
      /has not been defined/,
    );
  });
});
