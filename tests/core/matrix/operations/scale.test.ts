import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { scale } from "@/core/matrix/operations/scale";

describe("scale", () => {
  it("scales matrix by scalar", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    const r = scale(m, 2);

    expect(Array.from(r.data)).toEqual([2, 4, 6, 8]);
  });

  it("scales by zero", () => {
    const m = createMatrix(2, 2, [1, -2, 3, -4]);

    const r = scale(m, 0);

    expect(Array.from(r.data).map((v) => (Object.is(v, -0) ? 0 : v))).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("does not mutate input", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    scale(m, 3);

    expect(Array.from(m.data)).toEqual([1, 2, 3, 4]);
  });
});
