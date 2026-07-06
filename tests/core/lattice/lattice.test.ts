import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";

describe("createLattice", () => {
  it("creates a valid 3x3 lattice from flat array", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    expect(lattice.basis.rows).toBe(3);
    expect(lattice.basis.cols).toBe(3);
    expect(Array.from(lattice.basis.data)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("throws on invalid size (not 9 elements)", () => {
    expect(() => createLattice([1, 0, 0, 0, 1, 0])).toThrow();
  });

  it("preserves column-major basis interpretation", () => {
    const lattice = createLattice([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const d = lattice.basis.data;

    // column 1
    expect(d[0]).toBe(1);
    expect(d[1]).toBe(2);
    expect(d[2]).toBe(3);

    // column 2
    expect(d[3]).toBe(4);
    expect(d[4]).toBe(5);
    expect(d[5]).toBe(6);

    // column 3
    expect(d[6]).toBe(7);
    expect(d[7]).toBe(8);
    expect(d[8]).toBe(9);
  });

  it("does not mutate input array", () => {
    const input = [1, 0, 0, 0, 1, 0, 0, 0, 1];

    const copy = [...input];

    createLattice(input);

    expect(input).toEqual(copy);
  });

  it("produces consistent basis object reference", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    expect(lattice.basis).toBeDefined();
    expect(lattice.basis.data).toBeInstanceOf(Float64Array);
  });

  it("handles non-orthogonal lattice correctly", () => {
    const lattice = createLattice([1, 0, 0, 1, 1, 0, 0, 0, 1]);

    const d = lattice.basis.data;

    expect(d[1]).toBe(0);
    expect(d[3]).toBe(1);
    expect(d[4]).toBe(1);
  });

  it("rejects empty input", () => {
    expect(() => createLattice([])).toThrow();
  });
});
