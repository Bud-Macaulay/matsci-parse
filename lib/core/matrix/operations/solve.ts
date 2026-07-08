import { Matrix } from "../matrix";
import { Vector } from "../vector";
import { lu } from "./lu";

/** Solve the linear system Ax = b for a square matrix A and vector b.
 * Uses LU decomposition with partial pivoting.
 * @param A - A square invertible matrix.
 * @param b - The right-hand side vector.
 * @returns The solution vector x. */
export function solve(A: Matrix, b: Vector): Vector {
  if (A.rows !== A.cols) {
    throw new Error("Solve requires a square matrix");
  }

  const n = A.rows;

  if (b.length !== n) {
    throw new Error(
      `Vector length ${b.length} does not match matrix dimension ${n}`,
    );
  }

  const { LU, piv, singular } = lu(A);

  if (singular) {
    throw new Error("Singular matrix cannot be solved");
  }

  const data = LU.data;

  const x = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    x[i] = b[piv[i]];
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      x[i] -= data[i * n + j] * x[j];
    }
  }

  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) {
      x[i] -= data[i * n + j] * x[j];
    }

    x[i] /= data[i * n + i];
  }

  return x;
}
