/**
 * Shared corpus of representative 3×3 lattices (rows = lattice vectors) for
 * Niggli reduction benchmarks and cross-checks. The generator is a
 * deterministic LCG so the corpus (and the resulting numbers) are reproducible.
 */

let seed = 0xc0ffee;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

/** A generic triclinic cell, entries uniform in [-mag, mag]. */
export function randomCell(mag = 12): number[] {
  const d = new Array(9);
  for (let i = 0; i < 9; i++) d[i] = (rnd() - 0.5) * 2 * mag;
  return d;
}

/** A near-reduced positive-definite diagonal cell. */
export function reducedCell(): number[] {
  return [2, 0, 0, 0, 3, 0, 0, 0, 4];
}

/** Highly skewed near-degenerate lattice (oblique, one very short edge). */
export function skewedCell(): number[] {
  // Large volume but one vector near-parallel/short and strongly oblique angles.
  return [15, 0, 0, 0.03, 2, 0, 0.02, 0.05, 1.5];
}

/** Fractional coefficients, close to multiple Niggli conditions at once. */
export function pathologicalCell(): number[] {
  return [4.0, 0.0, 0.0, 2.0, 4.34, 0.0, 1.0, 2.0, 5.7];
}

export interface Cell {
  label: string;
  data: number[];
}

export interface Category {
  name: string;
  cells: Cell[];
}

/** Build the full corpus. Callers may call this once and reuse. */
export function buildCorpus(): Category[] {
  seed = 0xc0ffee;
  const random: Cell[] = [];
  for (let i = 0; i < 20; i++) random.push({ label: `random#${i}`, data: randomCell(12) });

  const alreadyReduced: Cell[] = Array.from({ length: 5 }, (_, i) => ({
    label: `reduced#${i}`,
    data: reducedCell(),
  }));

  const skewed: Cell[] = Array.from({ length: 5 }, (_, i) => ({
    label: `skewed#${i}`,
    data: skewedCell(),
  }));

  const pathological: Cell[] = Array.from({ length: 5 }, (_, i) => ({
    label: `pathological#${i}`,
    data: pathologicalCell(),
  }));

  return [
    { name: "random 20", cells: random },
    { name: "already-reduced 5", cells: alreadyReduced },
    { name: "highly-skewed 5", cells: skewed },
    { name: "pathological 5", cells: pathological },
  ];
}
