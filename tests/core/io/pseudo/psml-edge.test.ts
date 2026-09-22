import { describe, it, expect } from "vitest";

import { fromPSML, toPSML, canWritePSML } from "@/core/io/pseudo/psml";
import { fromUPF } from "@/core/io/pseudo/upf";
import type { Pseudopotential } from "@/core/pseudopotential/pseudopotential";

import { hUsppUpf, oPawUpf } from "./teststrings/upf";

/**
 * Synthetic PSML exercising sparse sections: no provenance, no
 * exchange-correlation, radfunc-less slps/proj/pswf, present
 * pseudocore-charge, absent valence-charge.
 */
const sparsePsml = [
  '<?xml version="1.0" encoding="UTF-8" ?>',
  '<psml version="1.1" energy_unit="hartree" length_unit="bohr" xmlns="http://esl.cecam.org/PSML/ns/1.1">',
  '<pseudo-atom-spec atomic-label="Xx" atomic-number="6" z-pseudo="4" relativity="scalar" core-corrections="yes">',
  "</pseudo-atom-spec>",
  '<grid npts="3">',
  "<grid-data>",
  "0.0  0.01  0.02",
  "</grid-data>",
  "</grid>",
  "<local-potential>",
  "<radfunc>",
  "<data npts=\"3\">",
  "-1.0  -0.9  -0.8",
  "</data>",
  "</radfunc>",
  "</local-potential>",
  '<semilocal-potentials set="scalar_relativistic">',
  '<slps l="s" n="1" rc="0">',
  "<radfunc>",
  "<data npts=\"3\">",
  "-1.0  -0.9  -0.8",
  "</data>",
  "</radfunc>",
  "</slps>",
  '<slps l="p" n="2" rc="0">',
  "</slps>",
  "</semilocal-potentials>",
  '<nonlocal-projectors set="scalar_relativistic">',
  '<proj l="s" seq="1" ekb="1.5" type="kb">',
  "</proj>",
  '<proj l="p" seq="2" ekb="-0.5" type="kb">',
  "<radfunc>",
  "<data npts=\"3\">",
  "0.1  0.2  0.3",
  "</data>",
  "</radfunc>",
  "</proj>",
  "</nonlocal-projectors>",
  '<pseudo-wave-functions set="pseudo">',
  '<pswf l="s" n="2">',
  "<radfunc>",
  "<data npts=\"3\">",
  "0.01  0.02  0.03",
  "</data>",
  "</radfunc>",
  "</pswf>",
  '<pswf l="p" n="2">',
  "</pswf>",
  "</pseudo-wave-functions>",
  "<pseudocore-charge>",
  "<radfunc>",
  "<data npts=\"3\">",
  "0.001  0.002  0.003",
  "</data>",
  "</radfunc>",
  "</pseudocore-charge>",
  "</psml>",
].join("\n");

function withoutProvenance(pp: Pseudopotential): Pseudopotential {
  return {
    ...pp,
    provenance: { sourceFormat: "PSML" as const },
  };
}

describe("PSML sparse sections", () => {
  it("parses with provenance/xc defaults", () => {
    const pp = fromPSML(sparsePsml);
    expect(pp.provenance.creator).toBeUndefined();
    expect(pp.provenance.date).toBeUndefined();
    expect(pp.header.functional).toBe("");
    expect(pp.header.coreCorrection).toBe(true);
  });

  it("zero-fills radfunc-less potentials and projectors", () => {
    const pp = fromPSML(sparsePsml);
    expect(Array.from(pp.semilocal!.find((s) => s.l === 1)!.vnl)).toEqual([0, 0, 0]);
    expect(Array.from(pp.nonlocal.betas[0].beta)).toEqual([0, 0, 0]);
    expect(pp.nonlocal.dij).toContainEqual([1, 1, 1.5 * 2]);
    expect(Array.from(pp.pswfc[1].chi)).toEqual([0, 0, 0]);
  });

  it("reads core charge and defaults missing valence charge", () => {
    const pp = fromPSML(sparsePsml);
    expect(Array.from(pp.nlcc!)).toEqual([0.001, 0.002, 0.003]);
    expect(Array.from(pp.rhoatom)).toEqual([0, 0, 0]);
  });

  it("round-trips modulo generated provenance", () => {
    const a = fromPSML(sparsePsml);
    const b = fromPSML(toPSML(a));
    expect(withoutProvenance(b)).toEqual(withoutProvenance(a));
    expect(b.provenance).toMatchObject({
      sourceFormat: "PSML",
      creator: "matsci-parse",
    });
  });

  it("derives lMax from projectors without semilocal potentials", () => {
    const nosl = sparsePsml.replace(
      /<semilocal-potentials[\s\S]*?<\/semilocal-potentials>\n/,
      "",
    );
    const pp = fromPSML(nosl);
    expect(pp.semilocal).toBeUndefined();
    expect(pp.header.lMax).toBe(1);
    expect(withoutProvenance(fromPSML(toPSML(pp)))).toEqual(
      withoutProvenance(pp),
    );
  });
});

describe("canWritePSML", () => {
  it("accepts norm-conserving objects", () => {
    expect(canWritePSML(fromPSML(sparsePsml)).ok).toBe(true);
  });

  it("rejects US/PAW/spin-orbit with reasons", () => {
    const us = canWritePSML(fromUPF(hUsppUpf));
    expect(us.ok).toBe(false);
    expect(us.reasons.join(" ")).toContain("norm-conserving");
    const paw = canWritePSML(fromUPF(oPawUpf));
    expect(paw.ok).toBe(false);
    expect(paw.reasons.join(" ")).toContain("PAW");
    const so: Pseudopotential = {
      ...fromPSML(sparsePsml),
      header: { ...fromPSML(sparsePsml).header, hasSo: true },
      spinOrbit: { relWfcs: [], relBetas: [] },
    };
    const soCheck = canWritePSML(so);
    expect(soCheck.ok).toBe(false);
    expect(soCheck.reasons.join(" ")).toContain("spin-orbit");
  });
});
