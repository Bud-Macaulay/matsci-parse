import { describe, expect, it, vi } from "vitest";

import { CRYSTAL_MAX_BAND_LINES, toCrystalD3, fromCrystalD3 } from "@/core/io/kpoints";
import { fromPOSCAR } from "@/core/io/poscar";
import type { KPath } from "@/core/kpoints/kpoints";
import { getPath } from "@/core/structure/operations/symmetry/brilliounzone/seekpath";
import { POSCARS } from "../../../helpers/bulkFiles/allExtBrav";

// The example of the CRYSTAL manual (properties keyword BAND; CRYSTAL14
// p. 198, the same in CRYSTAL17): MgO, ISS = 12, so "6 0 6" is
// 6/12 b1 + 0 b2 + 6/12 b3.
const mgo = `BAND
MGO
2 12 30 1 18 1 0
0 0 0 6 0 6
6 0 6 6 3 9`;

// The same path with the ends named, as toCrystalD3 writes them
const header = (counts: string) =>
  `${counts} <first_band> <last_band> 1 0   ! NLINE ISS NSUB INZB IFNB IPLO LPR66: set INZB, IFNB, the first and last band`;
const named = `BAND
fcc
${header("3 4 120")}
0 0 0 2 0 2   GAMMA -> X
2 0 2 2 1 3   X -> W
2 1 3 0 0 0   W -> GAMMA`;

/** Every number of the segment lines is an integer (CRYSTAL reads I1..J3). */
const segmentEndsAreIntegers = (text: string) => {
  const lines = text.split("\n");
  const nline = Number(lines[2].split(/\s+/)[0]);
  return lines
    .slice(3, 3 + nline)
    .every((line) => line.trim().split(/\s+/).slice(0, 6).every((t) => /^-?\d+$/.test(t)));
};

describe("fromCrystalD3", () => {
  it("reads the manual's example: the ends in units of 1/ISS", () => {
    const path = fromCrystalD3(mgo);

    expect(path.kind).toBe("path");
    expect(path.segments).toEqual([
      ["k1", "k2"],
      ["k2", "k3"],
    ]);
    expect(path.points).toEqual({
      k1: [0, 0, 0],
      k2: [0.5, 0, 0.5],
      k3: [0.5, 0.25, 0.75],
    });
  });

  it("names the ends from the comments", () => {
    const path = fromCrystalD3(named);

    expect(path.segments).toEqual([
      ["GAMMA", "X"],
      ["X", "W"],
      ["W", "GAMMA"],
    ]);
    expect(path.points.X).toEqual([0.5, 0, 0.5]);
    expect(path.points.W).toEqual([0.5, 0.25, 0.75]);
  });

  it("rejects ISS = 0 (CRYSTAL's own point labels)", () => {
    const labels = "BAND\nMGO\n2 0 30 1 18 1 0\nG X\nX W";
    expect(() => fromCrystalD3(labels)).toThrow("ISS = 0");
  });

  it("throws when the header declares more segments than lines", () => {
    const text = `BAND
title
5 4 0 0 0 1
0 0 0 1 1 1`;
    expect(() => fromCrystalD3(text)).toThrow(
      "declares 5 segments but only 1 lines remain",
    );
  });

  it("throws without NLINE and ISS", () => {
    expect(() => fromCrystalD3("BAND\nx\n2\n0 0 0 1 1 1\n1 1 1 0 0 0")).toThrow(
      "expected NLINE and ISS",
    );
  });

  it("throws when the file does not start with BAND", () => {
    expect(() => fromCrystalD3("K-POINTS\nx\n1 1 0 0 0 1\n0 0 0 1 1 1")).toThrow(
      "must start with 'BAND'",
    );
  });
});

describe("toCrystalD3", () => {
  const fcc: KPath = {
    kind: "path",
    points: { GAMMA: [0, 0, 0], X: [0.5, 0, 0.5], W: [0.5, 0.25, 0.75] },
    segments: [
      ["GAMMA", "X"],
      ["X", "W"],
      ["W", "GAMMA"],
    ],
  };

  it("writes the ends as integers, with the smallest exact shrinking factor", () => {
    expect(toCrystalD3(fcc, "fcc")).toBe(named);
  });

  it("finds the shrinking factor of thirds and halves (hexagonal: 6)", () => {
    const hex: KPath = {
      kind: "path",
      points: { GAMMA: [0, 0, 0], M: [0.5, 0, 0], K: [1 / 3, 1 / 3, 0] },
      segments: [
        ["GAMMA", "M"],
        ["M", "K"],
      ],
    };
    const lines = toCrystalD3(hex).split("\n");
    expect(lines[2]).toBe(header("2 6 80"));
    expect(lines[4]).toBe("3 0 0 2 2 0   M -> K");
  });

  it("rounds coordinates that are not simple fractions to 1e-6 (ISS = 10^6)", () => {
    const zeta = 0.2856193; // e.g. a point from an irrational cell ratio
    const path: KPath = {
      kind: "path",
      points: { GAMMA: [0, 0, 0], F: [0.5, zeta, -zeta] },
      segments: [["GAMMA", "F"]],
    };
    const text = toCrystalD3(path);
    expect(text.split("\n")[2]).toBe(header("1 1000000 40"));
    expect(segmentEndsAreIntegers(text)).toBe(true);
    const back = fromCrystalD3(text).points.F;
    expect(Math.max(...back.map((x, i) => Math.abs(x - path.points.F[i])))).toBeLessThanOrEqual(5e-7);
  });

  it("writes the total k-point count as segments × points per segment", () => {
    expect(toCrystalD3(fcc, "", 15).split("\n")[2]).toBe(header("3 4 45"));
  });

  it("uses the path density when no explicit point count is given", () => {
    expect(toCrystalD3({ ...fcc, density: 20 }).split("\n")[2]).toBe(header("3 4 60"));
  });

  it("round-trips", () => {
    const path = fromCrystalD3(named);
    expect(fromCrystalD3(toCrystalD3(path, "fcc"))).toEqual(path);
  });

  it("writes more than 20 lines all the same, with a warning in the title", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const segments = Array.from({ length: 24 }, (_, i): [string, string] =>
      i % 2 ? ["X", "GAMMA"] : ["GAMMA", "X"],
    );
    const lines = toCrystalD3({ ...fcc, segments }, "seekpath").split("\n");

    expect(CRYSTAL_MAX_BAND_LINES).toBe(20);
    expect(lines[1]).toBe("WARNING: 24 lines, CRYSTAL reads at most 20; seekpath");
    expect(lines[2]).toBe(header("24 2 960"));
    expect(lines).toHaveLength(3 + 24);
    expect(warn).toHaveBeenCalledWith("toCrystalD3: WARNING: 24 lines, CRYSTAL reads at most 20");
    warn.mockRestore();
  });

  it("does not warn up to 20 lines", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toCrystalD3(fcc, "fcc").split("\n")[1]).toBe("fcc");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("rejects non-path k-point data", () => {
    expect(() =>
      toCrystalD3({
        kind: "grid",
        mesh: [4, 4, 4],
        origin: [0, 0, 0],
        scheme: "gamma-centered",
      }),
    ).toThrow("only supports KPath");
  });
});

// The seekpath paths of every extended Bravais lattice (with and without
// time reversal): integer ends, read back to the path's coordinates
describe("toCrystalD3 of seekpath paths", () => {
  const cases = Object.entries(POSCARS).flatMap(([key, poscar]) =>
    [true, false].map((withTimeReversal) => ({ key, poscar, withTimeReversal })),
  );

  it.each(cases)("$key (time reversal: $withTimeReversal)", async ({ poscar, withTimeReversal }) => {
    const { kpath } = await getPath(fromPOSCAR(poscar), { withTimeReversal });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {}); // > 20 lines
    const text = toCrystalD3(kpath);
    warn.mockRestore();

    expect(segmentEndsAreIntegers(text)).toBe(true);
    const back = fromCrystalD3(text);
    expect(back.segments).toEqual(kpath.segments);
    for (const [name, coords] of Object.entries(kpath.points)) {
      if (!(name in back.points)) continue; // a point not on the path
      const diff = Math.max(...coords.map((x, i) => Math.abs(x - back.points[name][i])));
      expect(diff, name).toBeLessThanOrEqual(5e-7);
    }
  });
});
