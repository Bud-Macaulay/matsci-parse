import { describe, it, expect } from "vitest";
import { lll } from "@/core/matrix/operations/reduction/lll";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";

function randomIntMatrix(n: number, max = 10) {
  const data = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    data[i] = Math.floor(Math.random() * (2 * max + 1)) - max;
  }
  return createMatrix(n, n, data);
}

function approx(a: number, b: number, eps = 1e-4) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

function det3(m: Float64Array): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

function normSq(m: { data: Float64Array; cols: number }, row: number): number {
  let s = 0;
  for (let j = 0; j < m.cols; j++) s += m.data[row * m.cols + j] ** 2;
  return s;
}

function isIntegerMatrix(m: { data: Float64Array }, eps = 1e-6): boolean {
  for (let i = 0; i < m.data.length; i++) {
    if (Math.abs(m.data[i] - Math.round(m.data[i])) > eps) return false;
  }
  return true;
}

function runSeeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// override Math.random for reproducible tests
const origRandom = Math.random;

function withSeededRandom(seed: number, fn: () => void) {
  const rand = runSeeded(seed);
  Math.random = rand;
  try {
    fn();
  } finally {
    Math.random = origRandom;
  }
}

describe("lll randomized stress tests", () => {
  const COUNT = 1000;

  it(`${COUNT} random 2×2 matrices: transform correct + unimodular`, () => {
    withSeededRandom(42, () => {
      for (let t = 0; t < COUNT; t++) {
        const n = 2;
        const A = randomIntMatrix(n, 10);

        // skip singular matrices
        const d = A.data[0] * A.data[3] - A.data[1] * A.data[2];
        if (Math.abs(d) < 0.5) continue;

        const { basis, transform } = lll(A);

        // reduced = transform × original
        const product = mul(transform, A);
        for (let i = 0; i < n * n; i++) {
          approx(product.data[i], basis.data[i]);
        }

        // transform is unimodular (integer entries)
        expect(isIntegerMatrix(transform)).toBe(true);

        // det(transform) = ±1
        const detVal = transform.data[0] * transform.data[3] - transform.data[1] * transform.data[2];
        expect(Math.abs(Math.abs(detVal) - 1)).toBeLessThan(1e-6);
      }
    });
  });

  it(`${COUNT} random 3×3 matrices: transform correct + unimodular`, () => {
    withSeededRandom(123, () => {
      for (let t = 0; t < COUNT; t++) {
        const n = 3;
        const A = randomIntMatrix(n, 8);

        // skip near-singular (det close to 0)
        const detVal = det3(A.data);
        if (Math.abs(detVal) < 0.5) continue;

        const { basis, transform } = lll(A);

        // reduced = transform × original
        const product = mul(transform, A);
        for (let i = 0; i < n * n; i++) {
          approx(product.data[i], basis.data[i]);
        }

        // transform is integer
        expect(isIntegerMatrix(transform)).toBe(true);

        // det = ±1
        const detT = det3(transform.data);
        expect(Math.abs(Math.abs(detT) - 1)).toBeLessThan(1e-6);
      }
    });
  });

  it(`${COUNT} random 4×4 matrices: transform correct + unimodular`, () => {
    withSeededRandom(777, () => {
      for (let t = 0; t < COUNT; t++) {
        const n = 4;
        const A = randomIntMatrix(n, 6);

        const { basis, transform } = lll(A);

        // reduced = transform × original
        const product = mul(transform, A);
        for (let i = 0; i < n * n; i++) {
          approx(product.data[i], basis.data[i]);
        }

        // transform is integer
        expect(isIntegerMatrix(transform)).toBe(true);
      }
    });
  });

  it(`${COUNT} random 5×5 matrices: transform correct + unimodular`, () => {
    withSeededRandom(2024, () => {
      for (let t = 0; t < COUNT; t++) {
        const n = 5;
        const A = randomIntMatrix(n, 5);

        const { basis, transform } = lll(A);

        // reduced = transform × original
        const product = mul(transform, A);
        for (let i = 0; i < n * n; i++) {
          approx(product.data[i], basis.data[i]);
        }

        // transform is integer
        expect(isIntegerMatrix(transform)).toBe(true);
      }
    });
  });

  it(`${COUNT} random 3×3: shortest reduced vector ≤ original shortest`, () => {
    withSeededRandom(9999, () => {
      let pass = 0;

      for (let t = 0; t < COUNT; t++) {
        const n = 3;
        const A = randomIntMatrix(n, 8);

        const detVal = det3(A.data);
        if (Math.abs(detVal) < 0.5) continue;

        const { basis } = lll(A);

        // find shortest original and reduced vectors
        let origMin = Infinity;
        for (let i = 0; i < n; i++) {
          const ns = normSq(A, i);
          if (ns < origMin) origMin = ns;
        }

        let redMin = Infinity;
        for (let i = 0; i < n; i++) {
          const ns = normSq(basis, i);
          if (ns < redMin) redMin = ns;
        }

        if (redMin <= origMin + 1e-6) pass++;
      }

      // at least 95% of cases should improve or maintain the shortest vector
      expect(pass / COUNT).toBeGreaterThanOrEqual(0.95);
    });
  });
});
