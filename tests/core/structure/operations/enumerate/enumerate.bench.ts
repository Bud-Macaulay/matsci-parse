import { bench, describe } from "vitest";
import { orderDisorderedStructure } from "@/core/structure/operations/enumerate/orderDisordered";
import { enumCases } from "./fixtures";

describe("orderDisorderedStructure", () => {
  for (const c of enumCases) {
    bench(c.name, async () => {
      await orderDisorderedStructure(c.parent, c.H);
    });
  }
});
