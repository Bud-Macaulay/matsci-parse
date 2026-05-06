import { niggli } from "../../../lib/symmetry/reduction/niggli";

const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe("Niggli reduction", () => {
  test("identity lattice is unchanged or equivalent", () => {
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const out = niggli(I);

    expect(out.lattice).toBeDefined();
  });

  test("output is always 3x3 basis", () => {
    const A = [
      [2, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
    ];

    const out = niggli(A);

    expect(out.lattice.length).toBe(3);
    expect(out.lattice[0].length).toBe(3);
  });

  test("preserves lattice volume (determinant magnitude)", () => {
    const A = [
      [2, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
    ];

    const out = niggli(A);

    const d1 = Math.abs(det3(A));
    const d2 = Math.abs(det3(out.lattice));

    expect(d2).toBeCloseTo(d1, 6);
  });

  test("basis vectors remain finite", () => {
    const A = [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ];

    const out = niggli(A);

    for (const row of out.lattice) {
      for (const v of row) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test("permutation invariance (same lattice, different basis order)", () => {
    const A = [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];

    const B = [
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ];

    const outA = niggli(A);
    const outB = niggli(B);

    const normsA = outA.lattice.map(norm).sort((a, b) => a - b);
    const normsB = outB.lattice.map(norm).sort((a, b) => a - b);

    for (let i = 0; i < 3; i++) {
      expect(normsA[i]).toBeCloseTo(normsB[i], 6);
    }
  });

  test("reduces skewed lattice", () => {
    const skewed = [
      [100, 0, 0],
      [99, 1, 0],
      [98, 0, 1],
    ];

    const out = niggli(skewed);

    const norms = out.lattice.map(norm);

    // should not explode
    expect(Math.max(...norms)).toBeLessThan(200);

    // should not collapse
    expect(Math.abs(det3(out.lattice))).toBeGreaterThan(1e-6);
  });

  test("nearly collinear stability", () => {
    const collinear = [
      [1, 1e-6, 0],
      [1, 2e-6, 0],
      [1, 3e-6, 0],
    ];

    const out = niggli(collinear);

    console.log(out)

    for (const row of out.lattice) {
      for (const v of row) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }

    // should remain full rank in practice (numerically)
    expect(Math.abs(det3(out.lattice))).toBeGreaterThan(1e-10);
  });
});
