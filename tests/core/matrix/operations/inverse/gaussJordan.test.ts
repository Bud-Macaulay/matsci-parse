import { describe, expect, it } from "vitest";

import { createMatrix, identity } from "@/core/matrix/matrix";
import { gjInverse } from "@/core/matrix/operations/inverse/gaussJordan";

function expectIdentity(m: ReturnType<typeof createMatrix>) {
  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = m.data[r * n + c];
      if (r === c) {
        expect(val).toBeCloseTo(1);
      } else {
        expect(val).toBeCloseTo(0);
      }
    }
  }
}

describe("gjInverse", () => {
  it("inverts identity matrix", () => {
    const I = identity(3);

    const inv = gjInverse(I);

    expectIdentity(inv);
  });

  it("throws when matrix is not square", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(() => gjInverse(m)).toThrow();
  });

  it("inverts a simple 2x2 matrix", () => {
    const A = createMatrix(2, 2, [4, 7, 2, 6]);

    const inv = gjInverse(A);

    // known result:
    // [ 0.6  -0.7 ]
    // [ -0.2  0.4 ]

    expect(inv.data[0]).toBeCloseTo(0.6);
    expect(inv.data[1]).toBeCloseTo(-0.7);
    expect(inv.data[2]).toBeCloseTo(-0.2);
    expect(inv.data[3]).toBeCloseTo(0.4);
  });

  it("satisfies A⁻¹A = I", () => {
    const A = createMatrix(3, 3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);

    const inv = gjInverse(A);

    const n = A.rows;
    const result = createMatrix(n, n);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sum = 0;

        for (let k = 0; k < n; k++) {
          sum += A.data[r * n + k] * inv.data[k * n + c];
        }

        result.data[r * n + c] = sum;
      }
    }

    // check identity
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const expected = r === c ? 1 : 0;
        expect(result.data[r * n + c]).toBeCloseTo(expected);
      }
    }
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 2, 4]);

    expect(() => gjInverse(A)).toThrow();
  });

  it("does not mutate input matrix", () => {
    const A = createMatrix(2, 2, [4, 7, 2, 6]);

    const copy = Array.from(A.data);

    gjInverse(A);

    expect(Array.from(A.data)).toEqual(copy);
  });
});
