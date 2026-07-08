import { expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { transpose } from "@/core/matrix/operations/transpose";

export function expectIdentity(m: ReturnType<typeof createMatrix>, tol?: number) {
  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = m.data[r * n + c];

      if (r === c) {
        expect(val).toBeCloseTo(1, tol);
      } else {
        expect(val).toBeCloseTo(0, tol);
      }
    }
  }
}

export function multiplyMatrices(
  A: ReturnType<typeof createMatrix>,
  B: ReturnType<typeof createMatrix>,
) {
  const n = A.rows;
  const result = createMatrix(n, n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;

      for (let k = 0; k < n; k++) {
        sum += A.data[r * n + k] * B.data[k * n + c];
      }

      result.data[r * n + c] = sum;
    }
  }

  return result;
}

export function expectVectorClose(actual: Float64Array, expected: number[], tol = 6) {
  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < actual.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], tol);
  }
}

export function makeInvertibleMatrix(size: number) {
  const data = new Array(size * size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === c) {
        data[r * size + c] = size + 1;
      } else {
        data[r * size + c] = 1;
      }
    }
  }

  return createMatrix(size, size, data);
}

export function makePDMatrix(size: number) {
  const M = createMatrix(size, size);
  const md = M.data;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      md[r * size + c] = r === c ? size + 1 : 0.5;
    }
  }

  return mul(transpose(M), M);
}

export function expectLLtEqualsA(
  L: ReturnType<typeof createMatrix>,
  A: ReturnType<typeof createMatrix>,
  tol = 10,
) {
  const n = L.rows;
  const ld = L.data;
  const ad = A.data;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;

      for (let k = 0; k < n; k++) {
        sum += ld[r * n + k] * ld[c * n + k];
      }

      expect(sum).toBeCloseTo(ad[r * n + c], tol);
    }
  }
}
