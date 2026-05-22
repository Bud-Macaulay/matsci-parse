export function expectArrayClose(
  actual: Float64Array,
  expected: number[],
  eps = 1e-12,
) {
  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(eps);
  }
}
