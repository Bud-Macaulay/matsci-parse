import { describe, expect, it } from "vitest";

import { linearAssignment } from "@/core/math";
import { seededRandom } from "../../helpers/random";

/** All permutations of 0..n-1. */
function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((p) =>
    [...Array(n)].map((_, k) => [...p.slice(0, k), n - 1, ...p.slice(k)]),
  );
}

function total(cost: ArrayLike<number>, n: number, assignment: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += cost[i * n + assignment[i]];
  return s;
}

function bruteForceMin(cost: ArrayLike<number>, n: number): number {
  return Math.min(...permutations(n).map((p) => total(cost, n, p)));
}

describe("linearAssignment", () => {
  it("matches brute force on random matrices", () => {
    const rng = seededRandom(7);
    for (let n = 1; n <= 7; n++) {
      for (let trial = 0; trial < 20; trial++) {
        // Mix continuous and small-integer costs (the latter has many ties).
        const cost = Float64Array.from({ length: n * n }, () =>
          trial % 2 ? Math.floor(rng() * 4) : 10 * rng() - 5,
        );
        const assignment = linearAssignment(cost, n);
        expect([...assignment].sort()).toEqual([...Array(n).keys()]);
        expect(total(cost, n, assignment)).toBeCloseTo(bruteForceMin(cost, n), 10);
      }
    }
  });

  it("handles empty and 1×1 matrices", () => {
    expect(Array.from(linearAssignment(new Float64Array(0), 0))).toEqual([]);
    expect(Array.from(linearAssignment([3], 1))).toEqual([0]);
  });

  it("is deterministic under ties", () => {
    const cost = new Float64Array(16);
    const a = linearAssignment(cost, 4);
    expect(Array.from(linearAssignment(cost, 4))).toEqual(Array.from(a));
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
  });

  it("finds the optimum where greedy row-by-row picking fails", () => {
    // Greedy gives row 0 its cheapest column 0 (cost 1), forcing row 1 onto 100.
    const cost = [1, 2, 3, 100];
    expect(Array.from(linearAssignment(cost, 2))).toEqual([1, 0]);
  });

  it("rejects wrong sizes and non-finite costs", () => {
    expect(() => linearAssignment([1, 2, 3], 2)).toThrow();
    expect(() => linearAssignment([NaN, 0, 0, 0], 2)).toThrow();
  });
});
