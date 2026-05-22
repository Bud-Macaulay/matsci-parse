import { lengths } from "./lengths";
import { angles } from "./angles";
import { Lattice } from "./lattice";

const RAD2DEG = 180 / Math.PI;

/**
 * Extracts the standard crystallographic parameters from a lattice.
 *
 * @param lattice - The lattice to extract parameters from.
 *
 * @returns A tuple [a, b, c, alpha, beta, gamma] containing:
 *          - **a, b, c**: Edge lengths of the unit cell
 *          - **alpha, beta, gamma**: Angles of the unit cell in **degrees**
 *
 * @remarks
 * - Edge lengths are in the same units as the lattice basis vectors
 * - **Angles are returned in degrees (not radians)**
 * - alpha is the angle between **b** and **c**
 * - beta is the angle between **a** and **c**
 * - gamma is the angle between **a** and **b**
 * - Conversion formula: degrees = radians × (180/π)
 *
 * @example
 * ```typescript
 * // Cubic system
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const [a, b, c, alpha, beta, gamma] = parameters(lattice);
 * // [5, 5, 5, 90, 90, 90]
 *
 * // Hexagonal system
 * const hex = hexagonal(3.0, 5.0);
 * const [a2, b2, c2, alpha2, beta2, gamma2] = parameters(hex);
 * // [3.0, 3.0, 5.0, 90, 90, 120]
 * ```
 */
/**
 * Computes all six lattice parameters from a lattice basis.
 *
 * Returns the complete lattice specification in standard crystallographic notation:
 * [a, b, c, α, β, γ] where a, b, c are edge lengths and α, β, γ are angles.
 *
 * @param lattice - The crystal lattice
 * @returns A tuple [a, b, c, alpha, beta, gamma] where angles are in degrees
 *
 * @remarks
 * - Angles are converted from radians to degrees (multiplied by 180/π)
 * - This is the standard representation used in crystallography
 * - Combines results from lengths() and angles() functions
 * - Used for crystal database storage and structure file formats (CIF, etc.)
 *
 * @example
 * ```typescript
 * const lattice = cubic(4.05);
 * const params = parameters(lattice);
 * // [4.05, 4.05, 4.05, 90, 90, 90]
 * ```
 */
export function parameters(
  lattice: Lattice,
): [number, number, number, number, number, number] {
  const [a, b, c] = lengths(lattice);
  const [alpha, beta, gamma] = angles(lattice);

  return [a, b, c, alpha * RAD2DEG, beta * RAD2DEG, gamma * RAD2DEG];
}
