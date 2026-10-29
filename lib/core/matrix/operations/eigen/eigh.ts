import { Matrix, createMatrix } from "../../matrix";

/** Eigenvalues and eigenvectors of a real symmetric matrix. */
export interface SymmetricEigen {
  /** Eigenvalues in ascending order. */
  values: Float64Array;
  /** Unit eigenvectors as the columns, in the order of `values`. */
  vectors: Matrix;
}

const MAX_SWEEPS = 100;

/** Relative asymmetry above which a matrix is rejected. */
const SYMMETRY_TOLERANCE = 1e-10;

/** Converged when the off-diagonal norm is below this fraction of the norm. */
const CONVERGENCE_TOLERANCE = 1e-15;

/** x · 2^e, in two steps so that 2^e itself cannot overflow or underflow. */
function scaleByPowerOfTwo(x: number, e: number): number {
  const half = Math.trunc(e / 2);

  return x * 2 ** half * 2 ** (e - half);
}

/** Eigen-decomposition of a real symmetric matrix (A = V Λ Vᵀ), like
 * numpy.linalg.eigh: eigenvalues ascending, unit eigenvectors as the columns
 * of `vectors`. The sign of each eigenvector is arbitrary, and so is the
 * basis within a degenerate eigenspace.
 *
 * Cyclic Jacobi rotations (Golub & Van Loan, 8.5; the update of Numerical
 * Recipes, 11.1): simple and accurate, also for the eigenvectors. Each sweep
 * costs O(n³), and a handful of sweeps are needed: meant for matrices up to a
 * few hundred rows.
 * @param A - Symmetric matrix with finite entries (not modified).
 * @returns The eigenvalues and eigenvectors.
 * @throws If A is not square, not symmetric or not finite, or if the
 *   iteration does not converge. */
export function eigh(A: Matrix): SymmetricEigen {
  if (A.rows !== A.cols) {
    throw new Error("eigh requires a square matrix");
  }

  const n = A.rows;
  const size = n * n;
  let maxAbs = 0;

  for (let i = 0; i < size; i++) {
    if (!Number.isFinite(A.data[i])) {
      throw new Error("eigh requires finite entries");
    }

    maxAbs = Math.max(maxAbs, Math.abs(A.data[i]));
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (
        Math.abs(A.data[i * n + j] - A.data[j * n + i]) >
        SYMMETRY_TOLERANCE * maxAbs
      ) {
        throw new Error("eigh requires a symmetric matrix");
      }
    }
  }

  // Work on A / 2^exponent, with entries below 1 in magnitude: exact, and
  // the sums of squares below cannot overflow or underflow.
  const exponent = maxAbs > 0 ? Math.floor(Math.log2(maxAbs)) + 1 : 0;
  const a = new Float64Array(size);

  for (let i = 0; i < size; i++) {
    a[i] = scaleByPowerOfTwo(A.data[i], -exponent);
  }

  const v = new Float64Array(size);

  for (let i = 0; i < n; i++) v[i * n + i] = 1;

  let norm2 = 0;

  for (let i = 0; i < size; i++) norm2 += a[i] * a[i];

  const tolerance2 = CONVERGENCE_TOLERANCE ** 2 * norm2;

  // The upper triangle (the lower one is not updated by the rotations).
  const offNorm2 = () => {
    let s = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) s += a[i * n + j] ** 2;
    }

    return 2 * s;
  };

  let sweep = 0;

  for (; sweep < MAX_SWEEPS && offNorm2() > tolerance2; sweep++) {
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q];

        if (apq === 0) continue;

        const app = a[p * n + p];
        const aqq = a[q * n + q];
        const g = 100 * Math.abs(apq);

        // Negligible next to both diagonal entries (after a few sweeps, as
        // in Numerical Recipes): drop it, so that the iteration ends.
        if (
          sweep > 3 &&
          Math.abs(app) + g === Math.abs(app) &&
          Math.abs(aqq) + g === Math.abs(aqq)
        ) {
          a[p * n + q] = 0;
          continue;
        }

        // Rotation that zeroes a[p][q]: t = tan(φ), the smaller root of
        // t² + 2θt - 1 = 0.
        const theta = (aqq - app) / (2 * apq);
        const t =
          (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.hypot(theta, 1));
        const c = 1 / Math.hypot(t, 1);
        const s = t * c;
        const tau = s / (1 + c);
        const h = t * apq;

        a[p * n + p] = app - h;
        a[q * n + q] = aqq + h;
        a[p * n + q] = 0;

        // Only the upper triangle is kept up to date: a[k][p] is read at
        // a[min(k, p)][max(k, p)], and the same for q.
        const rotate = (kp: number, kq: number) => {
          const akp = a[kp];
          const akq = a[kq];
          a[kp] = akp - s * (akq + tau * akp);
          a[kq] = akq + s * (akp - tau * akq);
        };

        for (let k = 0; k < p; k++) rotate(k * n + p, k * n + q);
        for (let k = p + 1; k < q; k++) rotate(p * n + k, k * n + q);
        for (let k = q + 1; k < n; k++) rotate(p * n + k, q * n + k);

        for (let k = 0; k < n; k++) {
          const vkp = v[k * n + p];
          const vkq = v[k * n + q];
          v[k * n + p] = vkp - s * (vkq + tau * vkp);
          v[k * n + q] = vkq + s * (vkp - tau * vkq);
        }
      }
    }
  }

  if (offNorm2() > tolerance2) {
    throw new Error(`eigh did not converge in ${MAX_SWEEPS} sweeps`);
  }

  const diagonal = Array.from({ length: n }, (_, i) => a[i * n + i]);
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => diagonal[i] - diagonal[j],
  );
  const values = new Float64Array(n);
  const vectors = createMatrix(n, n);

  order.forEach((col, i) => {
    values[i] = scaleByPowerOfTwo(diagonal[col], exponent);

    for (let k = 0; k < n; k++) vectors.data[k * n + i] = v[k * n + col];
  });

  return { values, vectors };
}
