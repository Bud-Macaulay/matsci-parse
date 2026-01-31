import { xsfToStructure, structureToXsf } from "../lib/io/xsf/xsf";
import { vectorsNearlyEqual } from "./helpers";
import { simpleXsf, singleAtomXsf } from "./files/xsfStrings";

describe("XSF parsing (round-trip)", () => {
  test("simple XSF round-trip (NaCl)", () => {
    const first = xsfToStructure(simpleXsf);
    const xsf = structureToXsf(first);
    const second = xsfToStructure(xsf);

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));

    expect(first.numSites).toBe(second.numSites);

    expect(first.species.sort()).toEqual(second.species.slice().sort());
  });

  test("single-atom XSF round-trip", () => {
    const first = xsfToStructure(singleAtomXsf);
    const xsf = structureToXsf(first);
    const second = xsfToStructure(xsf);

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.numSites).toBe(second.numSites);
    expect(first.species).toEqual(second.species);
  });
});
