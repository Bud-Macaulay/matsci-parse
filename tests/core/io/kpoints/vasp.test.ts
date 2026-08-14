import { describe, expect, it } from "vitest";

import { fromKPOINTS, toKPOINTS } from "@/core/io/kpoints";

import * as fixtures from "../teststrings/kpoints";

describe("fromKPOINTS", () => {
  it("parses a Gamma-centered automatic mesh", () => {
    expect(fromKPOINTS(fixtures.vaspGammaGrid)).toEqual({
      mesh: [4, 4, 4],
      origin: [0, 0, 0],
    });
  });

  it("parses a Monkhorst-Pack automatic mesh", () => {
    expect(fromKPOINTS(fixtures.vaspMPGrid)).toEqual({
      mesh: [4, 4, 4],
      origin: [-3 / 8, -3 / 8, -3 / 8],
    });
  });

  it("adds the shift to the Monkhorst-Pack origin", () => {
    const text = `
comment
0
Monkhorst-Pack
8 8 8
0.5 0.5 0.5
`;
    expect(fromKPOINTS(text)).toEqual({
      mesh: [8, 8, 8],
      origin: [1 / 16, 1 / 16, 1 / 16],
    });
  });

  it("uses the shift as the origin of a Gamma-centered grid", () => {
    const text = `
comment
0
Gamma
2 2 2
0.5 0.25 0.1
`;
    expect(fromKPOINTS(text)).toEqual({
      mesh: [2, 2, 2],
      origin: [0.5, 0.25, 0.1],
    });
  });

  it("offsets the origin of a Monkhorst-Pack grid to centre it", () => {
    const text = `
comment
0
Monkhorst-Pack
4 6 8
0 0 0
`;
    expect(fromKPOINTS(text)).toEqual({
      mesh: [4, 6, 8],
      origin: [-3 / 8, -5 / 12, -7 / 16],
    });
  });

  it("accepts the short mesh scheme names", () => {
    const gamma = fromKPOINTS("c\n0\nG\n2 2 2\n0 0 0");
    expect(gamma).toEqual({ mesh: [2, 2, 2], origin: [0, 0, 0] });

    const mp = fromKPOINTS("c\n0\nM\n2 2 2\n0 0 0");
    expect(mp).toEqual({ mesh: [2, 2, 2], origin: [-1 / 4, -1 / 4, -1 / 4] });
  });

  it("parses a real Gamma file without a shift line", () => {
    expect(fromKPOINTS(fixtures.vaspRealGamma)).toEqual({
      mesh: [4, 4, 4],
      origin: [0, 0, 0],
    });
  });

  it("parses a real Monkhorst-Pack file without a shift line", () => {
    expect(fromKPOINTS(fixtures.vaspRealMonkhorst)).toEqual({
      mesh: [4, 4, 4],
      origin: [-3 / 8, -3 / 8, -3 / 8],
    });
  });

  it("parses real explicit Cartesian and reciprocal lists", () => {
    expect(fromKPOINTS(fixtures.vaspRealCartesian)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0, 0] },
        { coordinate: [0, 0.5, 0] },
      ],
      weights: [1, 1, 1],
      coordinateSystem: "cartesian",
    });

    expect(fromKPOINTS(fixtures.vaspRealReciprocal)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0, 0] },
        { coordinate: [0, 0.5, 0] },
      ],
      weights: [1, 1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("rejects the deprecated fully-automatic mode", () => {
    expect(() => fromKPOINTS(fixtures.vaspRealAutomatic)).toThrow(
      "KPOINTS fully-automatic mode is not yet supported",
    );
  });

  it("parses an explicit reciprocal k-point list", () => {
    expect(fromKPOINTS(fixtures.vaspList)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0, 0, 0.5] },
        { coordinate: [0, 0.5, 0.5] },
        { coordinate: [0.5, 0.5, 0.5] },
      ],
      weights: [1, 1, 2, 4],
      coordinateSystem: "reciprocal",
    });
  });

  it("parses a Cartesian k-point list", () => {
    expect(fromKPOINTS(fixtures.vaspCartesianList)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.1, 0.2, 0.3] },
      ],
      weights: [1, 2],
      coordinateSystem: "cartesian",
    });
  });

  it("defaults a missing point weight to 1", () => {
    expect(fromKPOINTS("c\n2\nReciprocal\n0 0 0\n0 0 0.5")).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0, 0, 0.5] },
      ],
      weights: [1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("accepts abbreviated and lower-case coordinate systems", () => {
    expect(fromKPOINTS("c\n1\nr\n0 0 0")).toMatchObject({
      coordinateSystem: "reciprocal",
    });
    expect(fromKPOINTS("c\n1\nC\n0 0 0")).toMatchObject({
      coordinateSystem: "cartesian",
    });
    expect(fromKPOINTS("c\n1\nfrac\n0 0 0")).toMatchObject({
      coordinateSystem: "reciprocal",
    });
  });

  it("parses a reciprocal line-mode band path", () => {
    expect(fromKPOINTS(fixtures.vaspLineMode)).toEqual({
      points: {
        G: [0, 0, 0],
        X: [0.5, 0.5, 0],
        W: [0.5, 0.75, 0.25],
      },
      segments: [
        ["G", "X"],
        ["X", "W"],
      ],
    });
  });

  it("parses line-mode labels after '!'", () => {
    const text = `
path
10
Line mode
Reciprocal
0.0 0.0 0.0 ! Gamma
0.5 0.0 0.0 ! X
`;
    expect(fromKPOINTS(text)).toEqual({
      points: {
        Gamma: [0, 0, 0],
        X: [0.5, 0, 0],
      },
      segments: [["Gamma", "X"]],
    });
  });

  it("auto-names unlabeled line-mode points", () => {
    const text = `
path
10
Line-mode
Reciprocal
0 0 0
0.5 0.5 0.5
`;
    expect(fromKPOINTS(text)).toEqual({
      points: {
        k1: [0, 0, 0],
        k2: [0.5, 0.5, 0.5],
      },
      segments: [["k1", "k2"]],
    });
  });

  it("rejects Cartesian line-mode for now", () => {
    const text = `
path
10
Line-mode
Cartesian
0 0 0 G
0 0 1 X
`;
    expect(() => fromKPOINTS(text)).toThrow(
      "KPOINTS Cartesian line-mode is not yet supported",
    );
  });

  it("throws on a segment with an odd number of points", () => {
    const text = `
path
10
Line-mode
Reciprocal
0 0 0 G
0.5 0.5 0 X
0.5 0.75 0.25 W
`;
    expect(() => fromKPOINTS(text)).toThrow(
      "KPOINTS line-mode segments must come in pairs of lines",
    );
  });

  it("throws when a label is reused for different coordinates", () => {
    const text = `
path
10
Line-mode
Reciprocal
0 0 0 X
0.5 0.5 0 X
`;
    expect(() => fromKPOINTS(text)).toThrow(
      "KPOINTS label 'X' is used for two different k-points",
    );
  });

  it("throws on a tetrahedron block", () => {
    expect(() => fromKPOINTS("tetrahedron\n-1\nTetrahedron\n")).toThrow(
      "Unknown KPOINTS coordinate system 'Tetrahedron'",
    );
  });

  it("throws on a non-numeric mode line", () => {
    expect(() => fromKPOINTS("c\nlots\nGamma\n")).toThrow(
      "Unsupported KPOINTS mode 'lots'",
    );
  });

  it("throws on an unknown coordinate system", () => {
    expect(() => fromKPOINTS("c\n1\nPolar\n0 0 0")).toThrow(
      "Unknown KPOINTS coordinate system 'Polar'",
    );
  });

  it("throws on a point row with too few numbers", () => {
    expect(() => fromKPOINTS("c\n2\nReciprocal\n0 0\n0 0 0 1")).toThrow(
      "Invalid KPOINTS point: '0 0'",
    );
  });

  it("throws on a non-numeric point row", () => {
    expect(() => fromKPOINTS("c\n1\nReciprocal\na b c")).toThrow(
      "Invalid KPOINTS point: 'a b c'",
    );
  });

  it("throws when the list is shorter than its count", () => {
    expect(() => fromKPOINTS("c\n3\nReciprocal\n0 0 0 1\n0 0 0.5 1")).toThrow(
      "Unexpected EOF",
    );
  });

  it("throws on an empty file", () => {
    expect(() => fromKPOINTS("")).toThrow("too short");
  });

  it("throws on an invalid mesh line", () => {
    expect(() => fromKPOINTS("c\n0\nGamma\n4 4\n0 0 0")).toThrow(
      "Invalid KPOINTS mesh",
    );
  });

  it("throws on an invalid shift line", () => {
    expect(() => fromKPOINTS("c\n0\nGamma\n4 4 4\n0 0")).toThrow(
      "Invalid KPOINTS shift",
    );
  });
});

describe("toKPOINTS", () => {
  it("writes a Gamma-centered grid with the origin as the shift", () => {
    expect(
      toKPOINTS({ mesh: [4, 4, 4], origin: [0, 0, 0] }),
    ).toBe("Automatic mesh\n0\nGamma\n4 4 4\n0 0 0");
  });

  it("writes a shifted Gamma-centered grid", () => {
    expect(
      toKPOINTS({ mesh: [2, 2, 2], origin: [0.5, 0.25, 0.1] }),
    ).toBe("Automatic mesh\n0\nGamma\n2 2 2\n0.5 0.25 0.1");
  });

  it("detects a canonical Monkhorst-Pack origin", () => {
    expect(
      toKPOINTS({ mesh: [8, 8, 8], origin: [-0.4375, -0.4375, -0.4375] }),
    ).toBe("Automatic mesh\n0\nMonkhorst-Pack\n8 8 8\n0 0 0");
  });

  it("writes a band path in reciprocal line mode", () => {
    expect(
      toKPOINTS({
        points: {
          G: [0, 0, 0],
          X: [0.5, 0.5, 0],
        },
        segments: [["G", "X"]],
      }),
    ).toBe("Band path\n40\nLine-mode\nReciprocal\n0 0 0 G\n0.5 0.5 0 X");
  });

  it("honors the requested points-per-line density for a band path", () => {
    const path = fromKPOINTS(fixtures.vaspLineMode);
    expect(toKPOINTS(path, 12)).toMatch(/^Band path\n12\n/);
    expect(fromKPOINTS(toKPOINTS(path, 12))).toEqual(path);
    expect(toKPOINTS(path, 0.5)).toMatch(/^Band path\n1\n/);
    expect(toKPOINTS(path, 40.4)).toMatch(/^Band path\n40\n/);
  });

  it("round-trips a band path", () => {
    const path = fromKPOINTS(fixtures.vaspLineMode);
    expect(fromKPOINTS(toKPOINTS(path))).toEqual(path);
  });

  it("round-trips a Gamma-centered mesh", () => {
    const grid = fromKPOINTS(fixtures.vaspGammaGrid);
    expect(fromKPOINTS(toKPOINTS(grid))).toEqual(grid);
  });

  it("round-trips a Monkhorst-Pack mesh as Monkhorst-Pack", () => {
    const grid = fromKPOINTS(fixtures.vaspMPGrid);
    expect(toKPOINTS(grid)).toBe(
      "Automatic mesh\n0\nMonkhorst-Pack\n4 4 4\n0 0 0",
    );
    expect(fromKPOINTS(toKPOINTS(grid))).toEqual(grid);
  });

  it("round-trips real meshes that omit the shift line", () => {
    expect(fromKPOINTS(toKPOINTS(fromKPOINTS(fixtures.vaspRealGamma)))).toEqual({
      mesh: [4, 4, 4],
      origin: [0, 0, 0],
    });
    expect(
      fromKPOINTS(toKPOINTS(fromKPOINTS(fixtures.vaspRealMonkhorst))),
    ).toEqual({ mesh: [4, 4, 4], origin: [-3 / 8, -3 / 8, -3 / 8] });
  });

  it("round-trips real explicit lists", () => {
    for (const fixture of [fixtures.vaspRealCartesian, fixtures.vaspRealReciprocal]) {
      const parsed = fromKPOINTS(fixture);
      expect(fromKPOINTS(toKPOINTS(parsed))).toEqual(parsed);
    }
  });

  it("writes an irregular reciprocal list back as a list", () => {
    const parsed = fromKPOINTS(fixtures.vaspList);
    expect(toKPOINTS(parsed)).toBe(
      "K-points list\n4\nReciprocal\n0 0 0 1\n0 0 0.5 1\n0 0.5 0.5 2\n0.5 0.5 0.5 4",
    );
    expect(fromKPOINTS(toKPOINTS(parsed))).toEqual(parsed);
  });

  it("round-trips a Cartesian list as a list", () => {
    const parsed = fromKPOINTS(fixtures.vaspCartesianList);
    expect(toKPOINTS(parsed)).toBe(
      "K-points list\n2\nCartesian\n0 0 0 1\n0.1 0.2 0.3 2",
    );
    expect(fromKPOINTS(toKPOINTS(parsed))).toEqual(parsed);
  });

  it("canonicalizes a uniform reciprocal grid to a mesh", () => {
    const list = fromKPOINTS(`
K-points list
8
Reciprocal
0 0 0 1
0.5 0 0 1
0 0.5 0 1
0.5 0.5 0 1
0 0 0.5 1
0.5 0 0.5 1
0 0.5 0.5 1
0.5 0.5 0.5 1
`);
    expect(list).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0, 0] },
        { coordinate: [0, 0.5, 0] },
        { coordinate: [0.5, 0.5, 0] },
        { coordinate: [0, 0, 0.5] },
        { coordinate: [0.5, 0, 0.5] },
        { coordinate: [0, 0.5, 0.5] },
        { coordinate: [0.5, 0.5, 0.5] },
      ],
      weights: [1, 1, 1, 1, 1, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });

    const grid = { mesh: [2, 2, 2], origin: [0, 0, 0] };
    expect(toKPOINTS(list)).toBe("Automatic mesh\n0\nGamma\n2 2 2\n0 0 0");
    expect(fromKPOINTS(toKPOINTS(list))).toEqual(grid);
  });

  it("does not canonicalize a grid with non-uniform weights", () => {
    const list = fromKPOINTS(`
K-points list
2
Reciprocal
0 0 0 1
0.5 0 0 2
`);
    expect(toKPOINTS(list)).toBe(
      "K-points list\n2\nReciprocal\n0 0 0 1\n0.5 0 0 2",
    );
  });
});
