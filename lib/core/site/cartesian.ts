import { mul } from "../matrix/operations/mul";
import { transpose } from "../matrix/operations/transpose";

import { Site } from "./site";
import { Lattice } from "../lattice/lattice";
import { Vector } from "../matrix/vector";

/** Convert a site's fractional coordinates to Cartesian.
 * @param lattice - The lattice.
 * @param site - The site.
 * @returns Cartesian coordinate vector. */
export function cartesian(lattice: Lattice, site: Site): Vector {
  const [x, y, z] = site.frac;

  const frac = {
    rows: 3,
    cols: 1,
    data: new Float64Array([x, y, z]),
  };

  const basisT = transpose(lattice.basis);
  const result = mul(basisT, frac);

  return new Float64Array([result.data[0], result.data[1], result.data[2]]);
}
