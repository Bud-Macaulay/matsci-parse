import { describe, it, expect } from "vitest";
import { fromXYZ } from "@/core/io/xyz";
import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import { spaceGroupXYZ } from "../../../../helpers/bulkFiles/allSgn";

describe("symmetry regression over XYZ set", () => {
  it.each(Object.entries(spaceGroupXYZ))("SPGNumber %s", async (key, xyz) => {
    const structure = fromXYZ(xyz);
    const result = await getSymmetry(structure, 1e-5);

    const expectedSpg = Number(key);
    const calcSpg = result.calculationResults.number;

    expect(calcSpg).toBe(expectedSpg);
  });
});
