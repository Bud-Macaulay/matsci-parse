import { expect, test } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { POSCARS } from "../../../../../helpers/bulkFiles/allExtBrav";
import { getSeekPathHighSymPath } from "@/core/structure/operations/symmetry/brilliounzone/seekpath";

test("extBrav regression test over all POSCARs", async () => {
  const entries = Object.entries(POSCARS);

  for (const [key, poscar] of entries) {
    const structure = fromPOSCAR(poscar);

    const result = await getSeekPathHighSymPath(structure);

    console.log(`${key} → ${result}`);

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  }
});
