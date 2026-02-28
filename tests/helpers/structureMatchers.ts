import { CrystalStructure, Site } from "../../lib/main"; // adjust path

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

declare global {
  namespace jest {
    interface Matchers<R> {
      toStructureNearlyEqual(expected: CrystalStructure, tol?: number): R;
    }
  }
}

expect.extend({
  toStructureNearlyEqual(
    received: CrystalStructure,
    expected: CrystalStructure,
    tol = 1e-6,
  ) {
    if (received.numSites !== expected.numSites) {
      return { pass: false, message: () => "Site count mismatch" };
    }

    // Compare lattice
    for (let i = 0; i < received.lattice.length; i++) {
      for (let j = 0; j < 3; j++) {
        if (Math.abs(received.lattice[i][j] - expected.lattice[i][j]) > tol) {
          return {
            pass: false,
            message: () => `Lattice mismatch at [${i}, ${j}]`,
          };
        }
      }
    }

    // Compare sites
    for (let i = 0; i < received.sites.length; i++) {
      const rSite = received.sites[i];
      const eSite = expected.sites[i];

      if (rSite.speciesIndex !== eSite.speciesIndex) {
        return { pass: false, message: () => `Species mismatch at site ${i}` };
      }

      for (let j = 0; j < 3; j++) {
        if (Math.abs(rSite.cart[j] - eSite.cart[j]) > tol) {
          return {
            pass: false,
            message: () => `Position mismatch at site ${i}, component ${j}`,
          };
        }
      }
    }

    return { pass: true, message: () => "Structures match" };
  },
});
