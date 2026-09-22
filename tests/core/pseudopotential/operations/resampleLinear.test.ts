import { describe, it, expect } from "vitest";

import {
  resampleLinear,
  makeRadialGrid,
} from "@/core/pseudopotential/operations";
import { validate } from "@/core/pseudopotential/validate";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf, oPawUpf } from "../../io/pseudo/teststrings/upf";
import { realCFhi } from "../../io/pseudo/teststrings/fhi";

describe("resampleLinear", () => {
  it("resamples onto a coarser grid with updated counters", () => {
    const pp = fromUPF(heNcUpf);
    const { r } = makeRadialGrid({ npts: 100, rmax: pp.mesh.rmax, type: "log" });
    const out = resampleLinear(pp, r);
    expect(out.mesh.r.length).toBe(100);
    expect(out.local.vloc.length).toBe(100);
    expect(out.rhoatom.length).toBe(100);
    expect(out.nonlocal.betas[0].beta.length).toBe(100);
    expect(out.pswfc[0].chi.length).toBe(100);
    expect(out.header.meshSize).toBe(100);
    expect(out.provenance.notes).toContain("resampled");
    expect(validate(out)).toEqual([]);
  });

  it("is near-identity on the same grid", () => {
    const pp = fromUPF(heNcUpf);
    const out = resampleLinear(pp, pp.mesh.r.slice());
    for (let i = 0; i < pp.local.vloc.length; i += 50) {
      expect(out.local.vloc[i]).toBeCloseTo(pp.local.vloc[i], 10);
    }
  });

  it("resamples semilocal potentials", () => {
    const pp = fromFHI(realCFhi);
    const { r } = makeRadialGrid({ npts: 100, rmax: pp.mesh.rmax, type: "log" });
    const out = resampleLinear(pp, r);
    expect(out.semilocal!.length).toBe(4);
    expect(out.semilocal![0].vnl.length).toBe(100);
    expect(validate(out)).toEqual([]);
  });

  it("resamples PAW wavefunctions and augmentation functions", () => {
    const pp = fromUPF(oPawUpf);
    const { r } = makeRadialGrid({ npts: 200, rmax: pp.mesh.rmax, type: "log" });
    const out = resampleLinear(pp, r);
    expect(out.fullWfc![0].aewfc.length).toBe(200);
    expect(out.nonlocal.augmentation!.qijl![0].qijl.length).toBe(200);
    expect(out.paw!.aeVloc.length).toBe(200);
    expect(out.paw!.aeWfcs[0].aewfc.length).toBe(200);
    expect(validate(out)).toEqual([]);
  });

  it("resamples GIPAW orbitals and spin-orbit data", () => {
    const paw = fromUPF(oPawUpf);
    const orb = {
      l: 0,
      label: "2S",
      aeOrbital: paw.rhoatom.slice(),
      psOrbital: paw.rhoatom.slice(),
    };
    const he = fromUPF(heNcUpf);
    const so = {
      ...he,
      header: { ...he.header, hasSo: true },
      spinOrbit: {
        relWfcs: [{ jchi: 0.5, chi: he.rhoatom.slice() }],
        relBetas: [{ jjj: 0.5, beta: he.rhoatom.slice() }],
      },
    };
    const { r } = makeRadialGrid({ npts: 100, rmax: he.mesh.rmax, type: "log" });
    const withOrb = {
      ...paw,
      gipaw: { ...paw.gipaw!, orbitals: [orb] },
    };
    const outPaw = resampleLinear(withOrb, makeRadialGrid({ npts: 200, rmax: paw.mesh.rmax, type: "log" }).r);
    expect(outPaw.gipaw!.orbitals[0].aeOrbital.length).toBe(200);
    expect(outPaw.gipaw!.orbitals[0].psOrbital.length).toBe(200);
    const outSo = resampleLinear(so, r);
    expect(outSo.spinOrbit!.relWfcs[0].chi!.length).toBe(100);
    expect(outSo.spinOrbit!.relBetas[0].beta!.length).toBe(100);
    expect(validate(outSo)).toEqual([]);
  });

  it("keeps spin-orbit entries without radial data", () => {
    const he = fromUPF(heNcUpf);
    const so = {
      ...he,
      spinOrbit: {
        relWfcs: [{ jchi: 0.5 }],
        relBetas: [{ jjj: 0.5 }],
      },
    };
    const { r } = makeRadialGrid({ npts: 100, rmax: he.mesh.rmax, type: "log" });
    const out = resampleLinear(so, r);
    expect(out.spinOrbit!.relWfcs[0].chi).toBeUndefined();
    expect(out.spinOrbit!.relBetas[0].beta).toBeUndefined();
  });
});
