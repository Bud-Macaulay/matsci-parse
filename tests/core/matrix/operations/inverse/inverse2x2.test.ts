import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { inverse2x2 } from "@/core/matrix/operations/inverse/inverse2x2";
import { expectIdentity, multiplyMatrices } from "../../../../helpers/matrix";

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

    const res = multiplyMatrices(inv, A);
    expectIdentity(res);
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 2, 4]);
    expect(() => inverse2x2(A)).toThrow("Singular matrix");
  });

  it("throws on non-2x2 matrix", () => {
    const A = createMatrix(3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(() => inverse2x2(A)).toThrow();
  });
});
