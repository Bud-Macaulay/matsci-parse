import { describe, it, expect } from "vitest";

import {
  HA_TO_RY,
  RY_TO_HA,
  HARTREE_TO_RYDBERG,
  RYDBERG_TO_HARTREE,
  haToRy,
  ryToHa,
  haArrayToRy,
  ryArrayToHa,
  scaleHaToRy,
  scaleRyToHa,
} from "@/core/pseudopotential/units";
import { EnergyUnitSystem } from "@/core/units";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf } from "../io/pseudo/teststrings/upf";

// Issues with floating points; we investigate here but perhaps the lib should just accept that floating point errors are real.

describe("units", () => {
  it("derives exact power-of-two factors from the built-in unit system", () => {
    expect(HARTREE_TO_RYDBERG).toBe(
      EnergyUnitSystem.convert(1, "Hartree", "Rydberg"),
    );
    expect(RYDBERG_TO_HARTREE).toBe(
      EnergyUnitSystem.convert(1, "Rydberg", "Hartree"),
    );
    expect(HA_TO_RY).toBe(2);
    expect(RY_TO_HA).toBe(0.5);
  });

  it("does not route per-value conversion through the scalar system", () => {
    // EnergyUnitSystem.convert applies two roundings per call, which drifts
    // by 1 ulp for some doubles — the factor loop below must stay exact.
    const witness = -4.8696255250391e-8;
    expect(EnergyUnitSystem.convert(witness, "Hartree", "Rydberg")).not.toBe(
      witness * 2,
    );
    expect(haToRy(witness)).toBe(witness * 2);
  });

  it("converts scalars", () => {
    expect(haToRy(1.5)).toBe(3.0);
    expect(ryToHa(3.0)).toBe(1.5);
  });

  it("converts arrays into new buffers", () => {
    const src = new Float64Array([1, 2, 3]);
    const ry = haArrayToRy(src);
    expect(Array.from(ry)).toEqual([2, 4, 6]);
    expect(ry).not.toBe(src);
    expect(Array.from(ryArrayToHa(ry))).toEqual([1, 2, 3]);
  });

  it("scales all energy fields and inverts exactly", () => {
    const pp = fromUPF(heNcUpf);
    const vloc0 = pp.local.vloc[0];
    const dij0 = pp.nonlocal.dij[0][2];
    const beta0 = pp.nonlocal.betas[0].beta[0];

    scaleRyToHa(pp);
    expect(pp.local.vloc[0]).toBe(vloc0 * 0.5);
    expect(pp.nonlocal.dij[0][2]).toBe(dij0 * 0.5);
    expect(pp.nonlocal.betas[0].beta[0]).toBe(beta0 * 0.5);

    scaleHaToRy(pp);
    expect(pp.local.vloc[0]).toBe(vloc0);
    expect(pp.nonlocal.dij[0][2]).toBe(dij0);
    expect(pp.nonlocal.betas[0].beta[0]).toBe(beta0);
    expect(pp).toEqual(fromUPF(heNcUpf));
  });

  it("leaves lengths and densities untouched", () => {
    const pp = fromUPF(heNcUpf);
    const r0 = pp.mesh.r[0];
    const rho0 = pp.rhoatom[0];
    scaleRyToHa(pp);
    expect(pp.mesh.r[0]).toBe(r0);
    expect(pp.rhoatom[0]).toBe(rho0);
  });
});
