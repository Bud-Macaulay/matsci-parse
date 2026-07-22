import { describe, it, expect } from "vitest";

import {
  parseQeNamelist,
  getString,
  getNumber,
  getArray,
} from "@/core/io/pw/namelist";

describe("parseQeNamelist", () => {
  it("parses empty namelist", () => {
    const nl = parseQeNamelist("&SYSTEM\n/");
    expect(nl).toHaveLength(1);
    expect(nl[0].name).toBe("SYSTEM");
    expect(nl[0].values.size).toBe(0);
  });

  it("parses simple key=value pairs", () => {
    const nl = parseQeNamelist("&SYSTEM\n  ibrav = 0\n  nat = 1\n/");
    expect(nl[0].values.get("ibrav")).toBe("0");
    expect(nl[0].values.get("nat")).toBe("1");
  });

  it("parses Fortran D-notation reals", () => {
    const nl = parseQeNamelist("&SYSTEM\n  degauss = 2.0d-2\n  ecut = 1.0D+02\n/");
    expect(nl[0].values.get("degauss")).toBe("0.02");
    expect(nl[0].values.get("ecut")).toBe("100");
  });

  it("parses logicals", () => {
    const nl = parseQeNamelist(
      "&CONTROL\n  tstress = .true.\n  tprnfor = .FALSE.\n/",
    );
    expect(nl[0].values.get("tstress")).toBe("true");
    expect(nl[0].values.get("tprnfor")).toBe("false");
  });

  it("parses quoted strings", () => {
    const nl = parseQeNamelist(
      "&CONTROL\n  calculation = 'scf'\n  prefix = \"aiida\"\n/",
    );
    expect(nl[0].values.get("calculation")).toBe("scf");
    expect(nl[0].values.get("prefix")).toBe("aiida");
  });

  it("parses array syntax key(i)", () => {
    const nl = parseQeNamelist(
      "&SYSTEM\n  starting_magnetization(1) = 0.5\n  starting_magnetization(2) = -0.3\n/",
    );
    expect(nl[0].values.get("starting_magnetization(1)")).toBe("0.5");
    expect(nl[0].values.get("starting_magnetization(2)")).toBe("-0.3");
  });

  it("parses multiple namelists", () => {
    const nl = parseQeNamelist(
      "&CONTROL\n  calculation = 'scf'\n/\n&SYSTEM\n  ibrav = 1\n/\n&ELECTRONS\n  conv_thr = 1.0d-8\n/",
    );
    expect(nl).toHaveLength(3);
    expect(nl[0].name).toBe("CONTROL");
    expect(nl[1].name).toBe("SYSTEM");
    expect(nl[2].name).toBe("ELECTRONS");
  });

  it("handles comment lines with !", () => {
    const nl = parseQeNamelist(
      "&SYSTEM\n  ! this is a comment\n  ibrav = 0\n/",
    );
    expect(nl[0].values.get("ibrav")).toBe("0");
    expect(nl[0].values.size).toBe(1);
  });

  it("handles trailing commas", () => {
    const nl = parseQeNamelist(
      "&SYSTEM\n  ibrav = 0,\n  nat = 1,\n/",
    );
    expect(nl[0].values.get("ibrav")).toBe("0");
    expect(nl[0].values.get("nat")).toBe("1");
  });

  it("handles inline comments with !", () => {
    const nl = parseQeNamelist(
      "&SYSTEM\n  ibrav = 0 ! lattice type\n/",
    );
    expect(nl[0].values.get("ibrav")).toBe("0");
  });

  it("skips non-namelist lines", () => {
    const nl = parseQeNamelist(
      "some text\n&SYSTEM\n  ibrav = 0\n/\nmore text\n",
    );
    expect(nl).toHaveLength(1);
    expect(nl[0].name).toBe("SYSTEM");
  });
});

describe("getString / getNumber / getArray", () => {
  const input = `
&CONTROL
  calculation = 'scf'
  tstress = .true.
/
&SYSTEM
  ibrav = 0
  nat = 1
  degauss = 2.0d-2
  celldm(1) = 10.0
  celldm(3) = 1.5
/
`;
  const nl = parseQeNamelist(input);

  it("getString returns string value", () => {
    expect(getString(nl, "CONTROL", "calculation")).toBe("scf");
  });

  it("getString returns undefined for missing key", () => {
    expect(getString(nl, "CONTROL", "nonexistent")).toBeUndefined();
  });

  it("getString returns undefined for missing block", () => {
    expect(getString(nl, "IONS", "calculation")).toBeUndefined();
  });

  it("getNumber returns numeric value", () => {
    expect(getNumber(nl, "SYSTEM", "ibrav")).toBe(0);
    expect(getNumber(nl, "SYSTEM", "nat")).toBe(1);
    expect(getNumber(nl, "SYSTEM", "degauss")).toBeCloseTo(0.02);
  });

  it("getNumber returns undefined for non-numeric", () => {
    expect(getNumber(nl, "CONTROL", "calculation")).toBeUndefined();
  });

  it("getNumber handles logicals as non-numeric", () => {
    expect(getNumber(nl, "CONTROL", "tstress")).toBeUndefined();
  });

  it("getArray extracts celldm values", () => {
    const celldm = getArray(nl, "SYSTEM", "celldm", 6);
    expect(celldm[0]).toBeCloseTo(10.0); // celldm(1)
    expect(celldm[1]).toBe(0); // celldm(2) not set
    expect(celldm[2]).toBeCloseTo(1.5); // celldm(3)
    expect(celldm).toHaveLength(6);
  });
});
