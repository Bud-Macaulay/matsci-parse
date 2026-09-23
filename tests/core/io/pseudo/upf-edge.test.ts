import { describe, it, expect } from "vitest";

import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { validate } from "@/core/pseudopotential/validate";

import { heNcUpf, hUsppUpf, oPawUpf } from "./teststrings/upf";

/** Minimal valid UPF skeleton (mesh of 3) for section-absence tests. */
const skeleton = (body: string): string =>
  [
    '<UPF version="2.0.1">',
    '<PP_HEADER element="X" pseudo_type="NC" relativistic="scalar" is_ultrasoft=".false." is_paw=".false." is_coulomb=".false." has_so=".false." has_wfc=".false." has_gipaw=".false." paw_as_gipaw=".false." core_correction=".false." functional="PBE" z_valence="1" total_psenergy="0" wfc_cutoff="0" rho_cutoff="0" l_max="0" l_max_rho="0" l_local="-1" mesh_size="3" number_of_wfc="0" number_of_proj="1"/>',
    body,
    "</UPF>",
  ].join("\n");

const mesh3 = [
  "<PP_MESH>",
  "<PP_R>",
  "0.01 0.02 0.03",
  "</PP_R>",
  "<PP_RAB>",
  "0.01 0.01 0.01",
  "</PP_RAB>",
  "</PP_MESH>",
].join("\n");

const local3 = ["<PP_LOCAL>", "-1.0 -0.9 -0.8", "</PP_LOCAL>"].join("\n");

const nonlocal1 = [
  "<PP_NONLOCAL>",
  '<PP_BETA index="1" angular_momentum="0" label="1S" ultrasoft_cutoff_radius="1.0">',
  "0.1 0.2 0.3",
  "</PP_BETA>",
  "<PP_DIJ>",
  "1 1 0.5",
  "</PP_DIJ>",
  "</PP_NONLOCAL>",
].join("\n");

const rho3 = ["<PP_RHOATOM>", "0.1 0.1 0.1", "</PP_RHOATOM>"].join("\n");

describe("UPF missing-section errors", () => {
  it("throws on missing PP_MESH", () => {
    expect(() =>
      fromUPF(skeleton([local3, nonlocal1, rho3].join("\n"))),
    ).toThrow("Missing PP_MESH");
  });

  it("throws on missing PP_LOCAL", () => {
    expect(() =>
      fromUPF(skeleton([mesh3, nonlocal1, rho3].join("\n"))),
    ).toThrow("Missing PP_LOCAL");
  });

  it("throws on missing PP_NONLOCAL", () => {
    expect(() =>
      fromUPF(skeleton([mesh3, local3, rho3].join("\n"))),
    ).toThrow("Missing PP_NONLOCAL");
  });

  it("throws on missing PP_RHOATOM", () => {
    expect(() =>
      fromUPF(skeleton([mesh3, local3, nonlocal1].join("\n"))),
    ).toThrow("Missing PP_RHOATOM");
  });
});

describe("UPF PP_DIJ lenient fallback", () => {
  it("keeps out-of-range triplets instead of misreading a matrix", () => {
    const text = skeleton(
      [
        mesh3,
        local3,
        nonlocal1.replace("1 1 0.5", "5 5 0.5"),
        rho3,
      ].join("\n"),
    );
    const pp = fromUPF(text);
    expect(pp.nonlocal.dij).toEqual([[5, 5, 0.5]]);
  });
});

/** Minimal PAW UPF with wavefunctions nested inside PP_PAW (non-standard). */
const nestedPawUpf = [
  '<UPF version="2.0.1">',
  '<PP_HEADER element="X" pseudo_type="PAW" relativistic="scalar" is_ultrasoft=".true." is_paw=".true." is_coulomb=".false." has_so=".false." has_wfc=".true." has_gipaw=".false." paw_as_gipaw=".false." core_correction=".false." functional="PBE" z_valence="1" total_psenergy="0" wfc_cutoff="0" rho_cutoff="0" l_max="0" l_max_rho="0" l_local="-1" mesh_size="3" number_of_wfc="1" number_of_proj="1"/>',
  mesh3,
  local3,
  nonlocal1,
  "<PP_PSWFC></PP_PSWFC>",
  rho3,
  '<PP_PAW paw_data_format="3" core_energy="-1.0">',
  "<PP_OCCUPATIONS>",
  "0.5 0.5",
  "</PP_OCCUPATIONS>",
  "<PP_AE_NLCC>",
  "0.01 0.01 0.01",
  "</PP_AE_NLCC>",
  "<PP_AE_VLOC>",
  "-2.0 -1.9 -1.8",
  "</PP_AE_VLOC>",
  '<PP_AEWFC.1 l="0" label="1S">',
  "0.01 0.02 0.03",
  "</PP_AEWFC.1>",
  '<PP_PSWFC.1 l="0" label="1S">',
  "0.02 0.03 0.04",
  "</PP_PSWFC.1>",
  "</PP_PAW>",
  "</UPF>",
].join("\n");

describe("UPF nested PAW wavefunctions", () => {
  it("merges inner PP_AEWFC/PP_PSWFC into the top-level lists", () => {
    const pp = fromUPF(nestedPawUpf);
    expect(pp.fullWfc!.length).toBe(1);
    expect(Array.from(pp.fullWfc![0].aewfc)).toEqual([0.01, 0.02, 0.03]);
    // Empty top-level PP_PSWFC is back-filled from the inner data.
    expect(pp.pswfc.length).toBe(1);
    expect(Array.from(pp.pswfc[0].chi)).toEqual([0.02, 0.03, 0.04]);
    expect(pp.paw!.aeWfcs.length).toBe(1);
    expect(pp.paw!.psWfcs.length).toBe(1);
  });

  it("round-trips through the spec-layout top-level sections", () => {
    const a = fromUPF(nestedPawUpf);
    expect(fromUPF(toUPF(a))).toEqual(a);
  });
});

describe("UPF mesh and header canonicalization", () => {
  it("infers rmax from the mesh when the attribute is absent", () => {
    // mesh3 carries no PP_MESH attributes at all (atompaw style).
    const text = skeleton([mesh3, local3, nonlocal1, rho3].join("\n"));
    const pp = fromUPF(text);
    expect(pp.mesh.rmax).toBeCloseTo(0.03);
    expect(toUPF(pp)).toContain('rmax="');
  });

  it("recomputes mesh and count fields on serialize", () => {
    const pp = fromUPF(heNcUpf);
    const stale = {
      ...pp,
      header: {
        ...pp.header,
        meshSize: 1,
        numberOfWfc: 99,
        numberOfProj: 99,
      },
    };
    const out = toUPF(stale);
    expect(out).toContain(`mesh_size="${pp.mesh.r.length}"`);
    expect(out).toContain(`number_of_wfc="${pp.pswfc.length}"`);
    expect(out).toContain(`number_of_proj="${pp.nonlocal.betas.length}"`);
  });
});

describe("UPF full augmentation attributes", () => {
  it("round-trips every augmentation field", () => {
    const base = fromUPF(hUsppUpf);
    const n = base.mesh.r.length;
    const pp = {
      ...base,
      nonlocal: {
        ...base.nonlocal,
        augmentation: {
          ...base.nonlocal.augmentation,
          rMatchAugfun: 1.5,
          cutoffR: 2.5,
          cutoffRIndex: 100,
          irc: 99,
          lmaxAug: 1,
          augmentationEpsilon: 1e-8,
          qfcoeff: new Float64Array(n).fill(0.1),
          rinner: new Float64Array(n).fill(0.2),
        },
      },
    };
    const c = fromUPF(toUPF(pp));
    expect(c.nonlocal.augmentation).toEqual(pp.nonlocal.augmentation);
    expect(validate(c)).toEqual([]);
  });
});

describe("UPF GIPAW VLOCAL", () => {
  it("round-trips AE/PS local potentials", () => {
    const base = fromUPF(oPawUpf);
    const n = base.mesh.r.length;
    const pp = {
      ...base,
      gipaw: {
        ...base.gipaw!,
        vlocAe: new Float64Array(n).fill(-3.0),
        vlocPs: new Float64Array(n).fill(-2.0),
      },
    };
    const c = fromUPF(toUPF(pp));
    expect(c.gipaw).toEqual(pp.gipaw);
  });
});
