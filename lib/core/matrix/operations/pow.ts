import { Matrix, identity, clone } from "../matrix";
import { mul } from "./mul";

/** Compute the matrix power A^p for a square matrix A and non-negative integer p.
 * Uses exponentiation by squaring (O(n³ log p)).
 * @param A - Square matrix.
 * @param p - Non-negative integer exponent.
 * @returns A^p. */
export function pow(A: Matrix, p: number): Matrix {
  if (A.rows !== A.cols) {
    throw new Error("Matrix power requires a square matrix");
  }

  if (p < 0 || !Number.isInteger(p)) {
    throw new Error("Exponent must be a non-negative integer");
  }

  if (p === 0) return identity(A.rows);
  if (p === 1) return clone(A);

  const n = A.rows;
  let result = identity(n);
  let base = A;
  let exp = p;

  while (exp > 0) {
    if (exp & 1) {
      result = mul(result, base);
    }

    base = mul(base, base);
    exp >>= 1;
  }

  return result;
}
