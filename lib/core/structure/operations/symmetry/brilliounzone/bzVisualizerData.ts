import { Structure } from "../../../structure";

import { getExplicitKPath } from "./seekpath";
import type { GetPathOptions } from "./seekpath";
import { getBZPolyhedron } from "./bzPolyhedron";
import { vecMulMat } from "./seekpathTools";

/** Data object compatible with the `brillouinzone-visualizer` widget. */
export interface BZVisualizerData {
  b1: number[];
  b2: number[];
  b3: number[];
  faces_data: {
    triangles_vertices: number[][];
    triangles: number[][];
    faces: number[][][];
  };
  kpoints: Record<string, number[]>;
  kpoints_rel: Record<string, number[]>;
  path: [string, string][];
  explicit_kpoints_rel: number[][];
  explicit_kpoints_linearcoord: number[];
  explicit_kpoints_labels: string[];
  explicit_kpoints_abs: number[][];
  explicit_segments: [number, number][];
  bravais_lattice: string;
  bravais_lattice_extended: string;
  spacegroup_number: number;
  spacegroup_international: string;
  has_inversion_symmetry: boolean;
  augmented_path: boolean;
}

/**
 * Run the HPKOT high-symmetry path computation and assemble the data object
 * consumed by the `brillouinzone-visualizer` web widget, mirroring the
 * seekpath example-data generator.
 */
export async function getBrillouinZoneData(
  structure: Structure,
  opts: GetPathOptions & { referenceDistance?: number } = {},
): Promise<BZVisualizerData> {
  const res = await getExplicitKPath(structure, opts);

  const [b1, b2, b3] = res.reciprocal_primitive_lattice;
  const faces_data = getBZPolyhedron(b1, b2, b3);

  const kpoints: Record<string, number[]> = {};
  const kpoints_rel: Record<string, number[]> = res.point_coords;
  for (const [label, rel] of Object.entries(kpoints_rel)) {
    kpoints[label] = vecMulMat(rel, res.reciprocal_primitive_lattice);
  }

  return {
    b1,
    b2,
    b3,
    faces_data,
    kpoints,
    kpoints_rel,
    path: res.path,
    explicit_kpoints_rel: res.explicit_kpoints_rel,
    explicit_kpoints_linearcoord: res.explicit_kpoints_linearcoord,
    explicit_kpoints_labels: res.explicit_kpoints_labels,
    explicit_kpoints_abs: res.explicit_kpoints_abs,
    explicit_segments: res.explicit_segments,
    bravais_lattice: res.bravais_lattice,
    bravais_lattice_extended: res.bravais_lattice_extended,
    spacegroup_number: res.spacegroup_number,
    spacegroup_international: res.spacegroup_international,
    has_inversion_symmetry: res.has_inversion_symmetry,
    augmented_path: res.augmented_path,
  };
}
