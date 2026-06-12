import { describe, expect, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { density } from "@/core/structure/properties/density";

import {
  simpleCubic,
  simpleHexagonal,
  layeredStructure,
  mc3d_10007,
  mc3d_1011,
  diamondCPOSCAR,
} from "../teststrings/spglibPoscar";

describe("density", () => {
  it("computes density for simple cubic Na", () => {
    const s = fromPOSCAR(simpleCubic);

    // 22.99 / 1
    expect(density(s)).toBeCloseTo(22.99, 6);
  });

  it("computes density for simple hexagonal Na", () => {
    const s = fromPOSCAR(simpleHexagonal);

    // 22.99 / (1 * 1 * 4 * sin(120°))
    expect(density(s)).toBeCloseTo(6.636641344334, 6);
  });

  it("computes density for diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    // 1 * 12.011 / 3.57^3
    expect(density(s)).toBeCloseTo(1.05592849, 6);
  });

  it("computes density for layered LiCoO2", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(density(s)).toBeCloseTo(3.105804647, 6);
  });

  it("computes density for mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(density(s)).toBeCloseTo(5.11622244, 6);
  });

  it("computes density for mc3d_1011", () => {
    const s = fromPOSCAR(mc3d_1011);

    expect(density(s)).toBeCloseTo(1.9184591349, 6);
  });
});
