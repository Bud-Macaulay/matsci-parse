import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { negate } from "@/core/matrix/operations/negate";

describe("negate", () => {
  it("negates matrix values", () => {
    const m = createMatrix(2, 2, [1, -2, 3, -4]);

    const r = negate(m);

    expect(Array.from(r.data)).toEqual([-1, 2, -3, 4]);
  });

  it("negates a zero matrix", () => {
    const m = createMatrix(2, 3, [0, 0, 0, 0, 0, 0]);

    const r = negate(m);

    expect(Array.from(r.data)).toEqual([-0, -0, -0, -0, -0, -0]);
  });

  it("negates a 1x1 matrix", () => {
    const m = createMatrix(1, 1, [5]);

    const r = negate(m);

    expect(Array.from(r.data)).toEqual([-5]);
  });

  it("negates a rectangular matrix", () => {
    const m = createMatrix(2, 3, [1, -2, 3, -4, 5, -6]);

    const r = negate(m);

    expect(r.rows).toBe(2);
    expect(r.cols).toBe(3);
    expect(Array.from(r.data)).toEqual([-1, 2, -3, 4, -5, 6]);
  });

  it("does not mutate the original matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    negate(m);

    expect(Array.from(m.data)).toEqual([1, 2, 3, 4]);
  });
});
