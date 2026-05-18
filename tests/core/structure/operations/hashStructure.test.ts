import { describe, it, expect } from "vitest";
import { hashStructure } from "@/core/structure/operations/hashStructure";
import { createLattice } from "@/core/lattice/lattice";

describe("hashStructure", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  it("is stable for equivalent structures", () => {
    const a = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.1, 0.2, 0.3]) },
      ],
    };

    const b = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([1.1, 1.2, 1.3]) },
      ],
    };

    expect(hashStructure(a)).toBe(hashStructure(b));
  });

  it("changes when structure changes", () => {
    const a = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.1, 0.2, 0.3]) },
      ],
    };

    const b = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.1, 0.2, 0.31]) },
      ],
    };

    expect(hashStructure(a)).not.toBe(hashStructure(b));
  });
});
