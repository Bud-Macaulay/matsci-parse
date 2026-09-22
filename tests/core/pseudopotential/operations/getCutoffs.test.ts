import { describe, it, expect } from "vitest";

import { getCutoffs } from "@/core/pseudopotential/operations";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";

describe("getCutoffs", () => {
  it("returns per-projector cutoffs and header cutoffs", () => {
    const pp = fromUPF(heNcUpf);
    const cutoffs = getCutoffs(pp);
    expect(cutoffs.projectorCutoffs.length).toBe(2);
    expect(cutoffs.wfcCutoff).toBe(pp.header.wfcCutoff);
    expect(cutoffs.rhoCutoff).toBe(pp.header.rhoCutoff);
  });

  it("prefers cutoffRadius over ultrasoftCutoffRadius", () => {
    const pp = fromUPF(heNcUpf);
    pp.nonlocal.betas[0] = { ...pp.nonlocal.betas[0], cutoffRadius: 2.5 };
    expect(getCutoffs(pp).projectorCutoffs[0].cutoff).toBe(2.5);
  });
});
