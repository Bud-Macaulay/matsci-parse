import { vecMul } from "../matrix/operations/vector/vecMul";

import { Site } from "./site";
import { Lattice } from "../lattice/lattice";
import { Vector } from "../matrix/vector";

/** Convert a site's fractional coordinates to Cartesian.
 * @param lattice - The lattice.
 * @param site - The site.
 * @returns Cartesian coordinate vector. */
export function cartesian(lattice: Lattice, site: Site): Vector {
  return vecMul(site.frac, lattice.basis);
}
