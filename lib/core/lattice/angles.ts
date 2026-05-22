import { dot } from "../matrix/operations/vector/dot";
import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";

import { Vector } from "../matrix/vector";

function angle(u: Vector, v: Vector) {
  const denom = norm(u) * norm(v);
  if (denom === 0) throw new Error("Zero-length lattice vector");

  const c = dot(u, v) / denom;
  const clamped = Math.max(-1, Math.min(1, c));

  return Math.acos(clamped);
}

/**
 * Computes the three angles of a lattice in radians.
 *
 * @param lattice - The lattice to compute angles for.
 *
 * @returns A tuple [alpha, beta, gamma] containing the three lattice angles in **radians**.
 *          - **alpha**: Angle between lattice vectors **b** and **c**
 *          - **beta**: Angle between lattice vectors **a** and **c**
 *          - **gamma**: Angle between lattice vectors **a** and **b**
 *
 * @throws Will throw an error if any lattice vector has zero length.
 *
 * @remarks
 * - All angles are returned in **radians**, not degrees
 * - To convert to degrees, multiply by 180/π
 * - Uses the dot product formula: cos(θ) = (u·v) / (|u| × |v|)
 * - Results are clamped to the valid range [-1, 1] before applying arccos to avoid numerical errors
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const [alpha, beta, gamma] = angles(lattice);
 * // For cubic: alpha ≈ 1.5708 rad (90°), beta ≈ 1.5708 rad, gamma ≈ 1.5708 rad
 * console.log(alpha * 180 / Math.PI); // 90 degrees
 * ```
 */
/**
 * Computes the angles between lattice vectors in a crystal lattice.
 *
 * Returns the three angles in crystallography notation:
 * - α (alpha): angle between lattice vectors b and c
 * - β (beta): angle between lattice vectors a and c
 * - γ (gamma): angle between lattice vectors a and b
 *
 * @param lattice - The crystal lattice
 * @returns A tuple [α, β, γ] with angles in radians
 * @throws Error if any lattice vector has zero length
 *
 * @remarks
 * - Angles are returned in radians (use RAD2DEG conversion for degrees)
 * - All angles are in range [0, π]
 * - Used with edge lengths to fully specify crystal geometry
 * - For typical crystal systems: cubic/ortho have 90°, others vary
 *
 * @example
 * ```typescript
 * const lattice = cubic(4);
 * const [alpha, beta, gamma] = angles(lattice);
 * console.log(alpha * 180/Math.PI);  // ~90 degrees
 * ```
 */
export function angles(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a: Vector = new Float64Array([m[0], m[1], m[2]]);
  const b: Vector = new Float64Array([m[3], m[4], m[5]]);
  const c: Vector = new Float64Array([m[6], m[7], m[8]]);

  const alpha = angle(b, c);
  const beta = angle(a, c);
  const gamma = angle(a, b);

  return [alpha, beta, gamma];
}
