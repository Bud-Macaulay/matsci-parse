import { describe, it, expect } from "vitest";

import { semilocalToKb } from "@/core/pseudopotential/operations";
import { validate } from "@/core/pseudopotential/validate";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf } from "../../io/pseudo/teststrings/upf";
import { realCFhi } from "../../io/pseudo/teststrings/fhi";

describe("semilocalToKb", () => {
  it("derives KB projectors from FHI semilocal potentials", () => {
    const pp = semilocalToKb(fromFHI(realCFhi));
    expect(pp.nonlocal.betas.length).toBeGreaterThan(0);
    expect(pp.nonlocal.dij.length).toBe(pp.nonlocal.betas.length);
    expect(pp.header.numberOfProj).toBe(pp.nonlocal.betas.length);
    expect(validate(pp)).toEqual([]);
  });

  it("leaves objects without semilocal potentials alone", () => {
    const a = fromUPF(heNcUpf);
    const b = semilocalToKb(a);
    expect(b.nonlocal.betas).toEqual(a.nonlocal.betas);
    expect(b.header.numberOfProj).toBe(a.nonlocal.betas.length);
  });

  it("skips channels identical to the local potential", () => {
    const a = fromFHI(realCFhi);
    const flat = {
      ...a,
      semilocal: a.semilocal!.map((sl, i) =>
        i === 0 ? { ...sl, vnl: a.local.vloc.slice() } : sl,
      ),
    };
    expect(semilocalToKb(flat).nonlocal.betas.length).toBe(
      a.semilocal!.length - 1,
    );
  });

  it("labels beyond f with the raw channel number", () => {
    const a = fromFHI(realCFhi);
    const extra = {
      ...a,
      semilocal: [
        ...a.semilocal!,
        { l: 5, vnl: a.semilocal![0].vnl.map((v) => v * 1.1) },
      ],
    };
    const b = semilocalToKb(extra);
    expect(b.nonlocal.betas[b.nonlocal.betas.length - 1].label).toBe("55");
  });
});
