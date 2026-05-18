import { Matrix } from "../../matrix";

export function norm(v: Matrix): number {
  let sum = 0;

  const data = v.data;
  const len = data.length;

  for (let i = 0; i < len; i++) {
    const x = data[i];
    sum += x * x;
  }

  return Math.sqrt(sum);
}
