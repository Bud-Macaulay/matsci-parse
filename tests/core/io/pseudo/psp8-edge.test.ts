import { describe, it, expect } from "vitest";

import { fromPSP8, toPSP8, canWritePSP8 } from "@/core/io/pseudo/psp8";
import { fromUPF } from "@/core/io/pseudo/upf";
import { fromFHI } from "@/core/io/pseudo/fhi";

import { heNcUpf, hUsppUpf, oPawUpf } from "./teststrings/upf";
import { realCFhi } from "./teststrings/fhi";

/**
 * Synthetic PSP8 with spin-orbit projectors (extension_switch=2).
 * lmax=2, lloc=4 (separate local block), mmax=4, no NLCC, no rhoatom.
 * The l=2 channel is empty to exercise skip paths.
 */
const soPsp8 = [
  "Xx    ONCVPSP synthetic SO",
  "8.0000     4.0000      010101",
  "8      11   2     4   4     0",
  "5.99000000  0.00000000  0.00000000",
  "1     1     0",
  "2",
  "1",
  "0  0.5",
  "1  0.00  0.10",
  "2  0.01  0.20",
  "3  0.02  0.30",
  "4  0.03  0.40",
  "1  -0.5",
  "1  0.00  1.10",
  "2  0.01  1.20",
  "3  0.02  1.30",
  "4  0.03  1.40",
  "4",
  "1  0.00 -3.00",
  "2  0.01 -2.90",
  "3  0.02 -2.80",
  "4  0.03 -2.70",
  "1  0.25",
  "1  0.00  0.01",
  "2  0.01  0.02",
  "3  0.02  0.03",
  "4  0.03  0.04",
].join("\n");

/**
 * Synthetic PSP8 with the local potential replacing the lloc=0 channel
 * block (lmax=2, lloc=0, nproj "0 1 0", extension_switch=0).
 */
const llocPsp8 = [
  "Xx    ONCVPSP synthetic lloc",
  "6.0000     4.0000      010101",
  "8      11   2     0   4     0",
  "5.99000000  0.00000000  0.00000000",
  "0     1     0",
  "0",
  "0",
  "1  0.00 -3.00",
  "2  0.01 -2.90",
  "3  0.02 -2.80",
  "4  0.03 -2.70",
  "1  0.75",
  "1  0.00  0.10",
  "2  0.01  0.20",
  "3  0.02  0.30",
  "4  0.03  0.40",
].join("\n");

describe("PSP8 spin-orbit (extension_switch=2)", () => {
  it("parses SO projector blocks with ekbso diagonals", () => {
    const pp = fromPSP8(soPsp8);
    expect(pp.header.hasSo).toBe(true);
    expect(pp.header.extensionSwitch).toBe(2);
    expect(pp.nonlocal.betas.length).toBe(3);
    const so = pp.nonlocal.betas[2];
    expect(so.angularMomentum).toBe(1);
    expect(so.label).toBe("1p-so");
    // Ry-converted ekbso diagonal for the global SO projector index.
    expect(pp.nonlocal.dij).toContainEqual([3, 3, 0.25 * 2]);
  });

  it("round-trips SO data losslessly", () => {
    const a = fromPSP8(soPsp8);
    expect(fromPSP8(toPSP8(a))).toEqual(a);
  });

  it("writes the nprojso line", () => {
    expect(toPSP8(fromPSP8(soPsp8))).toContain("\n     2\n 1");
  });
});

describe("PSP8 local block at lloc position", () => {
  it("parses the local potential from the lloc=0 slot", () => {
    const pp = fromPSP8(llocPsp8);
    expect(pp.header.lLocal).toBe(0);
    expect(pp.header.lMax).toBe(2);
    expect(pp.nonlocal.betas.length).toBe(1);
    expect(pp.nonlocal.betas[0].angularMomentum).toBe(1);
    expect(Array.from(pp.local.vloc)).toEqual([-3.0 * 2, -2.9 * 2, -2.8 * 2, -2.7 * 2]);
  });

  it("round-trips with the local block in place", () => {
    const a = fromPSP8(llocPsp8);
    expect(fromPSP8(toPSP8(a))).toEqual(a);
  });
});

describe("canWritePSP8", () => {
  it("accepts norm-conserving objects", () => {
    expect(canWritePSP8(fromUPF(heNcUpf)).ok).toBe(true);
  });

  it("rejects ultrasoft/PAW with reasons", () => {
    const us = canWritePSP8(fromUPF(hUsppUpf));
    expect(us.ok).toBe(false);
    expect(us.reasons.join(" ")).toContain("not norm-conserving");
    const paw = canWritePSP8(fromUPF(oPawUpf));
    expect(paw.ok).toBe(false);
    expect(paw.reasons.join(" ")).toContain("PAW");
  });

  it("rejects spin-orbit and semilocal content", () => {
    const so = canWritePSP8(fromPSP8(soPsp8));
    expect(so.ok).toBe(false);
    expect(so.reasons.join(" ")).toContain("spin-orbit");
    const sl = canWritePSP8(fromFHI(realCFhi));
    expect(sl.ok).toBe(false);
    expect(sl.reasons.join(" ")).toContain("semilocal");
  });
});

describe("PSP8 writer fallbacks", () => {
  it("defaults missing ekb entries to 1.0 Hartree", () => {
    const pp = fromUPF(heNcUpf);
    const out = toPSP8({ ...pp, nonlocal: { ...pp.nonlocal, dij: [] } });
    const reparsed = fromPSP8(out);
    expect(reparsed.nonlocal.dij).toContainEqual([1, 1, 1.0 * 2]);
  });

  it("drops projectors above lMax", () => {
    const pp = fromUPF(heNcUpf);
    const stray = {
      ...pp.nonlocal.betas[0],
      angularMomentum: 99,
      label: "99?",
    };
    const out = toPSP8({
      ...pp,
      nonlocal: { ...pp.nonlocal, betas: [...pp.nonlocal.betas, stray] },
    });
    expect(fromPSP8(out).nonlocal.betas.length).toBe(2);
  });

  it("zero-fills short projector data", () => {
    const pp = fromUPF(heNcUpf);
    const short = {
      ...pp.nonlocal.betas[0],
      beta: new Float64Array([0.5]),
    };
    const out = toPSP8({
      ...pp,
      nonlocal: { betas: [short], dij: [[1, 1, 1.0]] },
    });
    expect(fromPSP8(out).nonlocal.betas[0].beta[10]).toBe(0);
  });

  it("falls back to pspxc=0 for unknown functionals", () => {
    const pp = fromUPF(heNcUpf);
    const out = toPSP8({
      ...pp,
      header: { ...pp.header, xcCode: undefined, functional: "WEIRD-XC" },
    });
    expect(out.split("\n")[2].trim().split(/\s+/)[1]).toBe("0");
  });

  it("derives fchrg from NLCC presence", () => {
    const pp = fromUPF(heNcUpf);
    const out = toPSP8({
      ...pp,
      header: { ...pp.header, fchrg: undefined, coreCorrection: false },
      nlcc: new Float64Array(pp.mesh.r.length).fill(0.01),
    });
    expect(out.split("\n")[3].trim().split(/\s+/)[1]).toBe("1.0000");
  });
});
