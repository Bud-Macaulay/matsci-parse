import { describe, it, expect } from "vitest";
import { fromPOSCAR } from "@/core/io/poscar";

import { volume } from "@/core/structure/properties/volume";
import { volume as latticeVolume } from "@/core/lattice/volume";

import { diamondCPOSCAR, layeredStructure } from "../teststrings/spglibPoscar";

// Simple delegation check
describe("structure volume", () => {
  it("matches lattice volume for diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(volume(s)).toBeCloseTo(latticeVolume(s.lattice));
  });

  it("matches lattice volume for layered structure", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(volume(s)).toBeCloseTo(latticeVolume(s.lattice));
  });
});
