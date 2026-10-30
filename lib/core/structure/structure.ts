import { Lattice } from "../lattice/lattice";
import { Site } from "../site/site";

/** The box a reader put a molecule in because its file has no cell (PDB
 * without a usable CRYST1, XYZ without Lattice): the bounding box of the
 * atoms plus `padding` Å of vacuum on each side. The file's Cartesian
 * positions are the structure's plus `origin`. */
export interface MoleculeBox {
  readonly padding: number;
  readonly origin: readonly [number, number, number];
}

/** A crystal structure with a lattice and a list of sites. */
export interface Structure {
  readonly lattice: Lattice;
  readonly sites: Site[];
  readonly selectiveDynamics?: boolean;
  /** Set when the cell is not from the file but a box around a molecule. */
  readonly moleculeBox?: MoleculeBox;
  readonly [key: string]: unknown;
}
