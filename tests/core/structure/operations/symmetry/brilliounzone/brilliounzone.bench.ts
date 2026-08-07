import { bench, describe } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import { getBrillouinZoneData } from "@/core/structure/operations/symmetry/brilliounzone/bzVisualizerData";
import { getExplicitKPath } from "@/core/structure/operations/symmetry/brilliounzone/seekpath";
import { getBZPolyhedron } from "@/core/structure/operations/symmetry/brilliounzone/bzPolyhedron";

const cases = [
  "cF2/POSCAR_inversion",
  "hP1/POSCAR_inversion",
  "tI2/POSCAR_inversion",
  "oP1/POSCAR_inversion",
  "mC3/POSCAR_inversion",
  "hR1/POSCAR_inversion",
  "aP2/POSCAR_inversion",
];

const structures = cases.map((key) => ({
  key,
  structure: fromPOSCAR(POSCARS[key]),
}));

describe("getBrillouinZoneData end-to-end", () => {
  for (const { key, structure } of structures) {
    bench(`${key} full pipeline`, async () => {
      await getBrillouinZoneData(structure);
    });
  }
});

describe("getExplicitKPath (path computation only)", () => {
  for (const { key, structure } of structures) {
    bench(`${key} getExplicitKPath`, async () => {
      await getExplicitKPath(structure);
    });
  }
});

describe("getBZPolyhedron (polyhedron only, real reciprocal lattice)", () => {
  const recipCache = new Map<
    string,
    Promise<{ b1: number[]; b2: number[]; b3: number[] }>
  >();

  for (const { key, structure } of structures) {
    bench(`${key} getBZPolyhedron`, async () => {
      let entry = recipCache.get(key);
      if (!entry) {
        entry = getExplicitKPath(structure).then((r) => {
          const [b1, b2, b3] = r.reciprocal_primitive_lattice;
          return { b1, b2, b3 };
        });
        recipCache.set(key, entry);
      }
      const { b1, b2, b3 } = await entry;
      getBZPolyhedron(b1, b2, b3);
    });
  }
});
