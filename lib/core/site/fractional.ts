import { inverse } from "../lattice/inverse";
import { transpose } from "../matrix/operations/transpose";
import { mul } from "../matrix/operations/mul";
import { Vector } from "../matrix/vector";
import { Lattice } from "../lattice/lattice";

export function fractional(lattice: Lattice, cart: Vector): Vector {
  const vec = {
    rows: 3,
    cols: 1,
    data: cart,
  };

  const inv = inverse(lattice);
  const invT = transpose(inv);

  const result = mul(invT, vec);

  return new Float64Array([result.data[0], result.data[1], result.data[2]]);
}
