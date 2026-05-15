import { Matrix, createMatrix, clone, index } from "../../matrix";

function swapRows(m: Matrix, r1: number, r2: number) {
  if (r1 === r2) return;

  const cols = m.cols;

  for (let c = 0; c < cols; c++) {
    const i1 = index(cols, r1, c);
    const i2 = index(cols, r2, c);

    const tmp = m.data[i1];
    m.data[i1] = m.data[i2];
    m.data[i2] = tmp;
  }
}

function scaleRow(m: Matrix, r: number, factor: number) {
  const cols = m.cols;

  for (let c = 0; c < cols; c++) {
    m.data[index(cols, r, c)] *= factor;
  }
}

function addScaledRow(
  m: Matrix,
  target: number,
  source: number,
  factor: number,
) {
  const cols = m.cols;

  for (let c = 0; c < cols; c++) {
    m.data[index(cols, target, c)] += m.data[index(cols, source, c)] * factor;
  }
}

export function gjInverse(m: Matrix): Matrix {
  if (m.rows !== m.cols) {
    throw new Error("Inverse requires square matrix");
  }

  const n = m.rows;

  const A = clone(m);
  const I = createMatrix(n, n);

  for (let i = 0; i < n; i++) {
    I.data[i * n + i] = 1;
  }

  for (let i = 0; i < n; i++) {
    // pivoting (basic safety)
    if (A.data[i * n + i] === 0) {
      let swapRow = -1;

      for (let r = i + 1; r < n; r++) {
        if (A.data[r * n + i] !== 0) {
          swapRow = r;
          break;
        }
      }

      if (swapRow === -1) {
        throw new Error("Singular matrix");
      }

      swapRows(A, i, swapRow);
      swapRows(I, i, swapRow);
    }

    const pivot = A.data[i * n + i];

    // normalize pivot row
    scaleRow(A, i, 1 / pivot);
    scaleRow(I, i, 1 / pivot);

    // eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === i) continue;

      const factor = A.data[r * n + i];

      addScaledRow(A, r, i, -factor);
      addScaledRow(I, r, i, -factor);
    }
  }

  return I;
}
