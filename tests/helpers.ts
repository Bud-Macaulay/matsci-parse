import assert from "assert";

export function nearlyEqual(a: number, b: number, tol = 1e-8): boolean {
  return Math.abs(a - b) < tol;
}

export function vectorsNearlyEqual(a: number[], b: number[], tol = 1e-6): void {
  if (a.length !== b.length) throw new Error("Length mismatch");
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tol) {
      throw new Error(`Vectors differ at index ${i}: ${a[i]} vs ${b[i]}`);
    }
  }
}
