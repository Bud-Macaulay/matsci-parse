import { fromParameters } from "./fromParameters";

/**
 * Creates a tetragonal lattice.
 *
 * @param a - In-plane edge length (first two lattice vectors, a = b)
 * @param c - Out-of-plane edge length (third lattice vector)
 *
 * @returns A new Lattice object representing a tetragonal crystal system
 *          (a = b ≠ c, α = β = γ = 90°)
 *
 * @remarks
 * The tetragonal crystal system has:
 * - Two equal edge lengths (a = b)
 * - Third edge length generally different (c ≠ a)
 * - All angles equal to 90° (α = β = γ = 90°)
 * - Mutually perpendicular lattice vectors
 * - Tetragonal point group symmetry (square base with different height)
 *
 * The tetragonal system can be viewed as a distorted cubic system where the
 * c-axis is either compressed or extended relative to the a-b plane.
 *
 * Common examples of tetragonal crystals:
 * - Tin (β-Sn) - white tin, body-centered tetragonal
 * - Rutile (TiO₂) - important mineral, used in pigments
 * - Indium (In) - body-centered tetragonal
 * - Many high-temperature superconductors (e.g., YBa₂Cu₃O₇)
 * - Zirconium dioxide (ZrO₂) - ceramic material
 *
 * @example
 * ```typescript
 * // Create a tetragonal lattice (rutile TiO₂)
 * // TiO₂: a ≈ 4.59 Å, c ≈ 2.96 Å
 * const lattice = tetragonal(4.59, 2.96);
 * const params = parameters(lattice);
 * // params ≈ [4.59, 4.59, 2.96, 90, 90, 90]
 * ```
 */
export function tetragonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 90);
}
