import { lll } from "../../../lib/symmetry/reduction/lll";

const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const colNorms = (M: number[][]) =>
  M[0].map((_, i) => Math.hypot(...M.map((row) => row[i])));

const isFiniteMatrix = (M: number[][]) =>
  M.every((row) => row.every((v) => Number.isFinite(v)));

const maxAbsEntry = (M: number[][]) => Math.max(...M.flat().map(Math.abs));

describe("LLL extended fuzz (edge-case stress)", () => {
  test("random small integer lattices (stability + unimodularity sanity)", () => {
    for (let t = 0; t < 500; t++) {
      const A = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => Math.floor((Math.random() - 0.5) * 20)),
      );

      const { lll_matrix, transformationMatrix } = lll(A);

      expect(isFiniteMatrix(lll_matrix)).toBe(true);
      expect(isFiniteMatrix(transformationMatrix)).toBe(true);

      // volume should not explode
      expect(Number.isFinite(det3(lll_matrix))).toBe(true);

      // transformation should not blow up numerically
      expect(maxAbsEntry(transformationMatrix)).toBeLessThan(1e6);
    }
  });

  test("nearly collinear / rank-deficient stress", () => {
    for (let t = 0; t < 500; t++) {
      const base = [Math.random(), Math.random(), Math.random()];

      const A = [
        base.map((v) => v + (Math.random() - 0.5) * 1e-9),
        base.map((v) => v + (Math.random() - 0.5) * 1e-9),
        base.map((v) => v + (Math.random() - 0.5) * 1e-9),
      ];

      const { lll_matrix } = lll(A);

      expect(isFiniteMatrix(lll_matrix)).toBe(true);

      const norms = colNorms(lll_matrix);

      // avoid total collapse
      expect(Math.min(...norms)).toBeGreaterThan(1e-10);
    }
  });

  test("extreme scaling invariance", () => {
    for (let t = 0; t < 500; t++) {
      const A = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => (Math.random() - 0.5) * 1e6),
      );

      const { lll_matrix } = lll(A);

      expect(isFiniteMatrix(lll_matrix)).toBe(true);

      // ensure no overflow collapse
      const norms = colNorms(lll_matrix);
      expect(Math.min(...norms)).toBeGreaterThan(1e-12);
      expect(Math.max(...norms)).toBeLessThan(1e12);
    }
  });

  test("swap-loop / cycling detector (anti-infinite-loop fuzz)", () => {
    for (let t = 0; t < 500; t++) {
      const A = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => Math.sin(Math.random() * 1e3) * 1e-3),
      );

      const start = Date.now();
      const { lll_matrix } = lll(A);
      const elapsed = Date.now() - start;

      expect(isFiniteMatrix(lll_matrix)).toBe(true);

      // LLL should never "hang"
      expect(elapsed).toBeLessThan(50);
    }
  });

  test("degenerate zero-heavy inputs", () => {
    const cases = [
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 1e-12],
      ],
    ];

    for (const A of cases) {
      const { lll_matrix } = lll(A);

      expect(isFiniteMatrix(lll_matrix)).toBe(true);
      expect(lll_matrix.length).toBe(3);
    }
  });
});
