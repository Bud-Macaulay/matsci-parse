import { Matrix, clone } from "../matrix";

const EPS = 1e-12;

export function rank(m: Matrix): number {
  const A = clone(m).data;
  const rows = m.rows;
  const cols = m.cols;

  let r = 0;

  let leadCol = 0;

  for (let row = 0; row < rows && leadCol < cols; row++) {
    let pivotRow = row;

    // find pivot
    while (pivotRow < rows && Math.abs(A[pivotRow * cols + leadCol]) < EPS) {
      pivotRow++;
    }

    if (pivotRow === rows) {
      leadCol++;
      row--;
      continue;
    }

    // swap rows
    if (pivotRow !== row) {
      for (let j = 0; j < cols; j++) {
        const tmp = A[row * cols + j];
        A[row * cols + j] = A[pivotRow * cols + j];
        A[pivotRow * cols + j] = tmp;
      }
    }

    const pivotVal = A[row * cols + leadCol];

    // normalize + eliminate below
    for (let i = row + 1; i < rows; i++) {
      const factor = A[i * cols + leadCol] / pivotVal;

      if (Math.abs(factor) > EPS) {
        for (let j = leadCol; j < cols; j++) {
          A[i * cols + j] -= factor * A[row * cols + j];
        }
      }
    }

    r++;
    leadCol++;
  }

  return r;
}
