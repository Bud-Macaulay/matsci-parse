import { analyzeCrystal } from "../getSymmetry";
import { CrystalStructure } from "../../main";

import { latticeToCellParams, normalizeLattice } from "../../math/matrix";

import spgData from "../spgData.json";

export interface SeekPathResult {
  point_coords: Record<string, number[]>;
  path: [string, string][];
  has_inversion_symmetry: boolean;
  augmented_path: boolean;
  bravais_lattice: string;
  bravais_lattice_extended: string;
  conv_lattice: number[][];
  conv_positions: number[][];
  conv_types: number[];
  primitive_lattice: number[][];
  primitive_positions: number[][];
  primitive_types: number[];
  reciprocal_primitive_lattice: number[][];
  primitive_transformation_matrix: number[][];
  inverse_primitive_transformation_matrix: number[][];
  rotation_matrix: number[][];
  volume_original_wrt_conv: number;
  volume_original_wrt_prim: number;
}

export async function getPath(
  structure: CrystalStructure,
  withTimeReversal: boolean = true,
  threshold: number = 1e-8,
  symprec: number = 1e-5,
  angleTolerance: number = -1.0,
) {
  const symCrystal = await analyzeCrystal(structure);

  const spgrpNum = symCrystal.number;
  const spaceGroupProperties = spgData[spgrpNum];
  const bravaisLattice = spaceGroupProperties[0] + spaceGroupProperties[1];

  const stdCell = symCrystal.std_cell;
  const primCell = symCrystal.prim_std_cell;

  const basis = stdCell.lattice.basis;

  // reconstruct lattice vectors
  const lattice = normalizeLattice(basis);
  const cellParams = latticeToCellParams(lattice);

  const { a, b, c, beta } = cellParams;

  const cosbeta = Math.cos((beta * Math.PI) / 180);

  let extBravais: string;

  // -------------------------
  // cubic primitive
  // -------------------------
  if (bravaisLattice === "cP") {
    extBravais =
      spgrpNum <= 206
        ? "cP1"
        : spgrpNum <= 230
          ? "cP2"
          : (() => {
              throw new Error("Invalid cP range");
            })();

    // -------------------------
    // cubic face-centered
    // -------------------------
  } else if (bravaisLattice === "cF") {
    extBravais =
      spgrpNum <= 206
        ? "cF1"
        : spgrpNum <= 230
          ? "cF2"
          : (() => {
              throw new Error("Invalid cF range");
            })();

    // -------------------------
    // cubic body-centered
    // -------------------------
  } else if (bravaisLattice === "cI") {
    extBravais = "cI1";

    // -------------------------
    // tetragonal primitive
    // -------------------------
  } else if (bravaisLattice === "tP") {
    extBravais = "tP1";

    // -------------------------
    // tetragonal body-centered
    // -------------------------
  } else if (bravaisLattice === "tI") {
    if (Math.abs(c - a) < threshold) {
      console.warn("tI lattice, but a almost equal to c");
    }
    extBravais = c <= a ? "tI1" : "tI2";

    // -------------------------
    // orthorhombic primitive
    // -------------------------
  } else if (bravaisLattice === "oP") {
    extBravais = "oP1";

    // -------------------------
    // orthorhombic face-centered
    // -------------------------
  } else if (bravaisLattice === "oF") {
    const invA = 1 / (a * a);
    const invB = 1 / (b * b);
    const invC = 1 / (c * c);

    if (Math.abs(invA - (invB + invC)) < threshold) {
      console.warn("oF: 1/a² ≈ 1/b² + 1/c²");
    }
    if (Math.abs(invC - (invA + invB)) < threshold) {
      console.warn("oF: 1/c² ≈ 1/a² + 1/b²");
    }

    extBravais =
      invA > invB + invC ? "oF1" : invC > invA + invB ? "oF2" : "oF3";

    // -------------------------
    // orthorhombic body-centered
    // -------------------------
  } else if (bravaisLattice === "oI") {
    const vectors = [
      { len: a, label: "a", id: 2 },
      { len: b, label: "b", id: 3 },
      { len: c, label: "c", id: 1 },
    ].sort((x, y) => y.len - x.len);

    if (Math.abs(vectors[0].len - vectors[1].len) < threshold) {
      console.warn(
        `oI: longest vectors ${vectors[0].label} and ${vectors[1].label} nearly equal`,
      );
    }

    extBravais = `oI${vectors[0].id}`;

    // -------------------------
    // orthorhombic base-centered C
    // -------------------------
  } else if (bravaisLattice === "oC") {
    if (Math.abs(b - a) < threshold) {
      console.warn("oC: a ≈ b");
    }
    extBravais = a <= b ? "oC1" : "oC2";

    // -------------------------
    // orthorhombic base-centered A
    // -------------------------
  } else if (bravaisLattice === "oA") {
    if (Math.abs(b - c) < threshold) {
      console.warn("oA: b ≈ c");
    }
    extBravais = b <= c ? "oA1" : "oA2";

    // -------------------------
    // hexagonal primitive
    // -------------------------
  } else if (bravaisLattice === "hP") {
    const special = new Set([
      143, 144, 145, 146, 147, 148, 149, 151, 153, 157, 159, 160, 161, 162, 163,
    ]);
    extBravais = special.has(spgrpNum) ? "hP1" : "hP2";

    // -------------------------
    // rhombohedral
    // -------------------------
  } else if (bravaisLattice === "hR") {
    const sqrt3a = Math.sqrt(3) * a;
    const sqrt2c = Math.sqrt(2) * c;

    if (Math.abs(sqrt3a - sqrt2c) < threshold) {
      console.warn("hR: √3 a ≈ √2 c");
    }

    extBravais = sqrt3a <= sqrt2c ? "hR1" : "hR2";

    // -------------------------
    // monoclinic primitive
    // -------------------------
  } else if (bravaisLattice === "mP") {
    extBravais = "mP1";

    // -------------------------
    // monoclinic base-centered
    // -------------------------
  } else if (bravaisLattice === "mC") {
    const sinBeta = Math.sqrt(1 - cosbeta * cosbeta);

    if (Math.abs(b - a * sinBeta) < threshold) {
      console.warn("mC: b ≈ a·sinβ");
    }

    extBravais = b < a * sinBeta ? "mC1" : "mC2";

    // -------------------------
    // triclinic
    // -------------------------
  } else if (bravaisLattice === "aP") {
    extBravais = "aP2"; // TODO full logic
  } else {
    throw new Error(`Unknown bravais lattice: ${bravaisLattice}`);
  }

  return {
    spgrpNum,
    bravaisLattice,
    extBravais,
    stdCell,
    primCell,
  };
}
