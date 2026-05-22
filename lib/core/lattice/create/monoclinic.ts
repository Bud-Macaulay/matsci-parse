import { fromParameters } from "./fromParameters";

/**
 * Creates a monoclinic lattice.
 *
 * @param a - First edge length
 * @param b - Second edge length
 * @param c - Third edge length
 * @param beta - Angle between lattice vectors **a** and **c** in **degrees**
 *              (the only non-90° angle in the monoclinic system)
 *
 * @returns A new Lattice object representing a monoclinic crystal system
 *          (a ≠ b ≠ c, α = γ = 90°, β ≠ 90°)
 *
 * @remarks
 * The monoclinic crystal system has:
 * - Three generally different edge lengths (a ≠ b ≠ c)
 * - Two angles equal to 90° (α = γ = 90°)
 * - One angle different from 90° (β ≠ 90°, typically 90° < β < 180°)
 * - One unique axis (b-axis) perpendicular to the a-c plane
 * - Monoclinic point group symmetry
 *
 * The monoclinic system is less symmetric than orthorhombic, but more symmetric than triclinic.
 * It's quite common in nature, especially for organic compounds and minerals.
 *
 * Common examples of monoclinic crystals:
 * - Gypsum (CaSO₄·2H₂O) - common mineral
 * - Azurite [Cu₃(CO₃)₂(OH)₂] - blue mineral
 * - Malachite [Cu₂(CO₃)(OH)₂] - green mineral
 * - Many pharmaceutical compounds
 * - β-sulfur (one polymorph of sulfur)
 * - Diopside (pyroxene mineral)
 *
 * @example
 * ```typescript
 * // Create a monoclinic lattice
 * // Example parameters: a = 5 Å, b = 6 Å, c = 7 Å, β = 100°
 * const lattice = monoclinic(5, 6, 7, 100);
 * const params = parameters(lattice);
 * // params ≈ [5, 6, 7, 90, 100, 90]
 * ```
 */
export function monoclinic(a: number, b: number, c: number, beta: number) {
  return fromParameters(a, b, c, 90, beta, 90);
}
