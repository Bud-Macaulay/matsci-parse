import { Matrix } from "../../matrix";

export function dot(a: Matrix, b: Matrix): number {
  const aLen = a.data.length;
  const bLen = b.data.length;

  if (aLen !== bLen) {
    throw new Error("Dot product requires vectors of same length");
  }

  let sum = 0;

  for (let i = 0; i < aLen; i++) {
    sum += a.data[i] * b.data[i];
  }

  return sum;
}
