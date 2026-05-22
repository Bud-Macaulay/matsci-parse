/**
 * Lattice module - Crystallographic lattice representations and operations.
 *
 * @remarks
 * This module provides core types and functions for working with crystal lattices:
 *
 * **Core Types:**
 * - {@link Lattice}: Interface representing a crystallographic lattice
 *
 * **Lattice Construction:**
 * - {@link createLattice}: Create a lattice from a 3x3 basis matrix
 *
 * **Geometric Properties:**
 * - {@link lengths}: Extract edge lengths (a, b, c)
 * - {@link angles}: Extract lattice angles in radians (α, β, γ)
 * - {@link parameters}: Extract all parameters in degrees [a, b, c, α°, β°, γ°]
 * - {@link volume}: Compute unit cell volume
 *
 * **Advanced Properties:**
 * - {@link metricTensor}: Compute the metric tensor (G = A^T × A)
 * - {@link inverse}: Compute the inverse of the basis matrix
 *
 * **Reciprocal Lattice:**
 * - {@link reciprocalLattice}: Compute reciprocal lattice (physics convention, with 2π)
 * - {@link reciprocalLatticeCrystallographic}: Compute reciprocal lattice (crystallographic convention, no 2π)
 *
 * **Crystal System Builders:** See {@link create} submodule for specialized constructors
 * like {@link cubic}, {@link hexagonal}, {@link orthorhombic}, etc.
 *
 * @example
 * ```typescript
 * import { createLattice, parameters, cubic, hexagonal } from '@matsci/parse';
 *
 * // Create a cubic lattice
 * const cubic5 = cubic(5);
 * const [a, b, c, alpha, beta, gamma] = parameters(cubic5);
 * // [5, 5, 5, 90, 90, 90]
 *
 * // Create a hexagonal lattice
 * const hex = hexagonal(3.0, 5.0);
 * const hexParams = parameters(hex);
 * // [3.0, 3.0, 5.0, 90, 90, 120]
 * ```
 */
export * from "./lattice";

export * from "./angles";
export * from "./inverse";
export * from "./lengths";
export * from "./metricTensor";
export * from "./parameters";
export * from "./reciprocalLattice";
export * from "./reciprocalLatticeCrystallographic";
export * from "./volume";

export * from "./create";
