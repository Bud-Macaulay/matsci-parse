import { Matrix, createMatrix } from "../../matrix";

export function cross(a: Matrix, b: Matrix): Matrix {
  if (a.data.length !== 3 || b.data.length !== 3) {
    throw new Error("Cross product requires 3D vectors");
  }

  const ax = a.data;
  const bx = b.data;

  return createMatrix(3, 1, [
    ax[1] * bx[2] - ax[2] * bx[1],
    ax[2] * bx[0] - ax[0] * bx[2],
    ax[0] * bx[1] - ax[1] * bx[0],
  ]);
}
