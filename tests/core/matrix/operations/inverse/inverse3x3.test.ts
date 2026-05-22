import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";

function expectIdentity(m: ReturnType<typeof createMatrix>) {
  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = m.data[r * n + c];
      expect(v).toBeCloseTo(r === c ? 1 : 0);
    }
  }
}

function multiply(A: any, B: any) {
  const n = A.rows;
  const out = createMatrix(n, n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A.data[r * n + k] * B.data[k * n + c];
      }
      out.data[r * n + c] = sum;
    }
  }

  return out;
}

describe("inverse3x3", () => {
  it("inverts identity", () => {
    const I = identity(3);
    const inv = inverse3x3(I);
    expectIdentity(inv);
  });

  it("inverts known matrix", () => {
    const A = createMatrix(3, 3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);

    const inv = inverse3x3(A);
    const res = multiply(inv, A);

    expectIdentity(res);
  });

  it("handles negative values", () => {
    const A = createMatrix(3, 3, [-1, 2, 3, 0, -1, 4, 5, 6, 0]);

    const inv = inverse3x3(A);
    const res = multiply(inv, A);

    expectIdentity(res);
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 7, 8, 9]);

    expect(() => inverse3x3(A)).toThrow("Singular matrix");
  });
});
