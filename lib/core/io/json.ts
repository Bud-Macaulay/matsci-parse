import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";

/**
 * Serializes a structure to JSON format.
 *
 * Converts a Structure to a plain JavaScript object suitable for JSON stringification.
 *
 * @param structure - The structure to serialize
 * @returns An object with `lattice` (flattened array) and `sites` (with species and fractional coordinates)
 *
 * @remarks
 * - Lattice is serialized as a flat array [a1x, a1y, a1z, ...]
 * - Fractional coordinates are converted from Float64Array to regular arrays
 * - Use with JSON.stringify() for string serialization
 *
 * @example
 * ```typescript
 * const structure = { lattice: cubic(4), sites: [...] };
 * const json = toJSON(structure);
 * const jsonString = JSON.stringify(json);
 * ```
 */
export function toJSON(structure: Structure) {
  return {
    lattice: structure.lattice.basis.data,
    sites: structure.sites.map((s) => ({
      species: s.species,
      frac: Array.from(s.frac),
    })),
  };
}

/**
 * Deserializes a structure from JSON format.
 *
 * Reconstructs a Structure from a JSON object (typically parsed from JSON string).
 *
 * @param data - An object with `lattice` (9-element array) and `sites` array
 * @returns A new Structure object
 *
 * @remarks
 * - Lattice array must have exactly 9 elements
 * - Fractional coordinates are converted to Float64Array
 * - Inverse operation of toJSON()
 * - No validation is performed on the input data
 *
 * @example
 * ```typescript
 * const jsonData = {
 *   lattice: [4, 0, 0, 0, 4, 0, 0, 0, 4],
 *   sites: [{ species: 'Al', frac: [0, 0, 0] }]
 * };
 * const structure = fromJSON(jsonData);
 * ```
 */
export function fromJSON(data: any): Structure {
  return {
    lattice: createLattice(data.lattice),
    sites: data.sites.map((s: any) => ({
      species: s.species,
      frac: new Float64Array(s.frac),
    })),
  };
}
