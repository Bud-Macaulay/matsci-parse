// Unused but potentially useful in the future.

const FRACTIONAL = [
  [],
  [[0.5, 0.5, 0]],
  [[0.5, 0, 0.5], [0, 0.5, 0.5], [0.5, 0.5, 0]],
  [[0.5, 0.5, 0.5]],
  [[0, 0.5, 0.5]],
  [[0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]],
  [
    [2 / 3, 1 / 3, 1 / 3],
    [1 / 3, 2 / 3, 2 / 3],
  ],
];

const INDEX: Record<string, number> = {
  P: 0,
  C: 1,
  A: 2,
  I: 3,
  B: 4,
  F: 5,
  R: 6,
};

/** Return the fractional translation vectors for a lattice centering type.
 * The first element is always [0, 0, 0].
 * @param symbol - Centering symbol: P, C, A, B, I, F, or R.
 * @returns Array of [tx, ty, tz] translation vectors. */
export function centeringTranslations(symbol: string): number[][] {
  const idx = INDEX[symbol.toUpperCase()];
  return idx !== undefined
    ? [[0, 0, 0], ...FRACTIONAL[idx]]
    : [[0, 0, 0]];
}
