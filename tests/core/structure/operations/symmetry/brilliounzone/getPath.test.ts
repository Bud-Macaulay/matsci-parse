import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import {
  getExplicitFromImplicit,
  getExplicitKPath,
  getPath,
} from "@/core/structure/operations/symmetry/brilliounzone/seekpath";

const refs = JSON.parse(
  readFileSync(join(process.cwd(), "tests/helpers/seekpathReference.json"), "utf8"),
);

const cases = Object.entries(POSCARS).map(([key, poscar]) => ({
  key,
  poscar,
  expected: key.split("/")[0],
}));

const toRefKey = (key: string) =>
  key.replace("/POSCAR_", "/POSCAR/").replace("_alternate", "/alternate");

describe("getPath integration over all POSCARs", () => {
  it.each(cases)(
    "$key → bravais_lattice_extended $expected",
    async ({ key, poscar, expected }) => {
      const structure = fromPOSCAR(poscar);
      const result = await getPath(structure);
      const ref = refs.find((r) => r.key === toRefKey(key))!;

      expect(result.bravais_lattice_extended, `${key} mismatch`).toBe(expected);
      expect(result.bravais_lattice).toBe(expected.replace(/\d+$/, ""));
      expect(result.has_inversion_symmetry).toBe(ref.has_inversion_symmetry);
      expect(result.spacegroup_number).toBe(ref.spacegroup_number);
      expect(result.spacegroup_international.length).toBeGreaterThan(0);
    },
  );

  it.each(cases)("$key path points are well-formed", async ({ poscar, key }) => {
    const result = await getPath(fromPOSCAR(poscar));

    // All path segments reference defined points
    for (const [start, stop] of result.path) {
      expect(result.point_coords[start], `${key}: missing ${start}`).toBeDefined();
      expect(result.point_coords[stop], `${key}: missing ${stop}`).toBeDefined();
    }

    // Coordinates are fractional-ish (within [-1.5, 1.5])
    for (const [name, coords] of Object.entries(result.point_coords)) {
      for (const x of coords) {
        expect(x, `${key}: ${name} coord ${x}`).toBeGreaterThan(-1.5);
        expect(x, `${key}: ${name} coord ${x}`).toBeLessThan(1.5);
      }
    }
  });

  it.each(cases)(
    "$key cell volumes and atom counts are consistent",
    async ({ poscar, key }) => {
      const result = await getPath(fromPOSCAR(poscar));

      expect(result.volume_original_wrt_conv, `${key}`).toBeGreaterThan(0);
      expect(result.volume_original_wrt_prim, `${key}`).toBeGreaterThan(0);

      expect(result.primitive_types.length, `${key}`).toBeGreaterThan(0);
      expect(result.primitive_types.length, `${key}`).toBeLessThanOrEqual(
        result.conv_types.length,
      );
      expect(result.primitive_positions.length, `${key}`).toBe(
        result.primitive_types.length,
      );

      // The primitive cell is smaller than (or equal to) the conventional cell
      const det3 = (m: number[][]) =>
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const convDet = Math.abs(det3(result.conv_lattice));
      const primDet = Math.abs(det3(result.primitive_lattice));
      expect(primDet, `${key}`).toBeLessThanOrEqual(convDet * 1.001);
    },
  );
});

describe("getPath known-value checks", () => {
  const diamondPoscar = `C diamond
1
3.567 0 0
0 3.567 0
0 0 3.567
C
8
Direct
0 0 0
0 0.5 0.5
0.5 0 0.5
0.5 0.5 0
0.25 0.25 0.25
0.25 0.75 0.75
0.75 0.25 0.75
0.75 0.75 0.25
`;

  it("diamond (cF2, SG 227) produces the fcc path points", async () => {
    const structure = fromPOSCAR(diamondPoscar);
    const result = await getPath(structure);

    expect(result.bravais_lattice).toBe("cF");
    expect(result.bravais_lattice_extended).toBe("cF2");
    expect(result.spacegroup_number).toBe(227);
    expect(result.has_inversion_symmetry).toBe(true);
    expect(result.augmented_path).toBe(false);

    const eps = 1e-12;
    expect(result.point_coords.GAMMA).toEqual([0, 0, 0]);
    expect(Math.abs(result.point_coords.X[0] - 0.5)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.X[2] - 0.5)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.L[0] - 0.5)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.L[1] - 0.5)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.L[2] - 0.5)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.W[1] - 0.25)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.W[2] - 0.75)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.K[0] - 0.375)).toBeLessThan(eps);
    expect(Math.abs(result.point_coords.K[2] - 0.75)).toBeLessThan(eps);

    // 8 conventional atoms (2 basis atoms per fcc site), 2 primitive atoms
    expect(result.conv_types.length).toBe(8);
    expect(result.primitive_types.length).toBe(2);

    // primitive volume is 1/4 of the conventional cell
    const det3 = (m: number[][]) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const convDet = Math.abs(det3(result.conv_lattice));
    const primDet = Math.abs(det3(result.primitive_lattice));
    expect(primDet / convDet).toBeCloseTo(0.25, 12);
  });
});

describe("getPath time-reversal / augmented path", () => {
  const noInversionCase = cases.find((c) => c.key.endsWith("noinversion"));
  if (!noInversionCase) throw new Error("no non-inversion case found");

  it("augments the path when there is no inversion and no time reversal", async () => {
    const structure = fromPOSCAR(noInversionCase.poscar);
    const base = await getPath(structure, { withTimeReversal: true });
    const augmented = await getPath(structure, { withTimeReversal: false });

    expect(base.augmented_path).toBe(false);
    expect(augmented.augmented_path).toBe(true);

    // The augmented path is exactly double the base path
    expect(augmented.path.length).toBe(2 * base.path.length);

    // Negated points appear with a ' suffix
    for (const [name, coords] of Object.entries(base.point_coords)) {
      if (name === "GAMMA") continue;
      const negName = `${name}'`;
      expect(augmented.point_coords[negName]).toBeDefined();
      const negCoords = augmented.point_coords[negName];
      expect(Math.abs(negCoords[0] + coords[0])).toBeLessThan(1e-12);
      expect(Math.abs(negCoords[1] + coords[1])).toBeLessThan(1e-12);
      expect(Math.abs(negCoords[2] + coords[2])).toBeLessThan(1e-12);
    }
  });
});

describe("getExplicitKPath", () => {
  it.each(cases)("$key produces a consistent explicit path", async ({ key, poscar }) => {
    const result = await getExplicitKPath(fromPOSCAR(poscar));

    const { explicit_segments: segments, explicit_kpoints_labels: labels } =
      result;
    const implicitPath = result.path;
    const numSegments = segments.length;

    expect(numSegments, `${key}`).toBe(implicitPath.length);

    for (let i = 0; i < numSegments; i++) {
      const [start, stop] = implicitPath[i];
      const [segStart, segStop] = segments[i];
      expect(segStop, `${key}`).toBeGreaterThan(segStart);
      expect(labels[segStart], `${key} seg ${i}`).toBe(start);
      expect(labels[segStop - 1], `${key} seg ${i}`).toBe(stop);
      if (i < numSegments - 1) {
        // The joint k-point is shared: the next segment either starts at the
        // end of this one, or one point earlier (when the shared point is
        // skipped from the head of the next segment).
        const gap = segments[i][1] - segments[i + 1][0];
        expect([0, 1], `${key} seg ${i} gap`).toContain(gap);
        expect(labels[segments[i + 1][0]], `${key} seg ${i} joint`).toBe(
          implicitPath[i + 1][0],
        );
      }
    }

    // linear coord is monotonic (up to float rounding of the cumulative sums)
    const lin = result.explicit_kpoints_linearcoord;
    for (let i = 1; i < lin.length; i++) {
      expect(lin[i], `${key}`).toBeGreaterThanOrEqual(lin[i - 1] - 1e-9);
    }

    // abs and rel coords are related by the reciprocal lattice:
    // x_abs[i] = sum_j x_rel[j] * recip[j][i]
    const recip = result.reciprocal_primitive_lattice;
    for (let i = 0; i < result.explicit_kpoints_rel.length; i++) {
      const rel = result.explicit_kpoints_rel[i];
      const abs = result.explicit_kpoints_abs[i];
      for (let k = 0; k < 3; k++) {
        const dot =
          rel[0] * recip[0][k] +
          rel[1] * recip[1][k] +
          rel[2] * recip[2][k];
        expect(Math.abs(dot - abs[k]), `${key} kpt ${i}`).toBeLessThan(1e-10);
      }
    }
  });
});

describe("getExplicitFromImplicit", () => {
  it("splits a short segment into at least two points", () => {
    const result = getExplicitFromImplicit(
      {
        path: [["GAMMA", "X"]],
        point_coords: {
          GAMMA: [0, 0, 0],
          X: [0.5, 0, 0],
        },
        reciprocal_primitive_lattice: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
      },
      0.025,
    );

    expect(result.segments).toEqual([[0, result.kpoints_labels.length]]);
    expect(result.kpoints_labels[0]).toBe("GAMMA");
    expect(result.kpoints_labels[result.kpoints_labels.length - 1]).toBe("X");
    expect(result.kpoints_rel.length).toBeGreaterThanOrEqual(2);
    expect(result.kpoints_linearcoord.length).toBe(result.kpoints_rel.length);
  });

  it("shares the joint k-point between consecutive segments", () => {
    const result = getExplicitFromImplicit(
      {
        path: [
          ["GAMMA", "X"],
          ["X", "Y"],
        ],
        point_coords: {
          GAMMA: [0, 0, 0],
          X: [0.5, 0, 0],
          Y: [0.5, 0.5, 0],
        },
        reciprocal_primitive_lattice: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
      },
      0.01,
    );

    // The joint point is shared: the second segment starts one index before
    // the end of the first segment (the shared point is skipped at its head)
    expect(result.segments[0][1] - result.segments[1][0]).toBe(1);
    // The joint label X appears exactly once
    expect(result.kpoints_labels.filter((l) => l === "X").length).toBe(1);
    // The joint point coordinate is at the shared index
    const joint = result.kpoints_labels[result.segments[1][0]];
    expect(joint).toBe("X");
  });
});
