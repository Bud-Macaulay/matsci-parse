import { describe, it, expect } from "vitest";

import { fromCIF, toCIF } from "@/core/io/cif";
import { isDisordered } from "@/core/structure/disordered";

/**
 * Minimal P-1 CIF. Rows are [label, symbol, x, y, z, occupancy?]; the
 * occupancy column is written only when `withOccupancy` is set.
 */
function cif(rows: string[][], withOccupancy = true): string {
  return `data_test
_cell_length_a 4.0
_cell_length_b 5.0
_cell_length_c 6.0
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
loop_
_symmetry_equiv_pos_as_xyz
'x, y, z'
'-x, -y, -z'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
${withOccupancy ? "_atom_site_occupancy\n" : ""}${rows
    .map((r) => (withOccupancy ? r : r.slice(0, 5)).join(" "))
    .join("\n")}
`;
}

/** Sorted "symbol:fraction" lists per site, for order-free comparison. */
function occupancies(s: ReturnType<typeof fromCIF>): string[][] {
  if (!isDisordered(s)) throw new Error("expected a DisorderedStructure");
  return s.sites.map((site) =>
    site.occupancy.map((o) => `${o.symbol}:${+o.fraction.toFixed(6)}`).sort(),
  );
}

describe("fromCIF occupancy", () => {
  it("fully occupied file with an occupancy column stays ordered", () => {
    const rows = [
      ["Fe1", "Fe", "0.1", "0.2", "0.3", "1"],
      ["O1", "O", "0", "0", "0", "1.000"],
    ];
    const withCol = fromCIF(cif(rows));
    const withoutCol = fromCIF(cif(rows, false));
    expect(isDisordered(withCol)).toBe(false);
    expect(withCol).toEqual(withoutCol);
  });

  it('treats "." and "?" occupancies as fully occupied', () => {
    const s = fromCIF(
      cif([
        ["Fe1", "Fe", "0.1", "0.2", "0.3", "."],
        ["O1", "O", "0", "0", "0", "?"],
      ]),
    );
    expect(isDisordered(s)).toBe(false);
  });

  it("merges rows sharing a position into one disordered site", () => {
    const s = fromCIF(
      cif([
        ["M1", "Fe", "0.1", "0.2", "0.3", "0.5"],
        ["M2", "Ni", "0.1", "0.2", "0.3", "0.50(2)"],
        ["O1", "O", "0", "0", "0", "1"],
      ]),
    );
    expect(isDisordered(s)).toBe(true);
    if (!isDisordered(s)) return;
    // General position -> 2 images under P-1; O on the inversion centre -> 1.
    expect(s.sites.length).toBe(3);
    expect(occupancies(s)).toEqual([
      ["Fe:0.5", "Ni:0.5"],
      ["Fe:0.5", "Ni:0.5"],
      ["O:1"],
    ]);
    expect(Array.from(s.sites[1].frac)).toEqual([0.9, 0.8, 0.7]);
  });

  it("reads a single partially occupied species as a vacancy", () => {
    const s = fromCIF(cif([["Li1", "Li", "0.1", "0.2", "0.3", "0.691"]]));
    expect(occupancies(s)).toEqual([["Li:0.691"], ["Li:0.691"]]);
  });

  it("sums the same element listed twice at one position", () => {
    // Fe2+ and Fe3+ both clean to Fe.
    const s = fromCIF(
      cif([
        ["Fe1", "Fe2+", "0.1", "0.2", "0.3", "0.3"],
        ["Fe2", "Fe3+", "0.1", "0.2", "0.3", "0.2"],
        ["Ni1", "Ni", "0.1", "0.2", "0.3", "0.5"],
      ]),
    );
    expect(occupancies(s)[0]).toEqual(["Fe:0.5", "Ni:0.5"]);
  });

  it("renormalizes rounding just above 1", () => {
    const s = fromCIF(
      cif([
        ["A1", "Fe", "0.1", "0.2", "0.3", "0.334"],
        ["A2", "Ni", "0.1", "0.2", "0.3", "0.334"],
        ["A3", "Co", "0.1", "0.2", "0.3", "0.334"],
      ]),
    );
    if (!isDisordered(s)) throw new Error("expected disorder");
    const total = s.sites[0].occupancy.reduce((a, o) => a + o.fraction, 0);
    expect(total).toBeCloseTo(1, 12);
  });

  it("throws on overfilled sites", () => {
    expect(() =>
      fromCIF(
        cif([
          ["A1", "Fe", "0.1", "0.2", "0.3", "0.7"],
          ["A2", "Ni", "0.1", "0.2", "0.3", "0.5"],
        ]),
      ),
    ).toThrow(/fromCIF: occupancies at .* sum to 1\.2 \(overfilled site\)/);
  });

  it("handles disorder in a file without symmetry operations", () => {
    const text = cif([
      ["M1", "Fe", "0.1", "0.2", "0.3", "0.5"],
      ["M2", "Ni", "0.1", "0.2", "0.3", "0.5"],
    ]).replace(
      /loop_\n_symmetry_equiv_pos_as_xyz\n'x, y, z'\n'-x, -y, -z'\n/,
      "",
    );
    const s = fromCIF(text);
    expect(occupancies(s)).toEqual([["Fe:0.5", "Ni:0.5"]]);
  });

  it("toCIF rejects disordered structures", () => {
    const s = fromCIF(cif([["Li1", "Li", "0.1", "0.2", "0.3", "0.5"]]));
    // @ts-expect-error toCIF takes an ordered Structure
    expect(() => toCIF(s)).toThrow(/toCIF: .*disordered/);
  });
});
