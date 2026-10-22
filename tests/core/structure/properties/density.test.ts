import { describe, expect, it } from "vitest";

import { density } from "@/core/structure/properties/density";

import {
  poSC,
  graphite,
  siDiamond,
  srTiO3,
  zrO2Baddeleyite,
  h2oBox,
} from "../../../fixtures/structures";

// density() is cell mass / volume in amu/Å^3.
describe("density", () => {
  it("simple cubic Po", () => {
    expect(density(poSC)).toBeCloseTo(209 / 3.359 ** 3, 10);
  });

  it("diamond Si", () => {
    expect(density(siDiamond)).toBeCloseTo((8 * 28.0855) / 5.431 ** 3, 10);
  });

  it("hexagonal graphite", () => {
    expect(density(graphite)).toBeCloseTo(1.3371953566, 8);
  });

  it("perovskite SrTiO3", () => {
    expect(density(srTiO3)).toBeCloseTo(183.4852 / 3.905 ** 3, 8);
  });

  it("monoclinic ZrO2", () => {
    expect(density(zrO2Baddeleyite)).toBeCloseTo(3.4986396833, 8);
  });

  it("molecule in vacuum", () => {
    expect(density(h2oBox)).toBeCloseTo(18.01528 / 1000, 10);
  });
});
