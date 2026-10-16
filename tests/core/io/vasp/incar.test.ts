import { describe, expect, it } from "vitest";

import { fromINCAR, toINCAR, type VaspIncarOptions } from "@/core/io/vasp";

describe("toINCAR", () => {
  it("writes one TAG = value per line, in the order given", () => {
    expect(toINCAR({ ENCUT: 520, ISMEAR: 0, SIGMA: 0.05 })).toBe(
      "ENCUT = 520\nISMEAR = 0\nSIGMA = 0.05\n",
    );
  });

  it("writes logicals as .TRUE. / .FALSE.", () => {
    expect(toINCAR({ LWAVE: false, LCHARG: true })).toBe(
      "LWAVE = .FALSE.\nLCHARG = .TRUE.\n",
    );
  });

  it("compresses runs in arrays as N*value", () => {
    expect(toINCAR({ MAGMOM: [5, 5, -5, -5, 0.6, 0.6, 0.6, 0.6] })).toBe(
      "MAGMOM = 2*5 2*-5 4*0.6\n",
    );
    expect(toINCAR({ MAGMOM: [1, 2, 3] })).toBe("MAGMOM = 1 2 3\n");
    // a one-element array stays an array on the way back in
    expect(toINCAR({ MAGMOM: [0.6] })).toBe("MAGMOM = 1*0.6\n");
    expect(fromINCAR(toINCAR({ MAGMOM: [0.6] }))).toEqual({ MAGMOM: [0.6] });
  });

  it("keeps the sign of -0, without merging it into runs of 0", () => {
    expect(toINCAR({ MAGMOM: [0, 0, -0, -0, 0] })).toBe("MAGMOM = 2*0 2*-0 0\n");
    expect(fromINCAR(toINCAR({ MAGMOM: [0, -0] }))).toEqual({ MAGMOM: [0, -0] });
  });

  it("writes logical arrays as T / F", () => {
    expect(toINCAR({ LATTICE_CONSTRAINTS: [true, true, false] })).toBe(
      "LATTICE_CONSTRAINTS = T T F\n",
    );
  });

  it("writes nested tags with their slash name", () => {
    expect(toINCAR({ "KERNEL_TRUNCATION/LTRUNCATE": true })).toBe(
      "KERNEL_TRUNCATION/LTRUNCATE = .TRUE.\n",
    );
  });

  it("accepts pattern tags such as XC1_P2", () => {
    expect(toINCAR({ XC: "PBE", XC1_P2: 0.8 })).toBe(
      "XC = PBE\nXC1_P2 = 0.8\n",
    );
  });

  it("writes keyword strings verbatim", () => {
    expect(toINCAR({ PREC: "Accurate", ALGO: "Normal" })).toBe(
      "PREC = Accurate\nALGO = Normal\n",
    );
  });

  it("skips undefined and non-finite values", () => {
    expect(toINCAR({ ENCUT: undefined, SIGMA: Number.NaN, NSW: 0 })).toBe(
      "NSW = 0\n",
    );
  });

  it("appends extra tags after the typed ones, upper-cased", () => {
    expect(
      toINCAR({ ENCUT: 400, extra: { ml_lmlff: true, Ml_Mode: "train" } }),
    ).toBe("ENCUT = 400\nML_LMLFF = .TRUE.\nML_MODE = train\n");
  });
});

describe("fromINCAR", () => {
  it("parses numbers, logicals and keywords", () => {
    expect(
      fromINCAR(`
ENCUT = 520
EDIFF = 1E-6
LWAVE = .FALSE.
LCHARG = T
PREC = Accurate
`),
    ).toEqual({
      ENCUT: 520,
      EDIFF: 1e-6,
      LWAVE: false,
      LCHARG: true,
      PREC: "Accurate",
    });
  });

  it("upper-cases keys and accepts Fortran d exponents", () => {
    expect(fromINCAR("ediff = 1d-5\nIsmear = -5")).toEqual({
      EDIFF: 1e-5,
      ISMEAR: -5,
    });
  });

  it("ignores ! and # comments, including whole comment lines", () => {
    expect(
      fromINCAR(`# a comment
ENCUT = 400 ! cutoff
! ISMEAR = 0
SIGMA = 0.1 # width`),
    ).toEqual({ ENCUT: 400, SIGMA: 0.1 });
  });

  it("splits several statements on one line at ;", () => {
    expect(fromINCAR("ISMEAR = 0; SIGMA = 0.05 ; NSW=10")).toEqual({
      ISMEAR: 0,
      SIGMA: 0.05,
      NSW: 10,
    });
  });

  it("joins \\ continuation lines", () => {
    expect(fromINCAR("MAGMOM = 1 2 \\\n  3 4\nNSW = 1")).toEqual({
      MAGMOM: [1, 2, 3, 4],
      NSW: 1,
    });
  });

  it("expands N*value repeats into arrays", () => {
    expect(fromINCAR("MAGMOM = 2*5.0 2*-5 1.5")).toEqual({
      MAGMOM: [5, 5, -5, -5, 1.5],
    });
    expect(fromINCAR("MAGMOM = 4*0")).toEqual({ MAGMOM: [0, 0, 0, 0] });
  });

  it("parses several logicals as a boolean array", () => {
    expect(fromINCAR("LATTICE_CONSTRAINTS = T T .FALSE.")).toEqual({
      LATTICE_CONSTRAINTS: [true, true, false],
    });
  });

  it("reads nested slash tags", () => {
    expect(fromINCAR("kernel_truncation/ltruncate = T")).toEqual({
      "KERNEL_TRUNCATION/LTRUNCATE": true,
    });
  });

  it("keeps a single number as a number (no schema to say it is an array)", () => {
    expect(fromINCAR("MAGMOM = 5")).toEqual({ MAGMOM: 5 });
  });

  it("keeps free text with spaces as a string", () => {
    expect(fromINCAR("SYSTEM = bulk Si, PBE")).toEqual({
      SYSTEM: "bulk Si, PBE",
    });
  });

  it("reads double-quoted multi-line values, ignoring ; and ! inside", () => {
    expect(
      fromINCAR(`SYSTEM = "line one; still one
line two ! not a comment"
NSW = 3`),
    ).toEqual({
      SYSTEM: "line one; still one\nline two ! not a comment",
      NSW: 3,
    });
  });
});

describe("INCAR round trip", () => {
  it("fromINCAR(toINCAR(x)) reproduces x", () => {
    const options: VaspIncarOptions = {
      SYSTEM: "AFM FeO",
      PREC: "Accurate",
      ENCUT: 520,
      EDIFF: 1e-6,
      ISMEAR: -5,
      ISPIN: 2,
      MAGMOM: [5, -5, 0.6, 0.6],
      LDAU: true,
      LDAUL: [2, -1],
      LDAUU: [5.3, 0],
      LWAVE: false,
      LATTICE_CONSTRAINTS: [true, false, true],
      "KERNEL_TRUNCATION/LTRUNCATE": true,
      extra: { ML_FOO: 1 },
    };
    const { extra, ...typed } = options;

    expect(fromINCAR(toINCAR(options))).toEqual({ ...typed, ...extra });
  });
});
