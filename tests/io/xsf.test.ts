import "../../tests/helpers/structureMatchers"; // load the matcher globally
import { xsfToStructure, structureToXsf } from "../../lib/io/xsf/xsf";
import { simpleXsf, singleAtomXsf } from "../files/xsfStrings";

describe("XSF parsing (round-trip)", () => {
  test("simple XSF round-trip (NaCl)", () => {
    const first = xsfToStructure(simpleXsf);
    const xsf = structureToXsf(first);
    const second = xsfToStructure(xsf);

    expect(first).toStructureNearlyEqual(second);
  });

  test("single-atom XSF round-trip", () => {
    const first = xsfToStructure(singleAtomXsf);
    const xsf = structureToXsf(first);
    const second = xsfToStructure(xsf);

    expect(first).toStructureNearlyEqual(second);
  });
});
