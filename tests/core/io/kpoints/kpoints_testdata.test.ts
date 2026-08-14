import { describe, expect, it } from "vitest";

import { fromKPOINTS, toKPOINTS } from "@/core/io/kpoints";
import {
  vaspDensity1000,
  vaspDensity5000,
  vaspGammaMesh1x1x1,
  vaspGammaShifted,
  vaspLinePath,
  vaspListCartesian,
  vaspListCartesianWeighted,
  vaspListReciprocal,
  vaspListReciprocalWeighted,
  vaspListReciprocalWeightedLabeled,
  vaspMPShifted,
  vaspRealAutomatic,
  vaspTetrahedron,
} from "../teststrings/kpoints";

const mpOffset = (n: number) => (1 - n) / (2 * n);

const SIMPLE_POINTS = [
  { coordinate: [0, 0, 0] },
  { coordinate: [0.5, 0, 0] },
  { coordinate: [0, 0.5, 0] },
  { coordinate: [0, 0, 0.5] },
];

const ISOTROPIC_MESHES = Array.from({ length: 12 }, (_, i) => i + 1);
const ANISOTROPIC_MESHES = [
  [1, 1, 1],
  [1, 4, 8],
  [2, 2, 1],
  [2, 4, 8],
  [4, 4, 1],
  [4, 6, 8],
  [8, 8, 1],
  [12, 12, 1],
];

/** A mesh KPOINTS file in the same style as the kpoints_testdata catalog. */
function meshKpoints(scheme: "Gamma" | "Monkhorst", mesh: number[]): string {
  const name = mesh.every((n) => n === mesh[0])
    ? mesh.join("x")
    : `(${mesh.join(", ")})`;
  return `${scheme} ${name}\n0\n${scheme}\n${mesh.join(" ")}\n`;
}

describe("kpoints test data", () => {
  it("rejects the fully-automatic mode", () => {
    expect(() => fromKPOINTS(vaspRealAutomatic)).toThrow(
      "KPOINTS fully-automatic mode is not yet supported",
    );
  });

  it("parses gamma grids", () => {
    expect(fromKPOINTS(vaspGammaMesh1x1x1)).toEqual({
      mesh: [1, 1, 1],
      origin: [0, 0, 0],
    });
    expect(fromKPOINTS(vaspGammaShifted)).toEqual({
      mesh: [6, 8, 10],
      origin: [0.5, 0.5, 0],
    });
  });

  it("parses Monkhorst-Pack grids", () => {
    expect(fromKPOINTS(vaspMPShifted)).toEqual({
      mesh: [5, 7, 9],
      origin: [mpOffset(5) + 0.5, mpOffset(7) + 0.5, mpOffset(9) + 0.5],
    });
  });

  it("parses density-derived grids", () => {
    expect(fromKPOINTS(vaspDensity1000)).toEqual({
      mesh: [7, 7, 7],
      origin: [0, 0, 0],
    });
    expect(fromKPOINTS(vaspDensity5000)).toEqual({
      mesh: [13, 13, 13],
      origin: [0, 0, 0],
    });
  });

  it("matches every generated mesh to its name", () => {
    for (const scheme of ["Gamma", "Monkhorst"] as const) {
      for (const mesh of ISOTROPIC_MESHES) {
        expect(
          fromKPOINTS(meshKpoints(scheme, [mesh, mesh, mesh])),
        ).toEqual({
          mesh: [mesh, mesh, mesh],
          origin: scheme === "Gamma" ? [0, 0, 0] : [mesh, mesh, mesh].map(mpOffset),
        });
      }
      for (const mesh of ANISOTROPIC_MESHES) {
        expect(fromKPOINTS(meshKpoints(scheme, mesh))).toEqual({
          mesh,
          origin: scheme === "Gamma" ? [0, 0, 0] : mesh.map(mpOffset),
        });
      }
    }
  });

  it("parses reciprocal lists, with and without weights and labels", () => {
    expect(fromKPOINTS(vaspListReciprocal)).toEqual({
      points: SIMPLE_POINTS,
      weights: [1, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });
    expect(fromKPOINTS(vaspListReciprocalWeighted)).toEqual({
      points: SIMPLE_POINTS,
      weights: [2, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });
    expect(fromKPOINTS(vaspListReciprocalWeightedLabeled)).toEqual({
      points: SIMPLE_POINTS,
      weights: [2, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("parses Cartesian lists and ignores labels", () => {
    expect(fromKPOINTS(vaspListCartesian)).toEqual({
      points: SIMPLE_POINTS,
      weights: [1, 1, 1, 1],
      coordinateSystem: "cartesian",
    });
    expect(fromKPOINTS(vaspListCartesianWeighted)).toEqual({
      points: SIMPLE_POINTS,
      weights: [2, 1, 1, 1],
      coordinateSystem: "cartesian",
    });
  });

  it("parses the tetrahedron k-point list, ignoring the block", () => {
    const parsed = fromKPOINTS(vaspTetrahedron);
    expect(parsed).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0, 0] },
        { coordinate: [0, 0.5, 0] },
        { coordinate: [0, 0, 0.5] },
        { coordinate: [0.5, 0.5, 0] },
        { coordinate: [0.5, 0, 0.5] },
        { coordinate: [0, 0.5, 0.5] },
        { coordinate: [0.5, 0.5, 0.5] },
      ],
      weights: [1, 1, 1, 1, 1, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("parses the line-mode path", () => {
    expect(fromKPOINTS(vaspLinePath)).toEqual({
      points: {
        "\\Gamma": [0, 0, 0],
        P: [0.5, -0.49999999999999994, 0.5],
        Z: [0.5, -0.5, 0.5],
        Q: [0.5000000000000001, 0.5000000000000001, 0.5000000000000001],
        F: [0.5, -0.5, 0],
        P_1: [0.49999999999999994, -0.5, -0.5],
        Q_1: [
          0.4999999999999999,
          -0.5000000000000001,
          -0.5000000000000001,
        ],
        L: [0.5, 0, 0],
      },
      segments: [
        ["\\Gamma", "P"],
        ["P", "Z"],
        ["Z", "Q"],
        ["Q", "\\Gamma"],
        ["\\Gamma", "F"],
        ["F", "P_1"],
        ["P_1", "Q_1"],
        ["Q_1", "L"],
        ["L", "Z"],
      ],
    });
  });

  it("rejects Cartesian line-mode for now", () => {
    expect(() => fromKPOINTS("c\n20\nLine-mode\nCartesian\n0 0 0 G\n0 0 1 X\n")).toThrow(
      "KPOINTS Cartesian line-mode is not yet supported",
    );
  });

  it("serializes every parseable fixture stably", () => {
    const fixtures = [
      ["02_gamma/1x1x1", vaspGammaMesh1x1x1],
      ["02_gamma/shifted", vaspGammaShifted],
      ["03_monkhorst/shifted", vaspMPShifted],
      ["04_line_mode/automatic", vaspLinePath],
      ["05_reciprocal/labeled", vaspListReciprocal],
      ["05_reciprocal/weighted", vaspListReciprocalWeighted],
      ["05_reciprocal/weighted_labeled", vaspListReciprocalWeightedLabeled],
      ["06_cartesian/labeled", vaspListCartesian],
      ["06_cartesian/weighted", vaspListCartesianWeighted],
      ["07_tetrahedron/basic", vaspTetrahedron],
      ["08_density/kppa_1000", vaspDensity1000],
      ["08_density/kppa_5000", vaspDensity5000],
    ] as const;
    for (const [name, text] of fixtures) {
      const once = fromKPOINTS(toKPOINTS(fromKPOINTS(text)));
      expect(fromKPOINTS(toKPOINTS(once)), name).toEqual(once);
    }
  });
});
