import { describe, it, expect } from "vitest";
import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";
import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import {
  mc3d_10007,
  mc3d_1011,
  diamondCPOSCAR,
  layeredStructure,
} from "../teststrings/spglibPoscar";

import { supercell } from "@/core/structure/operations/supercell";

describe("supercell", () => {
  it("creates 2x2x2 expansion", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    const sc = supercell(s, [2, 2, 2]);

    expect(sc.sites.length).toBe(s.sites.length * 8);

    expect(sc.lattice.basis.data[0]).toBeCloseTo(s.lattice.basis.data[0] * 2);

    expect(sc.lattice.basis.data[4]).toBeCloseTo(s.lattice.basis.data[4] * 2);

    expect(sc.lattice.basis.data[8]).toBeCloseTo(s.lattice.basis.data[8] * 2);
  });

  it("creates 2x2x2 expansion", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    const sc = supercell(s, 4);

    expect(sc.sites.length).toBe(s.sites.length * 64);

    expect(sc.lattice.basis.data[0]).toBeCloseTo(s.lattice.basis.data[0] * 4);

    expect(sc.lattice.basis.data[4]).toBeCloseTo(s.lattice.basis.data[4] * 4);

    expect(sc.lattice.basis.data[8]).toBeCloseTo(s.lattice.basis.data[8] * 4);
  });
});
