import { expect, test } from "vitest";

import { generateBZVertices } from "@/core/structure/operations/symmetry/brilliounzone/generateBZVertices";
import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";
import { simpleCubic, simpleHexagonal } from "../../teststrings/spglibPoscar";

test("simple cubic nearest neighbors", async () => {
  const s = fromPOSCAR(simpleHexagonal);

  const vertices = await generateBZVertices(s);
  console.log(vertices);
});
