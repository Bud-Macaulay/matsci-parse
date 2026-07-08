import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { pow } from "@/core/matrix/operations/pow";
import { makeInvertibleMatrix } from "../../../helpers/matrix";

const sizes = [8, 16, 32, 64];

describe("matrix power scaling", () => {
  for (const n of sizes) {
    const A = makeInvertibleMatrix(n);

    pow(A, 2);

    bench(`${n}x${n} pow(p=3)`, () => {
      pow(A, 3);
    });
  }
});
