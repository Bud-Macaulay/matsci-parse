import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { Structure } from "@/core/structure/structure";
import { getSymmetry } from "./spglib";
import { lengths } from "@/core/lattice/lengths";

type KPoint = [number, number, number];

interface FacesData {
  readonly triangleVertices: number[][];
  readonly triangles: number[][];
  readonly faces: number[][][];
}

interface BrillouinZoneData {
  readonly b1: number[];
  readonly b2: number[];
  readonly b3: number[];
  readonly facesData: FacesData;
  readonly kpoints: Record<string, KPoint>;
  readonly kpointsRel: Record<string, KPoint>;
  readonly path: string[][];
  readonly explicitKpointsRel: KPoint[];
  readonly explicitKpointsLinearcoord: number[];
  readonly explicitKpointsLabels: string[];
  readonly explicitKpointsAbs: KPoint[];
  readonly explicitSegments: number[][];
  readonly spgLibStructure: Structure;
}

export async function brillouinZone(
  structure: Structure,
  tolerance: number = 1e-4,
): Promise<BrillouinZoneData> {
  const spgLibStructure = await getSymmetry(structure, tolerance);

  const reciprocalLattice = reciprocalLatticeCrystallographic(
    spgLibStructure.primitive.lattice,
  );

  const rcLD = reciprocalLattice.basis.data;

  const aStar = [rcLD[0], rcLD[1], rcLD[2]];
  const bStar = [rcLD[3], rcLD[4], rcLD[5]];
  const cStar = [rcLD[6], rcLD[7], rcLD[8]];

  const range = 2;
  const points = [];
  for (let h = -range; h <= range; h++) {
    for (let k = -range; k <= range; k++) {
      for (let l = -range; l <= range; l++) {
        const point = [
          h * aStar[0] + k * bStar[0] + l * cStar[0],
          h * aStar[1] + k * bStar[1] + l * cStar[1],
          h * aStar[2] + k * bStar[2] + l * cStar[2],
        ];

        points.push(point);
      }
    }
  }

  // generate all points around the center

  const center = [0, 0, 0];
}
