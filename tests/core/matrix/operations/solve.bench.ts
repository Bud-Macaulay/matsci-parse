import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { solve } from "@/core/matrix/operations/solve";
import { lu } from "@/core/matrix/operations/lu";

function makeInvertibleMatrix(size: number) {
  const data = new Array(size * size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === c) {
        data[r * size + c] = size + 1;
      } else {
        data[r * size + c] = 1;
      }
    }
  }

  return createMatrix(size, size, data);
}

const sizes = [8, 16, 32, 64, 128];

describe("solve linear system scaling", () => {
  for (const n of sizes) {
    const A = makeInvertibleMatrix(n);
    const b = new Float64Array(n);

    for (let i = 0; i < n; i++) b[i] = i + 1;

    solve(A, b);

    bench(`${n}x${n} solve`, () => {
      solve(A, b);
    });
  }
});

describe("LU decomposition scaling", () => {
  for (const n of sizes) {
    const A = makeInvertibleMatrix(n);

    lu(A);

    bench(`${n}x${n} lu`, () => {
      lu(A);
    });
  }
});
