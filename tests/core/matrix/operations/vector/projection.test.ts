import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { projection } from "@/core/matrix/operations/vector/projection";

describe("projection", () => {
  it("projects onto same direction", () => {
    const a = createMatrix(2, 1, [2, 0]);
    const b = createMatrix(2, 1, [1, 0]);

    const r = projection(a, b);

    expect(Array.from(r.data)).toEqual([2, 0]);
  });

  it("projects orthogonal vectors to zero", () => {
    const a = createMatrix(2, 1, [1, 0]);
    const b = createMatrix(2, 1, [0, 1]);

    const r = projection(a, b);

    expect(Array.from(r.data)).toEqual([0, 0]);
  });

  it("handles general projection", () => {
    const a = createMatrix(2, 1, [3, 4]);
    const b = createMatrix(2, 1, [1, 0]);

    const r = projection(a, b);

    expect(Array.from(r.data)).toEqual([3, 0]);
  });

  it("throws on zero vector", () => {
    const a = createMatrix(2, 1, [1, 2]);
    const b = createMatrix(2, 1, [0, 0]);

    expect(() => projection(a, b)).toThrow();
  });
});
