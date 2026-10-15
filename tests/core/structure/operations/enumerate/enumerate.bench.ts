import { bench, describe } from "vitest";
import { orderDisorderedStructure } from "@/core/structure/operations/enumerate/orderDisordered";
import { enumCases, primCubic, diag } from "./fixtures";

describe("orderDisorderedStructure", () => {
  for (const c of enumCases) {
    bench(c.name, async () => {
      await orderDisorderedStructure(c.parent, c.H);
    });
  }
});

describe("orderDisorderedStructure large", () => {
  // C(20,10) = 184756 space; needs a raised cap. Slow (~1s) by design:
  // guards the top end of the scaling curve.
  const parent = primCubic(3, [
    ["Ag", 0.5],
    ["Pd", 0.5],
  ]);
  bench("Q: 20-site binary 10/10", async () => {
    await orderDisorderedStructure(parent, diag(4, 5, 1), {
      maxCombinations: 1_000_000,
    });
  });
});
