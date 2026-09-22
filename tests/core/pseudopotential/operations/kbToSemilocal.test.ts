import { describe, it, expect } from "vitest";

import { kbToSemilocal } from "@/core/pseudopotential/operations";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";
import { realCFhi } from "../../io/pseudo/teststrings/fhi";

describe("kbToSemilocal", () => {
  it("derives semilocal potentials from KB projectors", () => {
    const pp = kbToSemilocal(fromUPF(heNcUpf));
    expect(pp.semilocal).toBeDefined();
    expect(pp.semilocal!.length).toBe(1);
    expect(pp.semilocal![0].l).toBe(0);
    expect(pp.semilocal![0].vnl.length).toBe(pp.mesh.r.length);
  });

  it("produces no channels for projector-free objects", () => {
    expect(kbToSemilocal(fromFHI(realCFhi)).semilocal).toEqual([]);
  });

  it("treats missing D_ij entries as zero coupling", () => {
    const a = fromUPF(heNcUpf);
    const b = kbToSemilocal({ ...a, nonlocal: { ...a.nonlocal, dij: [] } });
    for (let i = 0; i < a.local.vloc.length; i += 50) {
      expect(b.semilocal![0].vnl[i]).toBeCloseTo(a.local.vloc[i], 12);
    }
  });
});
