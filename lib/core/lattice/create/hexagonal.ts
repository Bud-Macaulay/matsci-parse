import { fromParameters } from "./fromParameters";

/**
 * Creates a hexagonal lattice.
 *
 * @param a - In-plane edge length (first two lattice vectors, a = b)
 * @param c - Out-of-plane edge length (third lattice vector)
 *
 * @returns A new Lattice object representing a hexagonal crystal system
 *          (a = b ≠ c, α = β = 90°, γ = 120°)
 *
 * @remarks
 * The hexagonal crystal system has:
 * - Two equal edge lengths in the basal plane (a = b)
 * - Third edge length generally different (c ≠ a)
 * - Basal plane angles of 90° (α = β = 90°)
 * - Angle between basal vectors of 120° (γ = 120°)
 * - High symmetry (hexagonal symmetry group)
 *
 * The 120° angle is characteristic of hexagonal close-packed arrangements,
 * where atoms form a triangular lattice in the basal plane.
 *
 * Common examples of hexagonal crystals:
 * - Magnesium (Mg) - hexagonal close-packed (HCP)
 * - Zinc (Zn) - hexagonal close-packed
 * - Graphite (C) - layered hexagonal structure
 * - Wurtzite (ZnS) - hexagonal zincblende structure
 * - SiC (silicon carbide) - hexagonal polymorph
 *
 * @example
 * ```typescript
 * // Create a hexagonal lattice like magnesium
 * // Mg: a ≈ 3.21 Å, c ≈ 5.21 Å
 * const lattice = hexagonal(3.21, 5.21);
 * const params = parameters(lattice);
 * // params ≈ [3.21, 3.21, 5.21, 90, 90, 120]
 * ```
 */
/**
 * Creates a hexagonal lattice.
 *
 * A hexagonal lattice has two equal in-plane edge lengths with a 120° angle,
 * and a different vertical edge length. Common in materials like graphite,
 * zinc, and magnesium.
 *
 * @param a - The in-plane lattice parameter (a = b)
 * @param c - The vertical lattice parameter
 * @returns A hexagonal Lattice
 *
 * @remarks
 * - Hexagonal: a = b ≠ c, α = β = 90°, γ = 120°
 * - High symmetry in the ab-plane
 * - Used for layer materials and metal hexagonal close-packed (HCP) structures
 * - Related to rhombohedral through basis transformation
 *
 * @example
 * ```typescript
 * // Graphite (a ≈ 2.42 Å, c ≈ 6.70 Å)
 * const graphite = hexagonal(2.42, 6.70);
 *
 * // Zinc (a ≈ 2.66 Å, c ≈ 4.95 Å)
 * const zn = hexagonal(2.66, 4.95);
 * ```
 */
export function hexagonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 120);
}
