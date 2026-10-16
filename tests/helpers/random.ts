import { createMatrix } from "@/core/matrix/matrix";

/** Seeded uniform PRNG on [0, 1) (mulberry32), so benchmark inputs are
 * identical across runs and `bench:compare` compares like with like. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random n×n integer matrix with entries in [-max, max]. Pass
 * `diagonalBoost` to add it to the diagonal (forces full rank). */
export function randomIntLattice(
  rng: () => number,
  n: number,
  max: number,
  diagonalBoost = 0,
) {
  const data = new Float64Array(n * n);

  for (let i = 0; i < n * n; i++) {
    data[i] = Math.floor(rng() * (2 * max + 1)) - max;
  }

  for (let i = 0; i < n; i++) data[i * n + i] += diagonalBoost;

  return createMatrix(n, n, data);
}
