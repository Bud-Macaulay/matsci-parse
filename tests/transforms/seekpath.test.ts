import { CrystalStructure } from "../../lib/io/crystal";
import { Site } from "../../lib/io/common";
import { getPath } from "../../lib/symmetry/seekpath/getPath";

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

describe("test SeekPath getPath", () => {
  test("Basic symmetry analysis runs for simple cubic cell", async () => {
    const cs = cubicCrystal(1, 1, 1);

    const result = await getPath(cs);

    console.log("result", result);

    // Since getPath is not implemented yet, we only check it doesn't crash
    expect(result).toBeDefined();
  });

  test("Handles anisotropic lattice", async () => {
    const cs = cubicCrystal(0.5, 1, 2);

    const result = await getPath(cs);

    console.log("result (anisotropic)", result);

    expect(result).toBeDefined();
  });
});
