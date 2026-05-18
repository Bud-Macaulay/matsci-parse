import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { volume } from "@/core/lattice/volume";

describe("volume", () => {
  it("computes unit cube volume", () => {
    const l = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    expect(volume(l)).toBe(1);
  });

  it("handles scaled lattice", () => {
    const l = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 2, 0, 0, 0, 2]),
    };

    expect(volume(l)).toBe(8);
  });
});

describe("volume (non-orthogonal)", () => {
  it("handles sheared lattice correctly", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    const sheared = {
      basis: createMatrix(3, 3, [1, 0, 0, 1, 1, 0, 0, 0, 1]),
    };

    expect(volume(lattice)).toBe(1);
    expect(volume(sheared)).toBe(1);
  });
});
