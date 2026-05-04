import { CrystalStructure } from "../../lib/io/crystal";
import { Site } from "../../lib/io/common";
import { computeBrillouinZone } from "../../lib/symmetry/brillouinzone/getBZ";

function baseStructure() {
  return new CrystalStructure({
    lattice: [
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
    ],
    species: ["H"],
    sites: [new Site(0, [0, 0, 0])],
  });
}

describe("test BrillouinZone", () => {
  test("site() returns the correct Site object", async () => {
    const cs = baseStructure();

    console.log("Computing Brillouin zone for simple cubic crystal...");
    const bz = await computeBrillouinZone(cs);

    console.log("bz", bz);
  });
});
