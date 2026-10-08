import { Lattice } from "../lattice/lattice";
import { Site } from "./site";
import { metricTensor } from "../lattice/metricTensor";
import {
  micDisplacement,
  distanceSquared,
} from "../structure/operations/distance/utils";

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

  return Math.sqrt(distanceSquared(dFrac, G));
}
