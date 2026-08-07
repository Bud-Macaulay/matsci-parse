import { describe, expect, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import { getBrillouinZoneData } from "@/core/structure/operations/symmetry/brilliounzone/bzVisualizerData";

const cases = Object.entries(POSCARS).map(([key, poscar]) => ({ key, poscar }));

describe("getBrillouinZoneData", () => {
  it.each(cases)("$key produces a valid bz-visualizer data object", async ({ key, poscar }) => {
    const data = await getBrillouinZoneData(fromPOSCAR(poscar));

    // reciprocal lattice vectors present
    expect(data.b1.length, `${key}`).toBe(3);
    expect(data.b2.length, `${key}`).toBe(3);
    expect(data.b3.length, `${key}`).toBe(3);

    // faces: triangles reference existing vertices
    const nVerts = data.faces_data.triangles_vertices.length;
    expect(nVerts, `${key}`).toBeGreaterThanOrEqual(8);
    for (const tri of data.faces_data.triangles) {
      expect(tri.length, `${key}`).toBe(3);
      for (const idx of tri) {
        expect(idx, `${key}`).toBeGreaterThanOrEqual(0);
        expect(idx, `${key}`).toBeLessThan(nVerts);
      }
    }

    // every path point has a label and a coordinate
    for (const [start, stop] of data.path) {
      expect(data.kpoints[start], `${key}: ${start}`).toBeDefined();
      expect(data.kpoints[stop], `${key}: ${stop}`).toBeDefined();
      expect(data.kpoints_rel[start], `${key}: rel ${start}`).toBeDefined();
    }

    // absolute point coords = relative coords mapped through the reciprocal lattice
    for (const [label, abs] of Object.entries(data.kpoints)) {
      const rel = data.kpoints_rel[label];
      for (let i = 0; i < 3; i++) {
        const dot =
          rel[0] * data.b1[i] +
          rel[1] * data.b2[i] +
          rel[2] * data.b3[i];
        expect(Math.abs(dot - abs[i]), `${key}: ${label}[${i}]`).toBeLessThan(
          1e-9,
        );
      }
    }

    // explicit arrays all have the same length
    const n = data.explicit_kpoints_abs.length;
    expect(data.explicit_kpoints_rel.length, `${key}`).toBe(n);
    expect(data.explicit_kpoints_labels.length, `${key}`).toBe(n);
    expect(data.explicit_kpoints_linearcoord.length, `${key}`).toBe(n);

    // segments are valid ranges over the explicit points
    for (const [s, e] of data.explicit_segments) {
      expect(s, `${key}`).toBeGreaterThanOrEqual(0);
      expect(e, `${key}`).toBeLessThanOrEqual(n);
      expect(e, `${key}`).toBeGreaterThan(s);
    }
  });
});
