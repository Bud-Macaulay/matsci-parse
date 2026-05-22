import { fromParameters } from "./fromParameters";

/**
 * Creates a cubic lattice.
 *
 * @param a - Edge length of the cubic unit cell
 *
 * @returns A new Lattice object representing a cubic crystal system (a = b = c, α = β = γ = 90°)
 *
 * @remarks
 * The cubic crystal system is the simplest crystal system with:
 * - All three edge lengths equal (a = b = c)
 * - All three angles equal to 90° (α = β = γ = 90°)
 * - The highest symmetry (cubic symmetry group)
 *
 * Common examples of cubic crystals:
 * - Iron (Fe) - body-centered cubic (BCC)
 * - Copper (Cu), Aluminum (Al), Lead (Pb) - face-centered cubic (FCC)
 * - Diamond (C) - face-centered cubic
 * - Sodium chloride (NaCl) - rock salt structure
 * - Cesium chloride (CsCl) - simple cubic structure
 *
 * @example
 * ```typescript
 * // Create a cubic lattice with edge length 5 Ångströms
 * const lattice = cubic(5);
 * const params = parameters(lattice);
 * // params = [5, 5, 5, 90, 90, 90]
 * ```
 */
/**
 * Creates a cubic lattice.
 *
 * A cubic lattice is the simplest crystal system with all edge lengths equal
 * and all angles equal to 90°. Commonly found in materials like iron (Fe), copper (Cu),
 * and many ionic compounds.
 *
 * @param a - The edge length of the cubic unit cell
 * @returns A cubic Lattice with lattice parameter a
 *
 * @remarks
 * - Cubic: a = b = c, α = β = γ = 90°
 * - Highest symmetry cubic crystal system
 * - Volume = a³
 * - Used by many common metals and semiconductors
 *
 * @example
 * ```typescript
 * // Aluminum lattice (a ≈ 4.05 Å)
 * const al = cubic(4.05);
 *
 * // Iron (BCC, conventional cell a ≈ 2.87 Å)
 * const fe = cubic(2.87);
 * ```
 */
export function cubic(a: number) {
  return fromParameters(a, a, a, 90, 90, 90);
}
