import { describe, expect, it } from "vitest";

import { fromINCAR, toVaspInput } from "@/core/io/vasp";
import { fromPOSCAR, poscarOrder, toPOSCAR } from "@/core/io/poscar";
import { fromKPOINTS } from "@/core/io/kpoints";
import { kspacingToGrid } from "@/core/lattice/kspacingToGrid";
import { createLattice } from "@/core/lattice/lattice";
import type { Structure } from "@/core/structure/structure";

/** Interleaved sites, so POSCAR order (Fe Fe O O) differs from site order. */
function feOFeO(): Structure {
  return {
    lattice: createLattice([4.3, 4.3, 4.3]),
    sites: [
      { species: { symbol: "Fe" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "O" }, frac: new Float64Array([0.5, 0, 0]) },
      { species: { symbol: "Fe" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
      { species: { symbol: "O" }, frac: new Float64Array([0, 0.5, 0.5]) },
    ],
  };
}

describe("poscarOrder", () => {
  it("groups sites by element in first-appearance order", () => {
    expect(poscarOrder(feOFeO())).toEqual({
      species: ["Fe", "O"],
      counts: [2, 2],
      order: [0, 2, 1, 3],
    });
  });
});

describe("toVaspInput", () => {
  it("writes POSCAR exactly as toPOSCAR does", () => {
    const s = feOFeO();
    expect(toVaspInput(s, { poscarComment: "FeO" }).POSCAR).toBe(
      toPOSCAR(s, { title: "FeO" }),
    );
  });

  it("writes incar tags as given", () => {
    const { INCAR } = toVaspInput(feOFeO(), {
      incar: { ENCUT: 520, ISPIN: 2, extra: { ML_LMLFF: false } },
    });
    expect(fromINCAR(INCAR)).toEqual({ ENCUT: 520, ISPIN: 2, ML_LMLFF: false });
  });

  it("reorders per-site MAGMOM so each value lands on its atom", () => {
    const s = feOFeO();
    // structure order: Fe(up), O, Fe(down), O
    const { POSCAR, INCAR } = toVaspInput(s, {
      perSite: { MAGMOM: [5, 0.6, -5, 0.7] },
    });

    const magmom = fromINCAR(INCAR).MAGMOM as number[];
    const written = fromPOSCAR(POSCAR);
    const bySite = written.sites.map((site, i) => [site.species.symbol, magmom[i]]);

    expect(bySite).toEqual([
      ["Fe", 5],
      ["Fe", -5],
      ["O", 0.6],
      ["O", 0.7],
    ]);
  });

  it("flattens noncollinear MAGMOM vectors in POSCAR order", () => {
    const { INCAR } = toVaspInput(feOFeO(), {
      perSite: {
        MAGMOM: [
          [0, 0, 5],
          [0, 0, 0],
          [0, 0, -5],
          [1, 0, 0],
        ],
      },
    });
    expect(fromINCAR(INCAR).MAGMOM).toEqual([0, 0, 5, 0, 0, -5, 0, 0, 0, 1, 0, 0]);
  });

  it("writes per-element values in POSCAR species order", () => {
    const { INCAR } = toVaspInput(feOFeO(), {
      incar: { LDAU: true },
      perSpecies: {
        LDAUL: { O: -1, Fe: 2 },
        LDAUU: { O: 0, Fe: 5.3 },
      },
    });
    expect(fromINCAR(INCAR)).toEqual({
      LDAU: true,
      LDAUL: [2, -1],
      LDAUU: [5.3, 0],
    });
  });

  it("rejects a per-site array of the wrong length", () => {
    expect(() =>
      toVaspInput(feOFeO(), { perSite: { MAGMOM: [5, -5] } }),
    ).toThrow("perSite.MAGMOM has 2 values but the structure has 4 sites");
  });

  it("rejects a per-element map missing an element", () => {
    expect(() =>
      toVaspInput(feOFeO(), { perSpecies: { LDAUU: { Fe: 5.3 } } }),
    ).toThrow("perSpecies.LDAUU has no value for O");
  });

  it("rejects a tag set both directly and per site / per element", () => {
    expect(() =>
      toVaspInput(feOFeO(), {
        incar: { MAGMOM: [1, 1, 1, 1] },
        perSite: { MAGMOM: [5, 0, -5, 0] },
      }),
    ).toThrow("MAGMOM set both in incar and in perSite/perSpecies");
    expect(() =>
      toVaspInput(feOFeO(), {
        incar: { extra: { LDAUU: [1, 1] } },
        perSpecies: { LDAUU: { Fe: 5, O: 0 } },
      }),
    ).toThrow("LDAUU set both in incar and in perSite/perSpecies");
  });

  it("writes no KPOINTS unless asked", () => {
    expect(toVaspInput(feOFeO()).KPOINTS).toBeUndefined();
  });

  it("writes a canonical k-point specification", () => {
    const { KPOINTS } = toVaspInput(feOFeO(), {
      kpoints: { kind: "grid", mesh: [4, 4, 4], origin: [0, 0, 0], scheme: "gamma-centered" },
    });
    expect(fromKPOINTS(KPOINTS!)).toMatchObject({ kind: "grid", mesh: [4, 4, 4] });
  });

  it("turns a spacing into a Gamma-centered mesh", () => {
    const s = feOFeO();
    const { KPOINTS } = toVaspInput(s, { kpoints: { spacing: 0.25 } });
    expect(fromKPOINTS(KPOINTS!)).toEqual({
      kind: "grid",
      mesh: kspacingToGrid(s.lattice, 0.25),
      origin: [0, 0, 0],
      scheme: "gamma-centered",
    });
  });
});
