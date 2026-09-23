import { bench, describe } from "vitest";
import { Structure } from "@/core/structure/structure";
import { calculateXrdPattern } from "@/core/structure/analysis/diffraction/xrd/xrd";
import { CsCl, LiFePO4 } from "./teststrings/structures";

const cscl: Structure = CsCl;
const lifepo4: Structure = LiFePO4;

describe("calculateXrdPattern", () => {
  bench("CsCl CuKa 0-90", () => {
    calculateXrdPattern(cscl);
  });

  bench("LiFePO4 CuKa 0-90", () => {
    calculateXrdPattern(lifepo4);
  });
});
