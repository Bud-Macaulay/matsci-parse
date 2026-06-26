import { describe, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import { getSeekPathHighSymPath } from "@/core/structure/operations/symmetry/brilliounzone/seekpath";

const cases = Object.entries(POSCARS).map(([key, poscar]) => ({
  key,
  poscar,
  expected: key.split("/")[0],
}));

describe("extBrav regression test over all POSCARs", () => {
  it.each(cases)("$key → $expected", async ({ key, poscar, expected }) => {
    const structure = fromPOSCAR(poscar);

    const result = await getSeekPathHighSymPath(structure);

    expect(result, `${key} mismatch`).toBe(expected);
  });
});
