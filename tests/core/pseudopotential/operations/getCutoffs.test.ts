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
});
