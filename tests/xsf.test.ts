import { xsfToStructure, structureToXsf } from "../lib/io/xsf/xsf";
import { vectorsNearlyEqual } from "./helpers";
import { rockSalt, diamond, singleAtom } from "./files/crystalstructures";
import { simpleXsf, singleAtomXsf } from "./files/xsfStrings";

describe("XSF parsing", () => {
  test("simple XSF round-trip (NaCl)", () => {
    const struct = xsfToStructure(simpleXsf);
    const xsf = structureToXsf(struct);

    expect(xsf).toContain("PRIMVEC");
    expect(struct.numSites).toBe(2);
  });

  test("single atom XSF", () => {
    const struct = xsfToStructure(singleAtomXsf);
    expect(struct.numSites).toBe(1);
    expect(struct.species[0]).toBe("Si");
  });
});
