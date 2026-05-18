import { mul } from "../matrix/operations/mul";
import { Site } from "./site";
import { Lattice } from "../lattice/lattice";
import { Vector } from "../matrix/vector";
import { Matrix } from "@/math/matrix";

export function cartesian(lattice: Lattice, site: Site): Vector {
  const [x, y, z] = site.frac;

  const frac = {
    rows: 3,
    cols: 1,
    data: new Float64Array([x, y, z]),
  };

  const result = mul(lattice.basis, frac);

  return new Float64Array([result.data[0], result.data[1], result.data[2]]);
}
