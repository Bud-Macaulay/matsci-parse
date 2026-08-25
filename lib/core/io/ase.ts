import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";

import { cartesian } from "../site/cartesian";
import { fractional } from "../site/fractional";

import {
  AtomicNumberToSymbol,
  SymbolToAtomicNumber,
} from "@/core/data/periodictable";

/** A numpy-style serialized ndarray as produced by ASE's JSON encoder. */
interface ASEndarray {
  __ndarray__: [number[], string, Array<number | boolean>];
}

/** An ASE `Atoms` object serialized through ase.io.jsonio.write_json. */
export interface ASEAtoms {
  numbers: ASEndarray;
  positions: ASEndarray;
  cell: ASEndarray;
  pbc: ASEndarray;
  __ase_objtype__: "atoms";
  [key: string]: unknown;
}

function decodeNdarray(obj: ASEndarray): Array<number | boolean> {
  return obj.__ndarray__[2];
}

function encodeNdarray(
  shape: number[],
  dtype: string,
  data: Array<number | boolean>,
): ASEndarray {
  return { __ndarray__: [shape, dtype, data] };
}

/** Deserializes an ASE `Atoms` JSON object into a Structure.
 *
 * ASE stores Cartesian positions and atomic numbers; these are converted into
 * the library's fractional-coordinate representation using the supplied cell. */
export function fromASE(data: ASEAtoms): Structure {
  const cellFlat = decodeNdarray(data.cell) as number[];
  const lattice = createLattice(new Float64Array(cellFlat));

  const positions = decodeNdarray(data.positions) as number[];
  const numbers = decodeNdarray(data.numbers) as number[];

  const n = numbers.length;
  const sites = new Array(n);

  for (let i = 0; i < n; i++) {
    const z = numbers[i];
    const symbol = AtomicNumberToSymbol.get(z);

    if (symbol === undefined) {
      throw new Error(`Unknown atomic number ${z}`);
    }

    const cart = new Float64Array([
      positions[3 * i],
      positions[3 * i + 1],
      positions[3 * i + 2],
    ]);

    const frac = fractional(lattice, cart);

    sites[i] = {
      species: { symbol },
      frac,
    };
  }

  const out: Structure & { pbc?: boolean[] } = { lattice, sites };

  const pbc = decodeNdarray(data.pbc) as boolean[];
  if (pbc.some((v) => !v)) {
    out.pbc = [pbc[0], pbc[1], pbc[2]];
  }

  return out;
}

/** Serializes a Structure to an ASE `Atoms` JSON object. */
export function toASE(structure: Structure): ASEAtoms {
  const m = structure.lattice.basis.data;

  const n = structure.sites.length;
  const positions = new Array<number>(n * 3);
  const numbers = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    const site = structure.sites[i];

    const cart = cartesian(structure.lattice, site);
    positions[3 * i] = cart[0];
    positions[3 * i + 1] = cart[1];
    positions[3 * i + 2] = cart[2];

    const z = SymbolToAtomicNumber.get(site.species.symbol);

    if (z === undefined) {
      throw new Error(`Unknown element symbol ${site.species.symbol}`);
    }

    numbers[i] = z;
  }

  const pbc: boolean[] =
    (structure as Structure & { pbc?: boolean[] }).pbc ??
    [true, true, true];

  return {
    numbers: encodeNdarray([n], "int64", numbers),
    positions: encodeNdarray([n, 3], "float64", positions),
    cell: encodeNdarray([3, 3], "float64", Array.from(m)),
    pbc: encodeNdarray([3], "bool", pbc),
    __ase_objtype__: "atoms",
  };
}
