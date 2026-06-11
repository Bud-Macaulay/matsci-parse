import { Vector } from "../../vector";

export function cross(a: Vector, b: Vector): Vector {
  if (a.length !== 3 || b.length !== 3) {
    throw new Error("Cross product requires 3D vectors");
  }

  return new Float64Array([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]);
}
