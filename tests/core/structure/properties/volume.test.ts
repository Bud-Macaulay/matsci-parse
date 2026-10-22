import { describe, it, expect } from "vitest";

import { volume } from "@/core/structure/properties/volume";
import { volume as latticeVolume } from "@/core/lattice/volume";

import {
  siDiamond,
  cuFCCPrimitive,
  znOWurtzite,
  zrO2Baddeleyite,
  triclinicP1,
} from "../../../fixtures/structures";

describe("structure volume", () => {
  it("is a^3 for cubic Si", () => {
    expect(volume(siDiamond)).toBeCloseTo(5.431 ** 3, 10);
  });

  it("is a^3/4 for the fcc primitive cell", () => {
    expect(volume(cuFCCPrimitive)).toBeCloseTo(3.615 ** 3 / 4, 10);
  });

  it("is (√3/2) a^2 c for hexagonal ZnO", () => {
    expect(volume(znOWurtzite)).toBeCloseTo((Math.sqrt(3) / 2) * 3.25 ** 2 * 5.207, 8);
  });

  it("is abc sin(β) for monoclinic ZrO2", () => {
    const beta = (99.23 * Math.PI) / 180;
    expect(volume(zrO2Baddeleyite)).toBeCloseTo(5.1505 * 5.2116 * 5.3173 * Math.sin(beta), 6);
  });

  it("is the triple product for a lower-triangular triclinic basis", () => {
    expect(volume(triclinicP1)).toBeCloseTo(4.1 * 3.8 * 5.2, 10);
  });

  // Simple delegation check
  it("matches lattice volume", () => {
    expect(volume(zrO2Baddeleyite)).toBe(latticeVolume(zrO2Baddeleyite.lattice));
  });
});
