import { Structure } from "../../structure/structure";
import { sortSites } from "./sortSites";
import { EPSILON } from "../../math/constants";
import { clean, wrapFrac } from "../../math/numeric";

/** Return a copy with fractional coordinates wrapped to [0, 1), near-zero values cleaned, and sites sorted by species then coordinates. */
export function canonicalize(structure: Structure): Structure {
  const sites = structure.sites.map((site) => ({
    ...site,
    frac: new Float64Array([
      wrapFrac(clean(site.frac[0]), EPSILON),
      wrapFrac(clean(site.frac[1]), EPSILON),
      wrapFrac(clean(site.frac[2]), EPSILON),
    ]),
  }));

  return { ...structure, sites: sortSites(sites) };
}
