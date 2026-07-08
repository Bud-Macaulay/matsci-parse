import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { pow } from "@/core/matrix/operations/pow";

function makeInvertibleMatrix(size: number) {
  const data = new Array(size * size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      data[r * size + c] = r === c ? size + 1 : 1;
    }
  }

  return createMatrix(size, size, data);
}

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
