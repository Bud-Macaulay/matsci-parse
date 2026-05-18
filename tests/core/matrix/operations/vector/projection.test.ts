import { describe, expect, it } from "vitest";
import { projection } from "@/core/matrix/operations/vector/projection";

describe("projection (vector)", () => {
  it("projects onto same direction", () => {
    const a = new Float64Array([2, 0]);
    const b = new Float64Array([1, 0]);

    const r = projection(a, b);

    expect(Array.from(r)).toEqual([2, 0]);
  });

  it("projects orthogonal vectors to zero", () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([0, 1]);

    const r = projection(a, b);

    expect(Array.from(r)).toEqual([0, 0]);
  });

  it("handles general projection", () => {
    const a = new Float64Array([3, 4]);
    const b = new Float64Array([1, 0]);

    const r = projection(a, b);

    expect(Array.from(r)).toEqual([3, 0]);
  });

  it("throws on zero vector", () => {
    const a = new Float64Array([1, 2]);
    const b = new Float64Array([0, 0]);

    expect(() => projection(a, b)).toThrow();
  });
});
