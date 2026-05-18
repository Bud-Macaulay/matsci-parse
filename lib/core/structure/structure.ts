import { Lattice } from "../lattice/lattice";
import { Site } from "../site/site";

export interface Structure {
  readonly lattice: Lattice;
  readonly sites: Site[];
}
