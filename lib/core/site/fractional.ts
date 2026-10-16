import { inverse } from "../lattice/inverse";
import { vecMul } from "../matrix/operations/vector/vecMul";
import { Vector } from "../matrix/vector";
import { Lattice } from "../lattice/lattice";

/** Convert Cartesian coordinates to fractional.
 * @param lattice - The lattice.
 * @param cart - Cartesian vector.
 * @returns Fractional coordinate vector. */
export function fractional(lattice: Lattice, cart: Vector): Vector {
  return vecMul(cart, inverse(lattice));
}
