/**
 * Crystal structure module.
 *
 * Provides types and functions for working with crystal structures.
 *
 * **Core Types:**
 * - {@link Structure}: Interface for crystal structures
 *
 * **Serialization:**
 * - JSON import/export functions for structure data
 *
 * **Operations:** See {@link operations} submodule
 * - Canonicalization, supercells, hashing
 * - Site manipulation (add/remove/replace)
 * - Symmetry analysis
 *
 * @example
 * ```typescript
 * import { cubic, appendSite, canonicalize } from '@matsci/parse';
 *
 * // Create a structure
 * const structure = {
 *   lattice: cubic(4.05),
 *   sites: [{ species: 'Al', frac: [0, 0, 0] }]
 * };
 *
 * // Manipulate it
 * const struct2 = appendSite(structure, { species: 'Al', frac: [0.5, 0.5, 0.5] });
 * const canonical = canonicalize(struct2);
 * ```
 */
export * from "./structure";

export * from "./operations";
