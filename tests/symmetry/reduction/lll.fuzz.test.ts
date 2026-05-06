import { lll } from "../../../lib/symmetry/reduction/lll";

const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

describe("LLL fuzz (property-based)", () => {
  test("never breaks invariants across random inputs", () => {
    for (let t = 0; t < 500; t++) {
      const A = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => (Math.random() - 0.5) * 10),
      );

      const { lll_matrix, transformationMatrix } = lll(A);

      // 1. finite
      for (const M of [lll_matrix, transformationMatrix]) {
        for (const row of M) {
          for (const v of row) {
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      }

      // 2. non-degenerate output
      expect(Math.abs(det3(lll_matrix))).toBeGreaterThan(1e-8);

      // 3. no collapse
      const norms = lll_matrix.map((_, i) =>
        Math.hypot(...lll_matrix.map((r) => r[i])),
      );

      expect(Math.min(...norms)).toBeGreaterThan(1e-8);
    }
  });

  test("handles pathological near-singular inputs", () => {
    const bad = [
      [1, 1e-12, 1e-12],
      [1, 1e-12, 2e-12],
      [1, 1e-12, 3e-12],
    ];

    const { lll_matrix } = lll(bad);

    expect(lll_matrix.length).toBe(3);

    const hasFiniteBasis = lll_matrix.every((row) =>
      row.every((v) => Number.isFinite(v)),
    );

    expect(hasFiniteBasis).toBe(true);
  });
});
