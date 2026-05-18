import { Matrix } from "../../matrix";
import { norm } from "./norm";
import { sub } from "../sub";

export function distance(a: Matrix, b: Matrix): number {
  if (a.data.length !== b.data.length) {
    throw new Error("Distance requires equal-sized vectors");
  }

  const diff = sub(a, b);
  return norm(diff);
}
