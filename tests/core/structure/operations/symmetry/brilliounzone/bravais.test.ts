import { describe, it, expect } from "vitest";

import {
  determineExtBravais,
  transformAP,
} from "@/core/structure/operations/symmetry/brilliounzone/bravais";
import {
  getReciprocalCellRows,
  cellParams,
  matrixFromRowMajor,
} from "@/core/structure/operations/symmetry/brilliounzone/seekpathTools";

describe("determineExtBravais", () => {
  it("cP: inversion -> cP1, non-inversion -> cP2", () => {
    expect(determineExtBravais("cP", 195, 1, 1, 1, 90, 90, 90)).toBe("cP1");
    expect(determineExtBravais("cP", 206, 1, 1, 1, 90, 90, 90)).toBe("cP1");
    expect(determineExtBravais("cP", 207, 1, 1, 1, 90, 90, 90)).toBe("cP2");
    expect(determineExtBravais("cP", 230, 1, 1, 1, 90, 90, 90)).toBe("cP2");
    expect(() =>
      determineExtBravais("cP", 194, 1, 1, 1, 90, 90, 90),
    ).toThrow(/195, 230/);
  });

  it("cF: inversion -> cF1, non-inversion -> cF2", () => {
    expect(determineExtBravais("cF", 195, 1, 1, 1, 90, 90, 90)).toBe("cF1");
    expect(determineExtBravais("cF", 207, 1, 1, 1, 90, 90, 90)).toBe("cF2");
  });

  it("cI and tP and oP and mP are single variants", () => {
    expect(determineExtBravais("cI", 197, 1, 1, 1, 90, 90, 90)).toBe("cI1");
    expect(determineExtBravais("tP", 99, 2, 2, 3, 90, 90, 90)).toBe("tP1");
    expect(determineExtBravais("oP", 19, 2, 3, 4, 90, 90, 90)).toBe("oP1");
    expect(determineExtBravais("mP", 3, 2, 3, 4, 90, 105, 90)).toBe("mP1");
  });

  it("tI: c <= a -> tI1, else tI2", () => {
    expect(determineExtBravais("tI", 139, 4, 4, 3, 90, 90, 90)).toBe("tI1");
    expect(determineExtBravais("tI", 139, 4, 4, 5, 90, 90, 90)).toBe("tI2");
  });

  it("oF: fcc-like ordering selects oF1/oF2/oF3", () => {
    // 1/a^2 > 1/b^2 + 1/c^2
    expect(determineExtBravais("oF", 70, 1, 2, 3, 90, 90, 90)).toBe("oF1");
    // 1/c^2 > 1/a^2 + 1/b^2
    expect(determineExtBravais("oF", 70, 2, 3, 1, 90, 90, 90)).toBe("oF2");
    // otherwise
    expect(determineExtBravais("oF", 70, 5, 3, 3, 90, 90, 90)).toBe("oF3");
  });

  it("oI: labels by largest cell parameter with fixed tie-break order", () => {
    // a largest -> oI2
    expect(determineExtBravais("oI", 71, 5, 4, 3, 90, 90, 90)).toBe("oI2");
    // c largest -> oI1
    expect(determineExtBravais("oI", 71, 3, 4, 5, 90, 90, 90)).toBe("oI1");
    // b largest -> oI3
    expect(determineExtBravais("oI", 71, 4, 5, 3, 90, 90, 90)).toBe("oI3");
    // a = b largest -> tie-break id: a(2) < b(3) -> b wins -> oI3
    expect(determineExtBravais("oI", 71, 5, 5, 3, 90, 90, 90)).toBe("oI3");
    // a = c largest -> tie-break id: c(1) < a(2) -> a wins -> oI2
    expect(determineExtBravais("oI", 71, 5, 3, 5, 90, 90, 90)).toBe("oI2");
  });

  it("oC and oA by lattice-vector ordering", () => {
    expect(determineExtBravais("oC", 21, 3, 4, 5, 90, 90, 90)).toBe("oC1");
    expect(determineExtBravais("oC", 21, 4, 3, 5, 90, 90, 90)).toBe("oC2");
    expect(determineExtBravais("oA", 39, 3, 4, 5, 90, 90, 90)).toBe("oA1");
    expect(determineExtBravais("oA", 39, 3, 5, 4, 90, 90, 90)).toBe("oA2");
  });

  it("hP: by space group number", () => {
    for (const sg of [
      143, 144, 145, 146, 147, 148, 149, 151, 153, 157, 159, 160, 161, 162,
      163,
    ]) {
      expect(determineExtBravais("hP", sg, 3, 3, 5, 90, 90, 120)).toBe("hP1");
    }
    expect(determineExtBravais("hP", 150, 3, 3, 5, 90, 90, 120)).toBe("hP2");
    expect(determineExtBravais("hP", 164, 3, 3, 5, 90, 90, 120)).toBe("hP2");
    expect(determineExtBravais("hP", 191, 3, 3, 5, 90, 90, 120)).toBe("hP2");
  });

  it("hR: sqrt(3)*a <= sqrt(2)*c -> hR1, else hR2", () => {
    expect(determineExtBravais("hR", 148, 1, 1, 1, 90, 90, 120)).toBe("hR2");
    expect(determineExtBravais("hR", 148, 1, 1, 3, 90, 90, 120)).toBe("hR1");
  });

  it("mC: beta-dependent three variants", () => {
    // b < a*sin(beta) -> mC1
    expect(determineExtBravais("mC", 12, 5, 4, 4, 90, 90, 90)).toBe("mC1");
    // otherwise, expr <= 1 -> mC2
    expect(determineExtBravais("mC", 12, 5, 6, 4, 90, 90, 90)).toBe("mC2");
    // otherwise, expr > 1 -> mC3
    expect(determineExtBravais("mC", 12, 5, 5, 4, 90, 120, 90)).toBe("mC3");
  });

  it("aP and unknown lattices throw", () => {
    expect(() =>
      determineExtBravais("aP", 1, 4, 5, 6, 70, 80, 90),
    ).toThrow(/aP must be handled by determineAP/);
    expect(() =>
      determineExtBravais("xx", 1, 4, 5, 6, 90, 90, 90),
    ).toThrow(/Unknown bravais lattice/);
  });
});

function cart(f: number[], B: number[][]): number[] {
  return [
    f[0] * B[0][0] + f[1] * B[1][0] + f[2] * B[2][0],
    f[0] * B[0][1] + f[1] * B[1][1] + f[2] * B[2][1],
    f[0] * B[0][2] + f[1] * B[1][2] + f[2] * B[2][2],
  ];
}

describe("transformAP", () => {
  it("preserves Cartesian positions (round-trip)", async () => {
    const lattice = [
      [4, 0, 0],
      [1, 5, 0],
      [0.5, 0.7, 6],
    ];
    const positions = [
      [0.1, 0.2, 0.3],
      [0.6, 0.7, 0.8],
    ];
    const out = await transformAP(lattice, positions);
    for (let n = 0; n < positions.length; n++) {
      const oldC = cart(positions[n], lattice);
      const newC = cart(out.positions[n], out.lattice);
      for (let d = 0; d < 3; d++) {
        expect(Math.abs(newC[d] - oldC[d])).toBeLessThan(1e-8);
      }
    }
  });

  it("label matches final reciprocal cell (aP2 all-obtuse / aP3 all-acute)", async () => {
    const lattice = [
      [4, 0, 0],
      [1, 5, 0],
      [0.5, 0.7, 6],
    ];
    const out = await transformAP(lattice, [[0.1, 0.2, 0.3]]);
    const recip = getReciprocalCellRows(matrixFromRowMajor(out.lattice.flat()));
    const [, , , ca, cb, cg] = cellParams(recip);
    if (out.extBravais === "aP2") {
      expect(ca).toBeLessThanOrEqual(1e-9);
      expect(cb).toBeLessThanOrEqual(1e-9);
      expect(cg).toBeLessThanOrEqual(1e-9);
    } else {
      expect(out.extBravais).toBe("aP3");
      expect(ca).toBeGreaterThanOrEqual(-1e-9);
      expect(cb).toBeGreaterThanOrEqual(-1e-9);
      expect(cg).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("random triclinic sweep: round-trip + both labels occur", async () => {
    let s = 987654321;
    const rand = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
    const labelCount = { aP2: 0, aP3: 0 };
    let roundTripWorst = 0;
    const N = 60;
    for (let t = 0; t < N; t++) {
      const L = [
        [2 + 4 * rand(), 0, 0],
        [4 * rand() - 2, 2 + 4 * rand(), 0],
        [4 * rand() - 2, 4 * rand() - 2, 2 + 4 * rand()],
      ];
      const P = [[rand(), rand(), rand()]];
      const out = await transformAP(L, P);
      // round-trip
      const oldC = cart(P[0], L);
      const newC = cart(out.positions[0], out.lattice);
      for (let d = 0; d < 3; d++)
        roundTripWorst = Math.max(roundTripWorst, Math.abs(newC[d] - oldC[d]));
      labelCount[out.extBravais as "aP2" | "aP3"]++;
    }
    expect(roundTripWorst).toBeLessThan(1e-8);
    // both labels should appear across random cells (suite breadth)
    expect(labelCount.aP2).toBeGreaterThan(0);
    expect(labelCount.aP3).toBeGreaterThan(0);
  });
});
