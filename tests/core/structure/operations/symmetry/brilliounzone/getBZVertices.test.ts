import { describe, expect, it } from "vitest";

import { generateBZVertices } from "@/core/structure/operations/symmetry/brilliounzone/generateBZVertices";

import {
  al2O3Corundum,
  cuFCCPrimitive,
  graphite,
  poSC,
  triclinicP1,
  uAlpha,
  znOWurtzite,
  zrO2Baddeleyite,
} from "../../../../../fixtures/structures";

// Wigner–Seitz cell of the reciprocal lattice of the cell as given
// (crystallographic convention, no 2π).
describe("generateBZVertices", () => {
  it("simple cubic: a cube with corners at ±1/(2a)", async () => {
    const vertices = await generateBZVertices(poSC);

    expect(vertices).toHaveLength(8);
    for (const v of vertices) {
      for (const x of v) expect(Math.abs(x)).toBeCloseTo(1 / (2 * 3.359), 10);
    }
  });

  it.each([
    ["orthorhombic cell: box", uAlpha, 8],
    ["fcc primitive: truncated octahedron", cuFCCPrimitive, 24],
    ["rhombohedral corundum", al2O3Corundum, 24],
    ["general triclinic", triclinicP1, 24],
    ["hexagonal graphite: hexagonal prism", graphite, 12],
    ["monoclinic ZrO2", zrO2Baddeleyite, 12],
  ] as const)("%s", async (_, s, n) => {
    expect(await generateBZVertices(s)).toHaveLength(n);
  });

  // Known bug: isInside() uses a zero tolerance, so vertices lying exactly on
  // a bounding plane are dropped by rounding; wurtzite (same lattice type as
  // graphite) loses all 12.
  it.fails("hexagonal wurtzite: hexagonal prism", async () => {
    expect(await generateBZVertices(znOWurtzite)).toHaveLength(12);
  });
});
