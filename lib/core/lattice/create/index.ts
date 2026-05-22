/**
 * Crystal system builders - Specialized lattice constructors.
 *
 * @remarks
 * This module provides convenient functions to create lattices for specific crystal systems.
 * Each crystal system has distinct symmetry properties and parameter constraints.
 *
 * **The 7 Crystal Systems:**
 *
 * | System | Edge Lengths | Angles | Functions |
 * |--------|---|---|---|
 * | **Cubic** | a = b = c | α = β = γ = 90° | {@link cubic} |
 * | **Tetragonal** | a = b ≠ c | α = β = γ = 90° | {@link tetragonal} |
 * | **Orthorhombic** | a ≠ b ≠ c | α = β = γ = 90° | {@link orthorhombic} |
 * | **Hexagonal** | a = b ≠ c | α = β = 90°, γ = 120° | {@link hexagonal} |
 * | **Monoclinic** | a ≠ b ≠ c | α = γ = 90°, β ≠ 90° | {@link monoclinic} |
 * | **Triclinic** | a ≠ b ≠ c | All angles ≠ 90° | {@link fromParameters} |
 * | **Rhombohedral** | a = b = c | α = β = γ ≠ 90° | {@link rhombohedral} |
 *
 * All functions ultimately delegate to {@link fromParameters} for the actual lattice construction.
 *
 * **Usage Pattern:**
 * - Use specialized functions (cubic, hexagonal, etc.) when you know the crystal system
 * - Use {@link fromParameters} for general lattice creation
 *
 * @example
 * ```typescript
 * import { cubic, hexagonal, orthorhombic, fromParameters } from '@matsci/parse';
 *
 * // Simple crystal systems
 * const fe = cubic(2.87);                          // Iron (BCC)
 * const mg = hexagonal(3.21, 5.21);                // Magnesium
 * const nacl = orthorhombic(5.64, 5.64, 5.64);     // Sodium chloride (actually cubic)
 *
 * // General lattice from parameters
 * const general = fromParameters(5, 6, 7, 90, 100, 90);
 * ```
 */
export * from "./cubic";
export * from "./fromParameters";
export * from "./hexagonal";
export * from "./monoclinic";
export * from "./orthorhombic";
export * from "./rhombohedral";
export * from "./tetragonal";
