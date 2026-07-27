/**
 * &CELL namelist parameters.
 *
 * Only used when calculation='vc-relax' or 'vc-md'.
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id7
 */
export interface QeCellOptions {
  /**
   * Type of cell dynamics. Default depends on calculation type.
   */
  cell_dynamics?: "none" | "sd" | "damp-pr" | "damp-w" | "bfgs" | "pr" | "w";

  /**
   * Target pressure (KBar) for variable-cell runs.
   * @default 0
   */
  press?: number;

  /**
   * Fictitious cell mass (amu) for variable-cell simulations.
   * @default 0.75 * Tot_Mass / pi^2
   */
  wmass?: number;

  /**
   * Pseudopotential table expansion factor.
   * @default 2 for vc calculations, 1 otherwise
   */
  cell_factor?: number;

  /**
   * Convergence threshold on pressure (KBar) for vc-relax.
   * @default 0.5
   */
  press_conv_thr?: number;

  /**
   * Select which cell parameters to relax.
   * @default "all"
   */
  cell_dofree?:
    | "all"
    | "ibrav"
    | "a"
    | "b"
    | "c"
    | "fixa"
    | "fixb"
    | "fixc"
    | "x"
    | "y"
    | "z"
    | "xy"
    | "xz"
    | "yz"
    | "xyz"
    | "shape"
    | "volume"
    | "2Dxy"
    | "2Dshape"
    | "epitaxial_ab"
    | "epitaxial_ac"
    | "epitaxial_bc";
}
