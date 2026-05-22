import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { inverse2x2 } from "@/core/matrix/operations/inverse/inverse2x2";

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

describe("inverse2x2", () => {
  it("inverts identity", () => {
    const I = identity(2);
    const inv = inverse2x2(I);
    expectIdentity(inv);
  });

  it("inverts known matrix", () => {
    const A = createMatrix(2, 2, [4, 7, 2, 6]);
    const inv = inverse2x2(A);

    expect(inv.data[0]).toBeCloseTo(0.6);
    expect(inv.data[1]).toBeCloseTo(-0.7);
    expect(inv.data[2]).toBeCloseTo(-0.2);
    expect(inv.data[3]).toBeCloseTo(0.4);
  });

  it("verifies A⁻¹A = I", () => {
    const A = createMatrix(2, 2, [4, 7, 2, 6]);
    const inv = inverse2x2(A);

    const res = multiply(inv, A);
    expectIdentity(res);
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 2, 4]);
    expect(() => inverse2x2(A)).toThrow("Singular matrix");
  });
});
