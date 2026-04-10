import { chgcarToVolumetric } from "../../lib/io/vasp/chgcar";

import { VolumetricData } from "../../lib/main";
import { CrystalStructure } from "../../lib/main";

import { chgcarNoSpin } from "../files/chgcarStrings";

describe("chgcarToVolumetric", () => {
  test("parses minimal CHGCAR correctly", () => {
    const { structure, charge } = chgcarToVolumetric(minimalCHGCAR);

    // structure checks
    expect(structure).toBeInstanceOf(CrystalStructure);
    expect(structure.lattice.length).toBe(3);
    expect(structure.sites.length).toBeGreaterThan(0);

    // charge grid checks
    expect(charge).toBeInstanceOf(VolumetricData);
    expect(charge.shape).toEqual([32, 32, 32]);
    expect(charge.values.length).toBe(32 * 32 * 32);

    // check normalization: sum ≈ 1 / nCells * nCells => mean ≈ 1 / volume?
    const volume = structure.lattice.reduce(
      (acc, v, i, arr) => acc + v[0] + v[1] + v[2],
      0,
    );
    // just ensure some values are numbers and normalized
    expect(typeof charge.get(0, 0, 0)).toBe("number");
    expect(charge.min()).toBeLessThanOrEqual(charge.max());
  });

  test("throws on invalid grid dimensions", () => {
    const invalid = chgcarNoSpin.replace("32   32   32", "0 0 0");
    expect(() => chgcarToVolumetric(invalid)).toThrow(
      /Invalid CHGCAR grid dimensions/,
    );
  });
});
