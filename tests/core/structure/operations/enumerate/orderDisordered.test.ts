import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { orderDisorderedStructure } from "@/core/structure/operations/enumerate/orderDisordered";
import { enumCases, primCubic, diag } from "./fixtures";
import type { Structure } from "@/core/structure/structure";

function keys(s: Structure): string[] {
  return s.sites
    .map(
      (site) =>
        `${site.species.symbol}:${Array.from(site.frac)
          .map((x) => +x.toFixed(6))
          .join(",")}`,
    )
    .sort();
}

function countsOf(s: Structure): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const site of s.sites) {
    counts[site.species.symbol] = (counts[site.species.symbol] ?? 0) + 1;
  }
  return counts;
}

describe("orderDisorderedStructure", () => {
  for (const c of enumCases) {
    it(`${c.name}: count ${c.expectedCount}`, async () => {
      const out = await orderDisorderedStructure(c.parent, c.H);
      expect(out.length).toBe(c.expectedCount);
    });

    if (c.expectedKeys) {
      it(`${c.name}: exact structures`, async () => {
        const out = await orderDisorderedStructure(c.parent, c.H);
        const norm = (ks: string[][]) => ks.map((k) => [...k].sort()).sort();
        expect(norm(out.map(keys))).toEqual(norm(c.expectedKeys!));
      });
    }

    if (c.counts) {
      it(`${c.name}: outputs valid and distinct`, async () => {
        const out = await orderDisorderedStructure(c.parent, c.H);
        const seen = new Set<string>();
        for (const s of out) {
          expect(countsOf(s)).toEqual(c.counts);
          for (const site of s.sites) {
            for (const d of [0, 1, 2]) {
              expect(site.frac[d]).toBeGreaterThanOrEqual(0);
              expect(site.frac[d]).toBeLessThan(1);
            }
          }
          const k = keys(s).join(";");
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      });
    }
  }

  it("output lattice is the supercell lattice", async () => {
    const c = enumCases[0];
    const out = await orderDisorderedStructure(c.parent, c.H);
    expect(Array.from(out[0].lattice.basis.data)).toEqual([
      6, 0, 0, 0, 3, 0, 0, 0, 3,
    ]);
  });

  it("throws on vacancies, incommensurate fractions, and bad input", async () => {
    const vac = primCubic(3, [["Ag", 0.5]]);
    await expect(orderDisorderedStructure(vac, diag(2, 1, 1))).rejects.toThrow(
      /vacanc/,
    );
    const incomm = primCubic(3, [
      ["Ag", 1 / 3],
      ["Pd", 2 / 3],
    ]);
    await expect(
      orderDisorderedStructure(incomm, diag(2, 1, 1)),
    ).rejects.toThrow(/incommensurate/);
    const ok = primCubic(3, [
      ["Ag", 0.5],
      ["Pd", 0.5],
    ]);
    await expect(
      orderDisorderedStructure(
        ok,
        createMatrix(3, 3, [1, 0, 0, 0, 0, 0, 0, 0, 1]),
      ),
    ).rejects.toThrow(/singular/);
    await expect(
      orderDisorderedStructure(
        ok,
        createMatrix(3, 3, [1, 0.5, 0, 0, 1, 0, 0, 0, 1]),
      ),
    ).rejects.toThrow(/integer/);
    await expect(
      orderDisorderedStructure(ok, diag(2, 2, 2), { maxCombinations: 5 }),
    ).rejects.toThrow(/exceeds cap/);
  });
});
