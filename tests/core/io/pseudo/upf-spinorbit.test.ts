import { describe, it, expect } from "vitest";

import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { validate } from "@/core/pseudopotential/validate";

/** Minimal UPF with a PP_SPIN_ORB section (attrs + radial data). */
const soUpf = `<UPF version="2.0.1">
<PP_INFO>
Test spin-orbit fixture
</PP_INFO>
<PP_HEADER generated="" author="" date="" comment="" element="Pb" pseudo_type="US" relativistic="full" is_ultrasoft=".true." is_paw=".false." is_coulomb=".false." has_so=".true." has_wfc=".false." has_gipaw=".false." paw_as_gipaw=".false." core_correction=".false." functional="PBE" z_valence="4" total_psenergy="-1.0" wfc_cutoff="30" rho_cutoff="240" l_max="1" l_max_rho="2" l_local="-1" mesh_size="5" number_of_wfc="0" number_of_proj="1"/>
<PP_MESH dx="0.01" mesh="5" xmin="0" rmax="1" zmesh="82">
<PP_R>
0.01 0.02 0.03 0.04 0.05
</PP_R>
<PP_RAB>
0.01 0.01 0.01 0.01 0.01
</PP_RAB>
</PP_MESH>
<PP_LOCAL>
-1.0 -0.9 -0.8 -0.7 -0.6
</PP_LOCAL>
<PP_NONLOCAL>
<PP_BETA index="1" angular_momentum="1" label="2P" ultrasoft_cutoff_radius="1.0">
0.1 0.2 0.3 0.4 0.5
</PP_BETA>
<PP_DIJ>
1 1 0.5
</PP_DIJ>
</PP_NONLOCAL>
<PP_RHOATOM>
0.1 0.1 0.1 0.1 0.1
</PP_RHOATOM>
<PP_SPIN_ORB>
<PP_RELWFC index="1" jchi="0.5" els="2P-" nn="2" lchi="1" oc="2.0">
0.01 0.02 0.03 0.04 0.05
</PP_RELWFC>
<PP_RELWFC.2 index="2" jchi="1.5" els="2P+" nn="2" lchi="1" oc="4.0">
0.02 0.03 0.04 0.05 0.06
</PP_RELWFC.2>
<PP_RELBETA index="1" jjj="0.5" lll="1">
0.11 0.12 0.13 0.14 0.15
</PP_RELBETA>
</PP_SPIN_ORB>
</UPF>`;

describe("UPF spin-orbit data", () => {
  const pp = fromUPF(soUpf);

  it("parses relativistic header", () => {
    expect(pp.header.relativistic).toBe("full");
    expect(pp.header.hasSo).toBe(true);
  });

  it("parses both plain and dotted PP_RELWFC entries with radial data", () => {
    expect(pp.spinOrbit).toBeDefined();
    expect(pp.spinOrbit!.relWfcs.length).toBe(2);
    const [a, b] = pp.spinOrbit!.relWfcs;
    expect(a.jchi).toBeCloseTo(0.5);
    expect(a.els).toBe("2P-");
    expect(a.nn).toBe(2);
    expect(a.lchi).toBe(1);
    expect(a.oc).toBeCloseTo(2.0);
    expect(Array.from(a.chi!)).toEqual([0.01, 0.02, 0.03, 0.04, 0.05]);
    expect(b.jchi).toBeCloseTo(1.5);
    expect(Array.from(b.chi!)).toEqual([0.02, 0.03, 0.04, 0.05, 0.06]);
  });

  it("parses PP_RELBETA entries with radial data", () => {
    expect(pp.spinOrbit!.relBetas.length).toBe(1);
    const [beta] = pp.spinOrbit!.relBetas;
    expect(beta.jjj).toBeCloseTo(0.5);
    expect(beta.lll).toBe(1);
    expect(Array.from(beta.beta!)).toEqual([0.11, 0.12, 0.13, 0.14, 0.15]);
  });

  it("round-trips spin-orbit data losslessly", () => {
    const c = fromUPF(toUPF(pp));
    expect(c.spinOrbit).toEqual(pp.spinOrbit);
    expect(c).toEqual(pp);
  });

  it("serializes a PP_SPIN_ORB section", () => {
    expect(toUPF(pp)).toContain("<PP_SPIN_ORB>");
  });

  it("validates cleanly", () => {
    expect(validate(pp)).toEqual([]);
  });
});
