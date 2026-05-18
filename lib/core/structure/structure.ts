import { Matrix } from "../matrix/matrix";
import { Site } from "../site/site";

export type Structure = {
  lattice: Matrix;
  sites: Site[];
};
