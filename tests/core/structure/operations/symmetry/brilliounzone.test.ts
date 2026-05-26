import { expect, test } from "vitest";

import { brillouinZone } from "@/core/structure/operations/symmetry/brilliounzone";
import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";
import { simpleCubic, simpleHexagonal } from "../../teststrings/spglibPoscar";

test("simple cubic nearest neighbors", async () => {
  const s = fromPOSCAR(simpleHexagonal);

  const bz = await brillouinZone(s);
});
