import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { pow } from "@/core/matrix/operations/pow";
import { expectIdentity } from "../../../helpers/matrix";

describe("pow", () => {
  it("A^0 = I", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const result = pow(A, 0);

    expectIdentity(result);
  });

  it("A^1 = A", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const result = pow(A, 1);

    expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
  });

  it("A^2 = AA for 2x2", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const result = pow(A, 2);

    // [1 2; 3 4]^2 = [7 10; 15 22]
    expect(result.data[0]).toBeCloseTo(7);
    expect(result.data[1]).toBeCloseTo(10);
    expect(result.data[2]).toBeCloseTo(15);
    expect(result.data[3]).toBeCloseTo(22);
  });

  it("A^3 = A^2 A for 2x2", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const result = pow(A, 3);

    // [1 2; 3 4]^3 = [37 54; 81 118]
    expect(result.data[0]).toBeCloseTo(37);
    expect(result.data[1]).toBeCloseTo(54);
    expect(result.data[2]).toBeCloseTo(81);
    expect(result.data[3]).toBeCloseTo(118);
  });

  it("A^4 using squaring matches A^2 A^2", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const A2 = pow(A, 2);
    const A4 = pow(A, 4);

    // A4 should equal A2 * A2
    const expected = [7, 10, 15, 22];
    // [7 10; 15 22]^2 = [7*7+10*15, 7*10+10*22; 15*7+22*15, 15*10+22*22]
    // = [49+150, 70+220; 105+330, 150+484]
    // = [199, 290; 435, 634]
    expect(A4.data[0]).toBeCloseTo(199);
    expect(A4.data[1]).toBeCloseTo(290);
    expect(A4.data[2]).toBeCloseTo(435);
    expect(A4.data[3]).toBeCloseTo(634);
  });

  it("I^n = I", () => {
    const I = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    for (const p of [0, 1, 2, 5, 10]) {
      expectIdentity(pow(I, p));
    }
  });

  it("diagonal matrix power = diag(dᵢⁿ)", () => {
    const D = createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]);
    const D3 = pow(D, 3);

    expect(D3.data[0]).toBeCloseTo(8);
    expect(D3.data[4]).toBeCloseTo(27);
    expect(D3.data[8]).toBeCloseTo(64);
  });

  it("A^p A^q = A^(p+q)", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const A2 = pow(A, 2);
    const A3 = pow(A, 3);
    const A5 = pow(A, 5);

    // A2 * A3 should equal A5
    const result = createMatrix(2, 2);
    const n = 2;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sum = 0;

        for (let k = 0; k < n; k++) {
          sum += A2.data[r * n + k] * A3.data[k * n + c];
        }

        result.data[r * n + c] = sum;
      }
    }

    for (let i = 0; i < 4; i++) {
      expect(result.data[i]).toBeCloseTo(A5.data[i], 10);
    }
  });

  it("does not mutate input matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    const original = Array.from(A.data);
    const _result = pow(A, 3);

    expect(Array.from(A.data)).toEqual(original);
  });

  it("throws on non-square matrix", () => {
    const A = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
    expect(() => pow(A, 2)).toThrow("square matrix");
  });

  it("throws on negative exponent", () => {
    const A = createMatrix(2, 2, [1, 0, 0, 1]);
    expect(() => pow(A, -1)).toThrow("non-negative");
  });

  it("throws on non-integer exponent", () => {
    const A = createMatrix(2, 2, [1, 0, 0, 1]);
    expect(() => pow(A, 1.5)).toThrow("non-negative");
  });
});
