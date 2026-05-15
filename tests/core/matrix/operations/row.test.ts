import { describe, expect, it } from "vitest";

import { createMatrix } from "../../../../lib/core/matrix/matrix";
import { row } from "../../../../lib/core/matrix/operations/row";

describe("row", () => {
  it("extracts rows correctly", () => {
    const m = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(Array.from(row(m, 0))).toEqual([1, 2, 3]);
    expect(Array.from(row(m, 1))).toEqual([4, 5, 6]);
    expect(Array.from(row(m, 2))).toEqual([7, 8, 9]);
  });

  it("works for rectangular matrices", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(Array.from(row(m, 0))).toEqual([1, 2, 3]);
    expect(Array.from(row(m, 1))).toEqual([4, 5, 6]);
  });

  it("handles 1xN matrices", () => {
    const m = createMatrix(1, 4, [1, 2, 3, 4]);

    expect(Array.from(row(m, 0))).toEqual([1, 2, 3, 4]);
  });

  it("does not mutate matrix data", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);
    const original = Array.from(m.data);

    row(m, 0);

    expect(Array.from(m.data)).toEqual(original);
  });

  it("returns correct length", () => {
    const m = createMatrix(
      3,
      5,
      Array.from({ length: 15 }, (_, i) => i),
    );

    const r = row(m, 1);

    expect(r.length).toBe(5);
  });
});
