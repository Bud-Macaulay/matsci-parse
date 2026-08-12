import { Structure } from "../../../structure";
import { getSymmetry } from "../spglib";
import { MoyoDataset } from "../spglib-wasm";
import { spgroup_data } from "../spgData";

import { parameters } from "../../../../lattice/parameters";

import { determinant } from "@/core/matrix/operations/determinant";
import type { KPath } from "@/core/kpoints";

import { transformAP, determineExtBravais, determineAP } from "./bravais";
import {
  cellParams,
  evalExpr,
  evalExprSimple,
  extendKparam,
  getPmatrix,
  getPrimitive,
  getReciprocalCellRows,
  matrixFromRowMajor,
  vecMulMat,
} from "./seekpathTools";
import { bandPathData } from "./bandPathData";

const RAD2DEG = 180 / Math.PI;

function rowsFromFlat(data: ArrayLike<number>): number[][] {
  if (data.length !== 9) throw new Error("Expected 9 lattice values");
  return [
    [data[0], data[1], data[2]],
    [data[3], data[4], data[5]],
    [data[6], data[7], data[8]],
  ];
}

/** Compute [a, b, c, alphaDeg, betaDeg, gammaDeg] from a row-major 3x3 lattice. */
function cellParamsDegrees(data: ArrayLike<number>): number[] {
  const [a, b, c, cosalpha, cosbeta, cosgamma] = cellParams(
    matrixFromRowMajor(data),
  );
  const acos = (x: number) => Math.acos(Math.max(-1, Math.min(1, x))) * RAD2DEG;
  return [a, b, c, acos(cosalpha), acos(cosbeta), acos(cosgamma)];
}

/** Determine the Seekpath extended Bravais lattice from symmetry data. */
export async function getSeekPathHighSymPath(
  structure: Structure,
  symTol = 1e-6,
): Promise<string> {
  const symData = await getSymmetry(structure, symTol);

  const conventionalLattice = symData.conventional.lattice;
  const [a, b, c, alpha, beta, gamma] = parameters(conventionalLattice);
  const spgN = symData.calculationResults.number;

  const props = spgroup_data[spgN];
  if (!props) throw new Error(`No space group data for SG ${spgN}`);
  const bL = `${props[0]}${props[1]}`;

  if (bL === "aP") {
    return determineAP(conventionalLattice.basis);
  }

  return determineExtBravais(bL, spgN, a, b, c, alpha, beta, gamma);
}

export interface GetPathOptions {
  withTimeReversal?: boolean;
  threshold?: number;
  symprec?: number;
}

export interface SeekPathResult {
  readonly kpath: KPath;
  point_coords: Record<string, [number, number, number]>;
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
  inverse_primitive_transformation_matrix: number[][];
  primitive_transformation_matrix: number[][];
  volume_original_wrt_conv: number;
  volume_original_wrt_prim: number;
  spacegroup_number: number;
  spacegroup_international: string;
  rotation_matrix: number[][];
}

/**
 * Return the k-point path information for a band structure, following the
 * HPKOT recipe. Mirrors `seekpath.get_path`.
 */
export async function getPath(
  structure: Structure,
  opts: GetPathOptions = {},
): Promise<SeekPathResult> {
  const {
    withTimeReversal = true,
    threshold = 1e-7,
    symprec = 1e-5,
  } = opts;

  const symData = await getSymmetry(structure, symprec);
  const calcResults: MoyoDataset = symData.calculationResults;

  const stdCell = calcResults.std_cell;
  const convLatticeFlat = stdCell.lattice.basis;
  const convPositions = stdCell.positions.map((p) => Array.from(p));
  const convTypes = Array.from(stdCell.numbers);

  const spgrpNum = calcResults.number;
  const properties = spgroup_data[spgrpNum];
  if (!properties) {
    throw new Error(`No space group data for SG ${spgrpNum}`);
  }
  const bravaisLattice = `${properties[0]}${properties[1]}`;
  const hasInv = properties[2];

  const [a, b, c, alphaDeg, betaDeg, gammaDeg] = cellParamsDegrees(
    convLatticeFlat,
  );

  // Implement all different extended Bravais lattices
  let extBravais: string;
  let convLattice: number[][];
  let convPositionsFinal: number[][];

  if (bravaisLattice === "aP") {
    const ap = await transformAP(rowsFromFlat(convLatticeFlat), convPositions);
    extBravais = ap.extBravais;
    convLattice = ap.lattice;
    convPositionsFinal = ap.positions;
  } else {
    extBravais = determineExtBravais(
      bravaisLattice,
      spgrpNum,
      a,
      b,
      c,
      alphaDeg,
      betaDeg,
      gammaDeg,
    );
    convLattice = rowsFromFlat(convLatticeFlat);
    convPositionsFinal = convPositions;
  }

  // Primitive cell from the conventional cell via the HPKOT P matrix
  const primitive = getPrimitive(
    convLattice,
    convPositionsFinal,
    convTypes,
    bravaisLattice,
  );
  const { P, invP } = getPmatrix(bravaisLattice);

  // Get the path data (k-parameters definitions, point definitions, path)
  const data = bandPathData[extBravais];
  if (!data) throw new Error(`No band path data for extended Bravais ${extBravais}`);

  const [kparamDef, pointsDef, basePath] = [
    data.kparam,
    data.points,
    data.path,
  ];

  const cosalpha = Math.cos(alphaDeg * Math.PI / 180);
  const cosbeta = Math.cos(betaDeg * Math.PI / 180);
  const cosgamma = Math.cos(gammaDeg * Math.PI / 180);

  const kparam: Record<string, number> = {};
  for (const [kparamName, kparamExpr] of kparamDef) {
    kparam[kparamName] = evalExpr(
      kparamExpr,
      a,
      b,
      c,
      cosalpha,
      cosbeta,
      cosgamma,
      kparam,
    );
  }
  const kparamExtended = extendKparam(kparam);

  const points: Record<string, [number, number, number]> = {};
  for (const [pointName, coordsDef] of Object.entries(pointsDef)) {
    points[pointName] = coordsDef.map((e) =>
      evalExprSimple(e, kparamExtended),
    ) as [number, number, number];
  }

  // If there is no inversion symmetry nor time-reversal symmetry, add
  // additional -k points
  const augmentedPath = !hasInv && !withTimeReversal;

  let path: [string, string][] = basePath;
  if (augmentedPath) {
    const negPoints: Record<string, [number, number, number]> = {};
    for (const [pointName, coords] of Object.entries(points)) {
      if (pointName === "GAMMA") continue;
      negPoints[`${pointName}'`] = [-coords[0], -coords[1], -coords[2]];
    }
    Object.assign(points, negPoints);

    const oldPath = basePath;
    const newSegments: [string, string][] = [];
    for (const [startP, endP] of oldPath) {
      newSegments.push([
        startP === "GAMMA" ? startP : `${startP}'`,
        endP === "GAMMA" ? endP : `${endP}'`,
      ]);
    }
    path = [...basePath, ...newSegments];
  }

  const primitiveMatrix = matrixFromRowMajor(primitive.lattice.flat());
  const reciprocalPrimitive = getReciprocalCellRows(primitiveMatrix);

  const origDet = Math.abs(
    determinant(matrixFromRowMajor(Array.from(structure.lattice.basis.data))),
  );
  const convDet = Math.abs(determinant(matrixFromRowMajor(convLattice.flat())));
  const primDet = Math.abs(determinant(primitiveMatrix));

  return {
    kpath: { points, segments: path },
    point_coords: points,
    path,
    has_inversion_symmetry: hasInv,
    augmented_path: augmentedPath,
    bravais_lattice: bravaisLattice,
    bravais_lattice_extended: extBravais,
    conv_lattice: convLattice,
    conv_positions: convPositionsFinal,
    conv_types: convTypes,
    primitive_lattice: primitive.lattice,
    primitive_positions: primitive.positions,
    primitive_types: primitive.types,
    reciprocal_primitive_lattice: Array.from(reciprocalPrimitive.data).reduce<
      number[][]
    >(
      (acc, x, i) => {
        acc[Math.floor(i / 3)][i % 3] = x;
        return acc;
      },
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    ),
    inverse_primitive_transformation_matrix: invP,
    primitive_transformation_matrix: P,
    volume_original_wrt_conv: origDet / convDet,
    volume_original_wrt_prim: origDet / primDet,
    spacegroup_number: spgrpNum,
    spacegroup_international: calcResults.hm_symbol,
    rotation_matrix: rowsFromFlat(calcResults.std_rotation_matrix),
  };
}

export interface ExplicitKPathResult extends SeekPathResult {
  explicit_kpoints_abs: number[][];
  explicit_kpoints_rel: number[][];
  explicit_kpoints_labels: string[];
  explicit_kpoints_linearcoord: number[];
  explicit_segments: [number, number][];
}

function vecAdd(a: readonly number[], b: readonly number[]): number[] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecSub(a: readonly number[], b: readonly number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecScale(a: readonly number[], k: number): number[] {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function vecNorm(a: readonly number[]): number {
  return Math.hypot(a[0], a[1], a[2]);
}

/**
 * Given the output of `getPath`, compute an "explicit" path, i.e. a full list
 * of k-points along each segment. Mirrors `seekpath.get_explicit_from_implicit`.
 */
export function getExplicitFromImplicit(
  result: Pick<SeekPathResult, "kpath" | "reciprocal_primitive_lattice">,
  referenceDistance = 0.025,
): {
  kpoints_rel: number[][];
  kpoints_abs: number[][];
  kpoints_labels: string[];
  kpoints_linearcoord: number[];
  segments: [number, number][];
} {
  const recip = result.reciprocal_primitive_lattice;

  const kpointsRel: number[][] = [];
  const kpointsLabels: string[] = [];
  const kpointsLinearcoord: number[] = [];
  const segments: [number, number][] = [];
  let previousLinearcoord = 0;

  for (const [startLabel, stopLabel] of result.kpath.segments) {
    const startCoord = result.kpath.points[startLabel];
    const stopCoord = result.kpath.points[stopLabel];
    const startCoordAbs = vecMulMat(startCoord, recip);
    const stopCoordAbs = vecMulMat(stopCoord, recip);
    const segmentLength = vecNorm(vecSub(stopCoordAbs, startCoordAbs));
    const numPoints = Math.max(2, Math.floor(segmentLength / referenceDistance));

    let segmentStart = kpointsLabels.length;
    for (let i = 0; i < numPoints; i++) {
      // Skip the first point if it's the same as the last one of the
      // previous segment
      if (i === 0) {
        if (
          kpointsLabels.length &&
          kpointsLabels[kpointsLabels.length - 1] === startLabel
        ) {
          segmentStart -= 1;
          continue;
        }
      }

      kpointsRel.push(
        vecAdd(startCoord, vecScale(vecSub(stopCoord, startCoord), i / (numPoints - 1))),
      );
      if (i === 0) kpointsLabels.push(startLabel);
      else if (i === numPoints - 1) kpointsLabels.push(stopLabel);
      else kpointsLabels.push("");
      kpointsLinearcoord.push(
        previousLinearcoord + (segmentLength * i) / (numPoints - 1),
      );
    }
    previousLinearcoord += segmentLength;
    segments.push([segmentStart, kpointsLabels.length]);
  }

  return {
    kpoints_rel: kpointsRel,
    kpoints_abs: kpointsRel.map((p) => vecMulMat(p, recip)),
    kpoints_labels: kpointsLabels,
    kpoints_linearcoord: kpointsLinearcoord,
    segments,
  };
}

/**
 * Return the k-point path for a band structure in scaled and absolute
 * coordinates, following the HPKOT recipe. Mirrors
 * `seekpath.get_explicit_k_path`.
 */
export async function getExplicitKPath(
  structure: Structure,
  opts: GetPathOptions & { referenceDistance?: number } = {},
): Promise<ExplicitKPathResult> {
  const { referenceDistance = 0.025, ...rest } = opts;
  const res = await getPath(structure, rest);
  const explicit = getExplicitFromImplicit(res, referenceDistance);

  return {
    ...res,
    explicit_kpoints_abs: explicit.kpoints_abs,
    explicit_kpoints_rel: explicit.kpoints_rel,
    explicit_kpoints_labels: explicit.kpoints_labels,
    explicit_kpoints_linearcoord: explicit.kpoints_linearcoord,
    explicit_segments: explicit.segments,
  };
}

// re-export for convenience
export { bandPathData } from "./bandPathData";
