import { describe, it, expect } from "vitest";

import { validate } from "@/core/pseudopotential/validate";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf, hUsppUpf } from "../io/pseudo/teststrings/upf";

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
});
