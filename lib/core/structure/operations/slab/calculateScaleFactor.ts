import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { determinant } from "@/core/matrix/operations/determinant";
import { dot } from "@/core/matrix/operations/vector/dot";
import { norm } from "@/core/matrix/operations/vector/norm";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import type { Lattice } from "@/core/lattice/lattice";
import { EPSILON } from "@/core/math/constants";
import { gcd, lcm } from "@/core/math/numeric";

function reduceVector(v: number[]): number[] {
  let g = 0;
  for (const x of v) {
    g = gcd(g, Math.abs(Math.round(x)));
  }
  if (g <= 1) return v;
  return v.map((x) => Math.round(x / g));
}

/**
 * Calculate the slab scale factor following pymatgen's `calculate_scaling_factor` algorithm.
 *
 * Given Miller indices (h, k, l), builds a 3×3 integer matrix U such that:
 * - Rows 0 and 1 are real-space vectors perpendicular to the surface normal (in-plane).
 * - Row 2 is a real-space vector with maximal projection onto the surface normal (c-direction).
 *
 * The key insight: a real-space vector v = r·lattice is perpendicular to the (hkl) surface
 * normal iff r·[h,k,l] = 0.  In-plane rows are built as LCM combinations of lattice vectors
 * whose integer coefficients cancel the dot product with the Miller index.
 *
 * @param millerIndex - The Miller indices [h, k, l].
 * @param lattice - The crystal lattice.
 * @returns A 3×3 integer Matrix (the scale factor).
 */
export function calculateScaleFactor(
  millerIndex: [number, number, number],
  lattice: Lattice,
): Matrix {
  const [h, k, l] = millerIndex;

  // Surface normal in Cartesian from reciprocal lattice
  const recip = reciprocalLatticeCrystallographic(lattice);
  const rb = recip.basis.data;
  const normalRaw = new Float64Array([
    h * rb[0] + k * rb[3] + l * rb[6],
    h * rb[1] + k * rb[4] + l * rb[7],
    h * rb[2] + k * rb[5] + l * rb[8],
  ]);
  const normalLen = norm(normalRaw);
  if (normalLen < EPSILON) {
    throw new Error("Miller index [0,0,0] is invalid");
  }
  const normal = new Float64Array(normalRaw.map((x) => x / normalLen));

  const basis = lattice.basis.data;
  const millerArr = [h, k, l];

  // Classify lattice vectors: in-plane (miller[i]==0) vs non-orthogonal
  const slabScaleFactor: number[][] = [];
  const nonOrthInd: [number, number][] = []; // [index, projection onto normal]

  for (let idx = 0; idx < 3; idx++) {
    if (millerArr[idx] === 0) {
      // Lattice vector is already in the surface plane
      const row = [0, 0, 0];
      row[idx] = 1;
      slabScaleFactor.push(row);
    } else {
      const aIdx = new Float64Array([
        basis[idx * 3],
        basis[idx * 3 + 1],
        basis[idx * 3 + 2],
      ]);
      const aLen = norm(aIdx);
      const d = Math.abs(dot(normal, aIdx)) / aLen;
      nonOrthInd.push([idx, d]);
    }
  }

  // Pick the vector with maximum projection onto normal as the c-direction
  let cIndex = nonOrthInd[0][0];
  let maxProj = nonOrthInd[0][1];
  for (const [idx, proj] of nonOrthInd) {
    if (proj > maxProj) {
      cIndex = idx;
      maxProj = proj;
    }
  }

  // Build in-plane vectors from non-orthogonal pairs using LCM combinations
  // For pair (ii, jj): row[ii] = -lcm/m[ii], row[jj] = lcm/m[jj]
  // This ensures row·[h,k,l] = (-lcm/m[ii])*m[ii] + (lcm/m[jj])*m[jj] = -lcm + lcm = 0
  if (nonOrthInd.length > 1) {
    const millerNonZero = nonOrthInd.map(([idx]) => Math.abs(millerArr[idx]));
    let lcmVal = millerNonZero[0];
    for (let i = 1; i < millerNonZero.length; i++) {
      lcmVal = lcm(lcmVal, millerNonZero[i]);
    }

    for (let ii = 0; ii < nonOrthInd.length; ii++) {
      for (let jj = ii + 1; jj < nonOrthInd.length; jj++) {
        const iiIdx = nonOrthInd[ii][0];
        const jjIdx = nonOrthInd[jj][0];
        const row = [0, 0, 0];
        row[iiIdx] = -Math.round(lcmVal / millerArr[iiIdx]);
        row[jjIdx] = Math.round(lcmVal / millerArr[jjIdx]);
        slabScaleFactor.push(reduceVector(row));
        if (slabScaleFactor.length === 2) break;
      }
      if (slabScaleFactor.length === 2) break;
    }
  }

  // Add c-direction vector: use the lattice vector at cIndex (identity row)
  const cRow = [0, 0, 0];
  cRow[cIndex] = 1;
  slabScaleFactor.push(cRow);

  // Build matrix
  const flat = slabScaleFactor.flat();
  let mat = createMatrix(3, 3, flat);

  // Ensure positive determinant (left-handed → negate first row)
  if (determinant(mat) < 0) {
    mat = createMatrix(
      3,
      3,
      flat.map((x, i) => (i < 3 ? -x : x)),
    );
  }

  return mat;
}
