import { expect } from "vitest";

export function expectIdentityFloat64(mat: Float64Array, n = 3, eps = 1e-10) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = mat[i * n + j];
      const expected = i === j ? 1 : 0;
      expect(Math.abs(v - expected)).toBeLessThan(eps);
    }
  }
}

export function matMulFloat64(a: Float64Array, b: Float64Array) {
  const n = 3;
  const out = new Float64Array(9);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += a[i * n + k] * b[k * n + j];
      }
      out[i * n + j] = sum;
    }
  }

  return out;
}
