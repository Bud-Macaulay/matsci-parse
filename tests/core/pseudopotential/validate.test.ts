import { describe, it, expect } from "vitest";

import { validate } from "@/core/pseudopotential/validate";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf, hUsppUpf, oPawUpf } from "../io/pseudo/teststrings/upf";
import { realCFhi } from "../io/pseudo/teststrings/fhi";

describe("validate", () => {
  it("accepts well-formed parsed objects", () => {
    expect(validate(fromUPF(heNcUpf))).toEqual([]);
    expect(validate(fromUPF(hUsppUpf))).toEqual([]);
  });

  it("flags mesh/rab length mismatch", () => {
    const pp = fromUPF(heNcUpf);
    pp.mesh.rab = new Float64Array(10);
    expect(validate(pp).join("\n")).toContain("mesh.rab length");
  });

  it("flags local potential length mismatch", () => {
    const pp = fromUPF(heNcUpf);
    pp.local.vloc = new Float64Array(10);
    expect(validate(pp).join("\n")).toContain("local.vloc length");
  });

  it("flags header counter mismatch", () => {
    const pp = fromUPF(heNcUpf);
    pp.header.numberOfProj = 99;
    expect(validate(pp).join("\n")).toContain("header.numberOfProj");
  });

  it("flags out-of-range D_ij indices", () => {
    const pp = fromUPF(heNcUpf);
    pp.nonlocal.dij.push([7, 1, 0.5]);
    const issues = validate(pp).join("\n");
    expect(issues).toContain("out-of-range nb=7");
  });

  it("flags beta array length mismatch", () => {
    const pp = fromUPF(heNcUpf);
    pp.nonlocal.betas[0] = { ...pp.nonlocal.betas[0], beta: new Float64Array(3) };
    expect(validate(pp).join("\n")).toContain("beta[0]");
  });

  it("accepts betas truncated to cutoffRadiusIndex (UPF v1 style)", () => {
    const pp = fromUPF(heNcUpf);
    pp.nonlocal.betas[0] = {
      ...pp.nonlocal.betas[0],
      beta: pp.nonlocal.betas[0].beta.slice(0, 100),
      cutoffRadiusIndex: 100,
    };
    expect(validate(pp)).toEqual([]);
    pp.nonlocal.betas[0] = {
      ...pp.nonlocal.betas[0],
      cutoffRadiusIndex: 99,
    };
    expect(validate(pp).join("\n")).toContain("beta[0]");
  });

  it("flags augmentation qijl length mismatch", () => {
    const pp = fromUPF(hUsppUpf);
    pp.nonlocal.augmentation!.qijl![0] = {
      ...pp.nonlocal.augmentation!.qijl![0],
      qijl: new Float64Array(3),
    };
    expect(validate(pp).join("\n")).toContain("augmentation.qijl[0]");
  });

  it("warns on non-canonical units", () => {
    const pp = fromUPF(heNcUpf);
    pp.units = { energy: "Ry", length: "Bohr" };
    expect(validate(pp)).toEqual([]);
    (pp.units as { energy: string }).energy = "Ha";
    expect(validate(pp).join("\n")).toContain("non-canonical units");
  });

  it("warns on missing PAW data for PAW headers", () => {
    const pp = fromUPF(heNcUpf);
    pp.header.isPaw = true;
    expect(validate(pp).join("\n")).toContain("paw data is missing");
  });

  it("flags every structural mismatch class", () => {
    const emptyMesh = {
      ...fromUPF(heNcUpf),
      mesh: {
        gridType: "custom" as const,
        rmax: 0,
        r: new Float64Array(0),
        rab: new Float64Array(0),
      },
    };
    expect(validate(emptyMesh).join("\n")).toContain("mesh.r is empty");

    const meshSize = fromUPF(heNcUpf);
    meshSize.header.meshSize = 3;
    expect(validate(meshSize).join("\n")).toContain("header.meshSize");

    const rho = fromUPF(heNcUpf);
    rho.rhoatom = new Float64Array(3);
    expect(validate(rho).join("\n")).toContain("rhoatom length");

    const nlcc = fromUPF(heNcUpf);
    nlcc.nlcc = new Float64Array(3);
    expect(validate(nlcc).join("\n")).toContain("nlcc length");

    const nwfc = fromUPF(heNcUpf);
    nwfc.header.numberOfWfc = 7;
    expect(validate(nwfc).join("\n")).toContain("header.numberOfWfc");

    const chi = fromUPF(heNcUpf);
    chi.pswfc[0] = { ...chi.pswfc[0], chi: new Float64Array(3) };
    expect(validate(chi).join("\n")).toContain("pswfc[0] chi length");

    const sl = fromFHI(realCFhi);
    sl.semilocal![0] = { ...sl.semilocal![0], vnl: new Float64Array(3) };
    expect(validate(sl).join("\n")).toContain("semilocal[0]");

    const ae = fromUPF(oPawUpf);
    ae.fullWfc![0] = { ...ae.fullWfc![0], aewfc: new Float64Array(3) };
    expect(validate(ae).join("\n")).toContain("fullWfc[0]");

    const mb = fromUPF(heNcUpf);
    mb.nonlocal.dij.push([2, 9, 0.5]);
    expect(validate(mb).join("\n")).toContain("out-of-range mb=9");

    const nan = fromUPF(heNcUpf);
    nan.nonlocal.dij.push([1, 1, Number.NaN]);
    expect(validate(nan).join("\n")).toContain("is NaN");
  });

  it("flags augmentation and PAW data issues", () => {
    const q = fromUPF(hUsppUpf);
    q.nonlocal.augmentation!.q = new Float64Array(0);
    expect(validate(q).join("\n")).toContain("augmentation.q is empty");

    const refs = fromUPF(hUsppUpf);
    refs.nonlocal.augmentation!.qijl![0] = {
      ...refs.nonlocal.augmentation!.qijl![0],
      i: 99,
    };
    expect(validate(refs).join("\n")).toContain("out-of-range projectors");

    const vloc = fromUPF(oPawUpf);
    vloc.paw!.aeVloc = new Float64Array(3);
    expect(validate(vloc).join("\n")).toContain("paw.aeVloc length");

    const nlccPaw = fromUPF(oPawUpf);
    nlccPaw.paw!.aeNlcc = new Float64Array(3);
    expect(validate(nlccPaw).join("\n")).toContain("paw.aeNlcc length");
  });

  it("warns on missing spin-orbit data", () => {
    const pp = fromUPF(heNcUpf);
    pp.header.hasSo = true;
    expect(validate(pp).join("\n")).toContain("spinOrbit data is missing");
  });
});
