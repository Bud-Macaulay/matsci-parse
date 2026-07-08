import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { determinant } from "@/core/matrix/operations/determinant";
import { transpose } from "@/core/matrix/operations/transpose";

const sizes = [2, 4, 8, 16, 32, 64, 128];

describe("matrix determinant scaling", () => {
  for (const n of sizes) {
    const m = createMatrix(
      n,
      n,
      Array.from({ length: n * n }, (_, i) => i + 1),
    );

    determinant(m);

    bench(`${n}x${n} determinant`, () => {
      determinant(m);
    });
  }
});

describe("matrix transpose scaling", () => {
  for (const n of sizes) {
    const m = createMatrix(
      n,
      n,
      Array.from({ length: n * n }, (_, i) => i + 1),
    );

    transpose(m);

    bench(`${n}x${n} transpose`, () => {
      transpose(m);
    });
  }

  for (const size of [
    [16, 256],
    [256, 16],
  ] as const) {
    const [rows, cols] = size;
    const m = createMatrix(
      rows,
      cols,
      Array.from({ length: rows * cols }, (_, i) => i),
    );

    transpose(m);

    bench(`${rows}x${cols} transpose (rectangular)`, () => {
      transpose(m);
    });
  }
});
