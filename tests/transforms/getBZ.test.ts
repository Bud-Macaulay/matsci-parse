import { CrystalStructure } from "../../lib/io/crystal";
import { Site } from "../../lib/io/common";
import { computeBrillouinZone } from "../../lib/symmetry/brillouinzone/getBZ";

function cubicCrystal(scaleX = 1, scaleY = 1, scaleZ = 1) {
  return new CrystalStructure({
    lattice: [
      [scaleX, 0, 0],
      [0, scaleY, 0],
      [0, 0, scaleZ],
    ],
    species: ["H"],
    sites: [new Site(0, [0, 0, 0])],
  });
}

describe("test BrillouinZone", () => {
  test("Correct Voronoi for a simple cube", async () => {
    const cs = cubicCrystal(1, 1, 1);

    const bz = await computeBrillouinZone(cs);

    console.log("faces", bz.faces);
    console.log("tri_verts", bz.tri_verts);
    console.log("tris", bz.tris);
  });

  // test("Correct Voronoi for a scaled cube", async () => {
  //   const cs = cubicCrystal(0.5, 1, 1);

  //   const bz = await computeBrillouinZone(cs);

  //   console.log("bz", bz);
  // });
});
