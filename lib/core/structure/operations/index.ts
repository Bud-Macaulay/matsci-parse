/**
 * Structure operations module.
 *
 * Provides functions for manipulating and analyzing crystal structures:
 *
 * **Basic Operations:**
 * - {@link canonicalize} - Wrap fractional coordinates to [0,1)
 * - {@link supercell} - Create supercells by repeating the structure
 * - {@link hashStructure} - Generate structure hash for fast comparison
 *
 * **Site Management:** See {@link sites} submodule
 * - {@link appendSite}, {@link insertSite}, {@link removeSite}, {@link replaceSite}
 *
 * **Symmetry Analysis:** See {@link symmetry} submodule
 * - {@link getSymmetry}, {@link initMoyo} - Space group analysis with spglib
 */
export * from "./canonicalize";
export * from "./hashStructure";

export * from "./sites";
export * from "./symmetry";
export * from "./supercell";
