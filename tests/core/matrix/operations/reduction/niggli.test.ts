import { describe, it, expect } from "vitest";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import { createMatrix } from "@/core/matrix/matrix";

function mat(flat: number[]): ReturnType<typeof createMatrix> {
  return createMatrix(3, 3, new Float64Array(flat));
}

function approx(a: number, b: number, eps = 1e-6) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

/** Determinant of a 3×3 matrix's flat data. */
function det3(d: Float64Array): number {
  return (
    d[0] * (d[4] * d[8] - d[5] * d[7]) -
    d[1] * (d[3] * d[8] - d[5] * d[6]) +
    d[2] * (d[3] * d[7] - d[4] * d[6])
  );
}

/** Rows (lattice vectors) of a flat 3×3 matrix as [v1,v2,v3]. */
function rows(d: Float64Array): number[][] {
  return [
    [d[0], d[1], d[2]],
    [d[3], d[4], d[5]],
    [d[6], d[7], d[8]],
  ];
}

describe("niggli", () => {
  it("throws on a non-3x3 matrix", () => {
    expect(() => niggli(createMatrix(2, 2, [1, 0, 0, 1]))).toThrow("3x3");
  });

  it("leaves a diagonal (already Niggli) basis unchanged", () => {
    const m = mat([2, 0, 0, 0, 3, 0, 0, 0, 4]);
    const res = niggli(m)!;
    for (let i = 0; i < 9; i++) approx(res.basis.data[i], m.data[i]);
  });

  it("reduction is row-unimodular: det(transform) = ±1", () => {
    const m = mat([4.5, 1.2, -0.8, 0.3, 3.7, 2.1, 1.0, -1.5, 5.2]);
    const res = niggli(m)!;
    const det = det3(res.transform.data);
    expect(Math.abs(Math.abs(det) - 1)).toBeLessThan(1e-6);
  });

  it("reduced = transform × original", () => {
    const m = mat([4.5, 1.2, -0.8, 0.3, 3.7, 2.1, 1.0, -1.5, 5.2]);
    const res = niggli(m)!;
    const r = res.basis.data;
    const u = res.transform.data;
    const o = m.data;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += u[i * 3 + k] * o[k * 3 + j];
        approx(r[i * 3 + j], s, 1e-8);
      }
  });

  it("preserves the lattice volume", () => {
    const m = mat([4.5, 1.2, -0.8, 0.3, 3.7, 2.1, 1.0, -1.5, 5.2]);
    const res = niggli(m)!;
    expect(Math.abs(Math.abs(det3(res.basis.data)) - Math.abs(det3(m.data)))).toBeLessThan(
      1e-6,
    );
  });

  it("is idempotent: reducing an already-reduced cell is a no-op", () => {
    const m = mat([4.5, 1.2, -0.8, 0.3, 3.7, 2.1, 1.0, -1.5, 5.2]);
    const first = niggli(m)!;
    const second = niggli(first.basis)!;
    for (let i = 0; i < 9; i++) {
      approx(second.basis.data[i], first.basis.data[i], 1e-6);
    }
  });

  it("satisfies the Niggli conditions on a generic triclinic cell", () => {
    const m = mat([4, 0, 0, 2, 4.34, 0, 1, 2, 5.7]);
    const res = niggli(m)!;
    const d = res.basis.data;
    const [a, b, c] = rows(d);
    const a2 = a[0] ** 2 + a[1] ** 2 + a[2] ** 2;
    const b2 = b[0] ** 2 + b[1] ** 2 + b[2] ** 2;
    const c2 = c[0] ** 2 + c[1] ** 2 + c[2] ** 2;
    const bc = b[0] * c[0] + b[1] * c[1] + b[2] * c[2];
    const ac = a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
    const ab = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    // Convention-1 Niggli conditions (absolute tolerances):
    expect(Math.abs(2 * bc)).toBeLessThanOrEqual(b2 + 1e-6);
    expect(Math.abs(2 * ac)).toBeLessThanOrEqual(a2 + 1e-6);
    expect(Math.abs(2 * ab)).toBeLessThanOrEqual(a2 + 1e-6);
    // A <= B <= C
    expect(a2).toBeLessThanOrEqual(b2 + 1e-6);
    expect(b2).toBeLessThanOrEqual(c2 + 1e-6);
  });
});
