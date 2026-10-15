import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { determinant } from "@/core/matrix/operations/determinant";
import {
  hermiteNormalForm,
  hermiteNormalForms,
} from "@/core/matrix/operations/hermiteNormalForm";

const key = (m: { data: Float64Array }) => Array.from(m.data).join(",");

describe("hermiteNormalForms", () => {
  it("counts every superlattice of index n (OEIS A001001)", () => {
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (n) => hermiteNormalForms(n).length,
    );
    expect(counts).toEqual([1, 7, 13, 35, 31, 91, 57, 155, 130, 217]);
  });

  it("returns distinct matrices that are already in normal form", () => {
    for (const n of [4, 6, 8]) {
      const all = hermiteNormalForms(n);
      expect(new Set(all.map(key)).size).toBe(all.length);
      for (const H of all) {
        expect(Math.round(determinant(H))).toBe(n);
        expect(key(hermiteNormalForm(H))).toBe(key(H));
      }
    }
  });

  it("rejects non-positive sizes", () => {
    expect(() => hermiteNormalForms(0)).toThrow();
    expect(() => hermiteNormalForms(1.5)).toThrow();
  });
});

describe("hermiteNormalForm", () => {
  it("is invariant under unimodular row operations (same lattice)", () => {
    const unimodular = [
      [0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 2, 0, 0, 1, 0, 0, 0, 1],
      [2, 1, 1, 1, 1, 0, 1, 0, 0],
      [-1, 0, 0, 3, 1, 0, -2, 5, 1],
    ].map((u) => createMatrix(3, 3, u));
    for (const H of hermiteNormalForms(6)) {
      for (const U of unimodular) {
        expect(key(hermiteNormalForm(mul(U, H)))).toBe(key(H));
      }
    }
  });

  it("reduces a sheared supercell to the canonical lower-triangular form", () => {
    const H = hermiteNormalForm(createMatrix(3, 3, [1, 1, 0, -1, 1, 0, 0, 0, 2]));
    expect(Array.from(H.data)).toEqual([2, 0, 0, 1, 1, 0, 0, 0, 2]);
  });

  it("throws on singular input", () => {
    expect(() =>
      hermiteNormalForm(createMatrix(3, 3, [1, 0, 0, 2, 0, 0, 0, 0, 1])),
    ).toThrow(/singular/);
  });
});
