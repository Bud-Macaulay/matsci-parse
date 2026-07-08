import { Lattice } from "../lattice/lattice";
import { Site } from "../site/site";

/** A crystal structure with a lattice and a list of sites. */
export interface Structure {
  readonly lattice: Lattice;
  readonly sites: Site[];
  readonly [key: string]: unknown;
}
