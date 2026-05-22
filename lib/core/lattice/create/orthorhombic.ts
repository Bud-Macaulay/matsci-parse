import { fromParameters } from "./fromParameters";

/**
 * Creates an orthorhombic lattice.
 *
 * @param a - First edge length
 * @param b - Second edge length
 * @param c - Third edge length
 *
 * @returns A new Lattice object representing an orthorhombic crystal system
 *          (a ≠ b ≠ c, α = β = γ = 90°)
 *
 * @remarks
 * The orthorhombic crystal system has:
 * - Three different edge lengths (a ≠ b ≠ c)
 * - All three angles equal to 90° (α = β = γ = 90°)
 * - Mutually perpendicular lattice vectors
 * - Orthorhombic point group symmetry
 *
 * This is one of the most common crystal systems in nature due to its lower symmetry
 * allowing for diverse crystal structures.
 *
 * Common examples of orthorhombic crystals:
 * - Sulfur (S) - α-sulfur
 * - Olivine [(Mg,Fe)₂SiO₄] - important mineral in Earth's mantle
 * - Aragonite (CaCO₃) - polymorph of calcite
 * - Cellulose - natural polymer
 * - Many organic crystals and pharmaceuticals
 *
 * @example
 * ```typescript
 * // Create an orthorhombic lattice (sulfur)
 * // S: a ≈ 10.47 Å, b ≈ 12.87 Å, c ≈ 24.39 Å
 * const lattice = orthorhombic(10.47, 12.87, 24.39);
 * const params = parameters(lattice);
 * // params ≈ [10.47, 12.87, 24.39, 90, 90, 90]
 * ```
 */
export function orthorhombic(a: number, b: number, c: number) {
  return fromParameters(a, b, c, 90, 90, 90);
}
