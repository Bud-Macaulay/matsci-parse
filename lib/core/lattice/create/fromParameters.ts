import { createLattice } from "../lattice";

const DEG2RAD = Math.PI / 180;
const EPS = 1e-12;

function clean(x: number) {
  return Math.abs(x) < EPS ? 0 : x;
}

/**
 * Creates a lattice from crystallographic parameters.
 *
 * @param a - First edge length (in the same units as the output, typically Ångströms)
 * @param b - Second edge length
 * @param c - Third edge length
 * @param alpha - Angle between lattice vectors **b** and **c** in **degrees**
 * @param beta - Angle between lattice vectors **a** and **c** in **degrees**
 * @param gamma - Angle between lattice vectors **a** and **b** in **degrees**
 *
 * @returns A new Lattice object with the specified parameters.
 *
 * @throws Will throw an error if gamma is too close to 0° or 180° (degenerate configuration)
 *
 * @remarks
 * This is the primary builder for lattices from crystallographic parameters.
 * It constructs a 3x3 lattice basis matrix from edge lengths and angles using the
 * following algorithm:
 * - **v1** = (a, 0, 0)
 * - **v2** = (b cos γ, b sin γ, 0)
 * - **v3** = (c cos β, (c(cos α - cos β cos γ))/sin γ, c√(1 - cos²β - sin²(γ)...))
 *
 * **Input Constraints:**
 * - All edge lengths must be positive
 * - All angles must be in the range (0°, 180°)
 * - Gamma angle must not be too close to 0° or 180° to avoid singularity
 * - Very small values (< 1e-12) are automatically cleaned to zero
 *
 * The parameters are in the standard crystallographic convention, commonly used in:
 * - Crystal structure determination
 * - Crystallographic data files (CIF, PDB)
 * - Materials databases
 *
 * @example
 * ```typescript
 * // Create an orthorhombic lattice
 * const ortho = fromParameters(3.5, 4.0, 6.5, 90, 90, 90);
 *
 * // Create a hexagonal lattice
 * const hex = fromParameters(3.2, 3.2, 5.2, 90, 90, 120);
 *
 * // Create a monoclinic lattice
 * const mono = fromParameters(5, 6, 7, 90, 100, 90);
 * ```
 */
/**
 * Creates a lattice from crystallographic lattice parameters.
 *
 * Constructs a lattice basis matrix from the six lattice parameters: three edge lengths
 * (a, b, c) and three angles (α, β, γ). This is the standard method for specifying
 * crystal structures.
 *
 * @param a - First edge length
 * @param b - Second edge length
 * @param c - Third edge length
 * @param alpha - Angle between b and c vectors (in degrees)
 * @param beta - Angle between a and c vectors (in degrees)
 * @param gamma - Angle between a and b vectors (in degrees)
 * @returns A new Lattice with the specified parameters
 * @throws Error if gamma is too close to 0° or 180° (would create a degenerate lattice)
 *
 * @remarks
 * - All angles should be in degrees (converted to radians internally)
 * - Uses classical crystallographic conventions
 * - First vector: a along x-axis
 * - Second vector: b in the xy-plane
 * - Third vector: c positioned to satisfy angle constraints
 * - Underlying method for all crystal system builders (cubic, hex, etc.)
 * - Very small computed values (< 1e-12) are automatically cleaned to 0
 *
 * @example
 * ```typescript
 * // Create cubic lattice
 * const cubic = fromParameters(4, 4, 4, 90, 90, 90);
 *
 * // Create tetragonal lattice
 * const tetra = fromParameters(3, 3, 5, 90, 90, 90);
 *
 * // Create triclinic lattice
 * const tri = fromParameters(3, 4, 5, 80, 85, 95);
 * ```
 */
export function fromParameters(
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number,
) {
  const alphaR = alpha * DEG2RAD;
  const betaR = beta * DEG2RAD;
  const gammaR = gamma * DEG2RAD;

  const cosA = Math.cos(alphaR);
  const cosB = Math.cos(betaR);
  const cosG = Math.cos(gammaR);
  const sinG = Math.sin(gammaR);

  // lattice vectors
  const v1 = [a, 0, 0];

  const v2 = [b * cosG, b * sinG, 0];

  // guard against degenerate gamma
  if (Math.abs(sinG) < EPS) {
    throw new Error("Invalid lattice: gamma too close to 0 or 180 degrees");
  }

  const cx = c * cosB;

  const cy = (c * (cosA - cosB * cosG)) / sinG;

  const czSquared = c * c - cx * cx - cy * cy;

  const cz = Math.sqrt(Math.max(0, czSquared));

  return createLattice([
    clean(v1[0]),
    clean(v1[1]),
    clean(v1[2]),
    clean(v2[0]),
    clean(v2[1]),
    clean(v2[2]),
    clean(cx),
    clean(cy),
    clean(cz),
  ]);
}
