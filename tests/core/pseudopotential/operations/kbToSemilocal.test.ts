import { describe, it, expect } from "vitest";

import { kbToSemilocal } from "@/core/pseudopotential/operations";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";

describe("kbToSemilocal", () => {
  it("derives semilocal potentials from KB projectors", () => {
    const pp = kbToSemilocal(fromUPF(heNcUpf));
    expect(pp.semilocal).toBeDefined();
    expect(pp.semilocal!.length).toBe(1);
    expect(pp.semilocal![0].l).toBe(0);
    expect(pp.semilocal![0].vnl.length).toBe(pp.mesh.r.length);
  });
});
