import { describe, it, expect } from "vitest";

import {
  resampleLinear,
  makeRadialGrid,
} from "@/core/pseudopotential/operations";
import { validate } from "@/core/pseudopotential/validate";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";

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
});
