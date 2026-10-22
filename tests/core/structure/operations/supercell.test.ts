import { describe, it, expect } from "vitest";

import { supercell } from "@/core/structure/operations/supercell";
import { createMatrix } from "@/core/matrix/matrix";
import { volume } from "@/core/structure/properties/volume";
import { density } from "@/core/structure/properties/density";

import {
  ALL_STRUCTURES,
  siDiamond,
  znOWurtzite,
} from "../../../fixtures/structures";

describe("supercell", () => {
  it("creates 2x2x2 expansion", () => {
    const sc = supercell(siDiamond, [2, 2, 2]);

    expect(sc.sites.length).toBe(64);
    expect(sc.lattice.basis.data[0]).toBeCloseTo(2 * 5.431);
    expect(sc.lattice.basis.data[4]).toBeCloseTo(2 * 5.431);
    expect(sc.lattice.basis.data[8]).toBeCloseTo(2 * 5.431);
  });

  it("creates 4x4x4 expansion with scalar argument", () => {
    const sc = supercell(siDiamond, 4);

    expect(sc.sites.length).toBe(512);
    expect(sc.lattice.basis.data[0]).toBeCloseTo(4 * 5.431);
    expect(sc.lattice.basis.data[4]).toBeCloseTo(4 * 5.431);
    expect(sc.lattice.basis.data[8]).toBeCloseTo(4 * 5.431);
  });

  it("builds the √3×√3 hexagonal supercell from a matrix", () => {
    const sc = supercell(znOWurtzite, createMatrix(3, 3, [2, 1, 0, -1, 1, 0, 0, 0, 1]));

    expect(sc.sites.length).toBe(12);
    expect(volume(sc)).toBeCloseTo(3 * volume(znOWurtzite), 8);
  });

  it.each(Object.entries(ALL_STRUCTURES))("preserves density: %s", (_, s) => {
    const sc = supercell(s, [2, 1, 3]);

    expect(sc.sites.length).toBe(6 * s.sites.length);
    expect(density(sc)).toBeCloseTo(density(s), 10);
  });
});
