import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { reshape } from "@/core/matrix/operations/reshape";

describe("reshape", () => {
  it("reshapes square matrix without changing data", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    const r = reshape(m, 1, 4);

    expect(r.rows).toBe(1);
    expect(r.cols).toBe(4);
    expect([...r.data]).toEqual([1, 2, 3, 4]);
  });

  it("reshapes into square form", () => {
    const m = createMatrix(1, 4, [1, 2, 3, 4]);

    const r = reshape(m, 2, 2);

    expect(r.rows).toBe(2);
    expect(r.cols).toBe(2);
    expect([...r.data]).toEqual([1, 2, 3, 4]);
  });

  it("preserves identity matrix structure after reshape", () => {
    const m = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const r = reshape(m, 1, 9);

    expect(r.rows).toBe(1);
    expect(r.cols).toBe(9);
    expect([...r.data]).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("returns a copy of the data (not a shared view)", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    const r = reshape(m, 4, 1);

    expect([...r.data]).toEqual([1, 2, 3, 4]);
    expect(r.data).not.toBe(m.data);
  });

  it("does not mutate original matrix metadata", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    reshape(m, 1, 4);

    expect(m.rows).toBe(2);
    expect(m.cols).toBe(2);
  });

  it("throws when total size does not match (too few elements)", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(() => reshape(m, 3, 3)).toThrow();
  });

  it("throws when total size does not match (too many elements)", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(() => reshape(m, 2, 2)).toThrow();
  });

  it("handles reshape to 1xN correctly", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const r = reshape(m, 1, 6);

    expect(r.rows).toBe(1);
    expect(r.cols).toBe(6);
    expect([...r.data]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("handles reshape to Nx1 correctly", () => {
    const m = createMatrix(1, 4, [1, 2, 3, 4]);

    const r = reshape(m, 4, 1);

    expect(r.rows).toBe(4);
    expect(r.cols).toBe(1);
    expect([...r.data]).toEqual([1, 2, 3, 4]);
  });

  it("handles large rectangular reshape", () => {
    const data = Array.from({ length: 12 }, (_, i) => i + 1);
    const m = createMatrix(3, 4, data);

    const r = reshape(m, 4, 3);

    expect(r.rows).toBe(4);
    expect(r.cols).toBe(3);
    expect([...r.data]).toEqual(data);
  });
});
