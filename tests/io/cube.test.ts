import {
  cubeToStructure,
  cubeToVolumetric,
  volumetricToCube,
} from "../../lib/io/gaussian/cube";
import "../../tests/helpers/structureMatchers";
import { cubefileStr } from "../files/cubeStrings";

describe("CUBE parsing (round-trip)", () => {
  test("simple cube round-trip", () => {
    // Parse original
    const firstStructure = cubeToStructure(cubefileStr);
    const firstVolumetric = cubeToVolumetric(cubefileStr);

    // Convert back to cube string
    const cubeStr = volumetricToCube(firstStructure, firstVolumetric);

    // Re-parse the written cube string
    const secondStructure = cubeToStructure(cubeStr);
    const secondVolumetric = cubeToVolumetric(cubeStr);

    // === Structure check ===
    expect(firstStructure).toStructureNearlyEqual(secondStructure);

    // === Volumetric metadata checks ===
    expect(secondVolumetric.shape).toEqual(firstVolumetric.shape);
    expect(secondVolumetric.origin).toEqual(firstVolumetric.origin);

    // Basis comparison (float tolerance)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(secondVolumetric.basis[i][j]).toBeCloseTo(
          firstVolumetric.basis[i][j],
          6,
        );
      }
    }

    // Values comparison
    expect(secondVolumetric.values.length).toBe(firstVolumetric.values.length);
    for (let i = 0; i < firstVolumetric.values.length; i++) {
      expect(secondVolumetric.values[i]).toBeCloseTo(
        firstVolumetric.values[i],
        5,
      );
    }
  });
});
