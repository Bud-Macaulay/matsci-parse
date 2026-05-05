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
  structure,
  with_time_reversal = true,
  threshold = 1e-8,
  symprec = 1e-5,
  angleTolernace = -1.0,
) {
  return;
}
