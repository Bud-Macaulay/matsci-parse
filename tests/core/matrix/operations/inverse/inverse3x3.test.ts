import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { expectIdentity, multiplyMatrices } from "../../../../helpers/matrix";

describe("inverse3x3", () => {
  it("inverts identity", () => {
    const I = identity(3);
    const inv = inverse3x3(I);
    expectIdentity(inv);
  });

  it("inverts known matrix", () => {
    const A = createMatrix(3, 3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);

    const inv = inverse3x3(A);
    const res = multiplyMatrices(inv, A);

    expectIdentity(res);
  });

  it("handles negative values", () => {
    const A = createMatrix(3, 3, [-1, 2, 3, 0, -1, 4, 5, 6, 0]);

    const inv = inverse3x3(A);
    const res = multiplyMatrices(inv, A);

    expectIdentity(res);
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 7, 8, 9]);

    expect(() => inverse3x3(A)).toThrow("Singular matrix");
  });

  it("throws on non-3x3 matrix", () => {
    const A = createMatrix(3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(() => inverse3x3(A)).toThrow();
  });
});
