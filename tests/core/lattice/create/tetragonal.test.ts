import { describe, it, expect } from "vitest";
import { tetragonal } from "@/core/lattice/create/tetragonal";

describe("tetragonal", () => {
  it("enforces a=b symmetry", () => {
    const l = tetragonal(2, 5);

    expect(l.basis.data[0]).toBe(2);
    expect(l.basis.data[4]).toBe(2);
    expect(l.basis.data[8]).toBe(5);
  });
});
