import { describe, it, expect } from "vitest";

import { semilocalToKb } from "@/core/pseudopotential/operations";
import { validate } from "@/core/pseudopotential/validate";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { realCFhi } from "../../io/pseudo/teststrings/fhi";

describe("semilocalToKb", () => {
  it("derives KB projectors from FHI semilocal potentials", () => {
    const pp = semilocalToKb(fromFHI(realCFhi));
    expect(pp.nonlocal.betas.length).toBeGreaterThan(0);
    expect(pp.nonlocal.dij.length).toBe(pp.nonlocal.betas.length);
    expect(pp.header.numberOfProj).toBe(pp.nonlocal.betas.length);
    expect(validate(pp)).toEqual([]);
  });
});
