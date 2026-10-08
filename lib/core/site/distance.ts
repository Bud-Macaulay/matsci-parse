import { Lattice } from "../lattice/lattice";
import { Site } from "./site";
import { cartesian } from "./cartesian";
import { metricTensor } from "../lattice/metricTensor";
import { micDisplacement } from "../structure/operations/distance/utils";

import { norm } from "../matrix/operations/vector/norm";

/** Compute the minimum image distance between two sites.
 * @param lattice - The lattice.
 * @param a - First site.
 * @param b - Second site.
 * @returns Minimum image distance. */
export function distance(lattice: Lattice, a: Site, b: Site): number {
  const G = metricTensor(lattice).data;

  const dFrac = micDisplacement(
    new Float64Array([
      b.frac[0] - a.frac[0],
      b.frac[1] - a.frac[1],
      b.frac[2] - a.frac[2],
    ]),
    G,
  );

  const displaced: Site = {
    species: a.species,
    frac: dFrac,
  };

  const dCart = cartesian(lattice, displaced);

  return norm(dCart);
}
