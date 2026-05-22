import { fromParameters } from "./fromParameters";

/**
 * Creates a rhombohedral (trigonal) lattice.
 *
 * @param a - Edge length (all three lattice vectors have equal length)
 * @param alpha - Angle between each pair of lattice vectors in **degrees**
 *               (α = β = γ for the rhombohedral system)
 *
 * @returns A new Lattice object representing a rhombohedral crystal system
 *          (a = b = c, α = β = γ ≠ 90°)
 *
 * @remarks
 * The rhombohedral (trigonal) crystal system has:
 * - Three equal edge lengths (a = b = c)
 * - Three equal angles (α = β = γ), all different from 90°
 * - All lattice vectors have the same relationship to each other
 * - High symmetry along the main diagonal
 *
 * The rhombohedral system is sometimes called "trigonal" in crystallographic notation,
 * though "rhombohedral" refers specifically to this lattice description.
 *
 * Common examples of rhombohedral crystals:
 * - Diamond (C) - when described in rhombohedral coordinates
 * - Calcite (CaCO₃) - trigonal form
 * - Hematite (Fe₂O₃) - iron oxide mineral
 * - Corundum (Al₂O₃) - includes ruby and sapphire
 * - Bismuth (Bi) - semimetal
 * - Many perovskite structures
 *
 * Note: A rhombohedral lattice can also be described as a hexagonal lattice under
 * certain conditions. The choice depends on the symmetry analysis of the structure.
 *
 * @example
 * ```typescript
 * // Create a rhombohedral lattice like diamond
 * // Diamond: a ≈ 3.567 Å, α ≈ 60° (for rhombohedral primitive cell)
 * const lattice = rhombohedral(3.567, 60);
 * const params = parameters(lattice);
 * // params ≈ [3.567, 3.567, 3.567, 60, 60, 60]
 *
 * // Create a rhombohedral lattice like calcite
 * // Calcite: a ≈ 3.029 Å, α ≈ 78.07° (rhombohedral primitive)
 * const calcite = rhombohedral(3.029, 78.07);
 * ```
 */
export function rhombohedral(a: number, alpha: number) {
  return fromParameters(a, a, a, alpha, alpha, alpha);
}
