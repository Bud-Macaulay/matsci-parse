import { mul } from "../matrix/operations/mul";
import { Site } from "./site";
import { Lattice } from "../lattice/lattice";

export function cartesian(
  lattice: Lattice,
  site: Site,
): [number, number, number] {
  const [x, y, z] = site.frac;

  const frac = {
    rows: 3,
    cols: 1,
    data: new Float64Array([x, y, z]),
  };

  const result = mul(lattice.basis, frac);

  return [result.data[0], result.data[1], result.data[2]];
}
