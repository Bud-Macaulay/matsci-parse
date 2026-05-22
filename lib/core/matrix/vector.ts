/**
 * A vector represented as a 64-bit floating-point typed array.
 *
 * Vectors are used throughout the library for efficient numerical operations,
 * including representing 3D coordinates, crystal lattice vectors, and mathematical
 * vector operations.
 *
 * @example
 * ```typescript
 * const v = new Float64Array([1, 2, 3]) as Vector;
 * ```
 */
export type Vector = Float64Array;
