import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { lengths } from "@/core/lattice/lengths";

describe("lengths", () => {
  it("returns correct orthogonal lengths", () => {
    const l = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 2, 0, 0, 0, 3]),
    };

    expect(lengths(l)).toEqual([1, 2, 3]);
  });
});
