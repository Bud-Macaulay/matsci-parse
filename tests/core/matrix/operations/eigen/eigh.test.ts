import { describe, expect, it } from "vitest";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { eigh } from "@/core/matrix/operations/eigen/eigh";

/** Seeded symmetric matrix with entries in [-1, 1). */
function randomSymmetric(n: number, seed: number): Matrix {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return (2 * state) / 2 ** 32 - 1;
  };
  const m = createMatrix(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const x = next();
      m.data[i * n + j] = x;
      m.data[j * n + i] = x;
    }
  }

  return m;
}

/** max |A V - V Λ| and max |Vᵀ V - I|. */
function residuals(A: Matrix, values: Float64Array, V: Matrix) {
  const n = A.rows;
  let decomposition = 0;
  let orthonormality = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let av = 0;
      let vtv = 0;

      for (let k = 0; k < n; k++) {
        av += A.data[i * n + k] * V.data[k * n + j];
        vtv += V.data[k * n + i] * V.data[k * n + j];
      }

      decomposition = Math.max(
        decomposition,
        Math.abs(av - V.data[i * n + j] * values[j]),
      );
      orthonormality = Math.max(
        orthonormality,
        Math.abs(vtv - (i === j ? 1 : 0)),
      );
    }
  }

  return { decomposition, orthonormality };
}

describe("eigh", () => {
  it("decomposes a 2x2 matrix", () => {
    const { values, vectors } = eigh(createMatrix(2, 2, [2, 1, 1, 2]));

    expect(Array.from(values)).toEqual([
      expect.closeTo(1, 14),
      expect.closeTo(3, 14),
    ]);
    // (1, -1)/√2 and (1, 1)/√2, up to sign
    expect(Math.abs(vectors.data[0])).toBeCloseTo(Math.SQRT1_2, 14);
    expect(vectors.data[0] * vectors.data[2]).toBeCloseTo(-0.5, 14);
    expect(vectors.data[1] * vectors.data[3]).toBeCloseTo(0.5, 14);
  });

  it("decomposes a 3x3 matrix with known eigenvalues", () => {
    // Eigenvalues 2 - √2, 2, 2 + √2
    const A = createMatrix(3, 3, [2, -1, 0, -1, 2, -1, 0, -1, 2]);
    const { values, vectors } = eigh(A);

    expect(values[0]).toBeCloseTo(2 - Math.SQRT2, 14);
    expect(values[1]).toBeCloseTo(2, 14);
    expect(values[2]).toBeCloseTo(2 + Math.SQRT2, 14);

    const r = residuals(A, values, vectors);
    expect(r.decomposition).toBeLessThan(1e-14);
    expect(r.orthonormality).toBeLessThan(1e-14);
  });

  it("sorts the eigenvalues of a diagonal matrix", () => {
    const { values, vectors } = eigh(
      createMatrix(3, 3, [3, 0, 0, 0, -1, 0, 0, 0, 2]),
    );

    expect(Array.from(values)).toEqual([-1, 2, 3]);
    expect(Array.from(vectors.data)).toEqual([0, 0, 1, 1, 0, 0, 0, 1, 0]);
  });

  it("gives an orthonormal basis for a degenerate eigenvalue", () => {
    // Eigenvalues 0, 3, 3
    const A = createMatrix(3, 3, [2, -1, -1, -1, 2, -1, -1, -1, 2]);
    const { values, vectors } = eigh(A);

    expect(values[0]).toBeCloseTo(0, 14);
    expect(values[1]).toBeCloseTo(3, 14);
    expect(values[2]).toBeCloseTo(3, 14);

    const r = residuals(A, values, vectors);
    expect(r.decomposition).toBeLessThan(1e-14);
    expect(r.orthonormality).toBeLessThan(1e-14);
  });

  it.each([1, 4, 10, 40, 120])("decomposes a random %ix%i matrix", (n) => {
    const A = randomSymmetric(n, n);
    const { values, vectors } = eigh(A);

    for (let i = 1; i < n; i++)
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);

    const r = residuals(A, values, vectors);
    expect(r.decomposition).toBeLessThan(1e-12);
    expect(r.orthonormality).toBeLessThan(1e-12);
  });

  it("keeps the trace", () => {
    const A = randomSymmetric(12, 7);
    const { values } = eigh(A);
    let trace = 0;

    for (let i = 0; i < 12; i++) trace += A.data[i * 12 + i];

    expect(values.reduce((s, x) => s + x, 0)).toBeCloseTo(trace, 12);
  });

  it("handles the zero matrix", () => {
    const { values, vectors } = eigh(createMatrix(3, 3));

    expect(Array.from(values)).toEqual([0, 0, 0]);
    expect(Array.from(vectors.data)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("does not modify its input", () => {
    const A = randomSymmetric(5, 3);
    const copy = Array.from(A.data);

    eigh(A);

    expect(Array.from(A.data)).toEqual(copy);
  });

  it.each([1e200, 1e-200])(
    "decomposes a matrix with entries of order %d (no overflow)",
    (magnitude) => {
      const B = randomSymmetric(10, 11);
      const A = createMatrix(
        10,
        10,
        Array.from(B.data, (x) => x * magnitude),
      );
      const { values, vectors } = eigh(A);
      const reference = eigh(B);

      for (let i = 0; i < 10; i++) {
        expect(values[i] / magnitude).toBeCloseTo(reference.values[i], 13);
      }

      const scaled = residuals(
        B,
        values.map((x) => x / magnitude),
        vectors,
      );
      expect(scaled.decomposition).toBeLessThan(1e-13);
      expect(scaled.orthonormality).toBeLessThan(1e-13);
    },
  );

  it("separates eigenvalues of very different magnitude", () => {
    // tan(2φ) of order 1e-310: θ² overflows without hypot
    const A = createMatrix(2, 2, [1e300, 1e-10, 1e-10, -1e300]);
    const { values } = eigh(A);

    expect(Array.from(values)).toEqual([-1e300, 1e300]);
  });

  it("decomposes Wilkinson's W21+ (close eigenvalue pairs)", () => {
    const n = 21;
    const A = createMatrix(n, n);

    for (let i = 0; i < n; i++) {
      A.data[i * n + i] = Math.abs(10 - i);
      if (i + 1 < n) {
        A.data[i * n + i + 1] = 1;
        A.data[(i + 1) * n + i] = 1;
      }
    }

    const { values, vectors } = eigh(A);
    // The two largest agree to about 1e-14 (Wilkinson, 1965)
    expect(values[n - 1]).toBeCloseTo(10.746194182903393, 12);
    expect(values[n - 2]).toBeCloseTo(10.746194182903322, 12);

    const r = residuals(A, values, vectors);
    expect(r.decomposition).toBeLessThan(1e-13);
    expect(r.orthonormality).toBeLessThan(1e-13);
  });

  it.each([NaN, Infinity, -Infinity])("rejects a %d entry", (x) => {
    expect(() => eigh(createMatrix(2, 2, [1, x, x, 1]))).toThrow("finite");
  });

  it("rejects non-square matrices", () => {
    expect(() => eigh(createMatrix(2, 3))).toThrow("square");
  });

  it("rejects non-symmetric matrices", () => {
    expect(() => eigh(createMatrix(2, 2, [1, 2, 0, 1]))).toThrow("symmetric");
  });

  it("accepts round-off asymmetry", () => {
    const A = createMatrix(2, 2, [1e3, 1 + 1e-13, 1, 2e3]);

    expect(() => eigh(A)).not.toThrow();
  });
});
