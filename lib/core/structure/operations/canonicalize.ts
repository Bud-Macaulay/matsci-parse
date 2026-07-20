import { Structure } from "../../structure/structure";
import { sortSites } from "./sortSites";

const EPS = 1e-12;

function wrap(x: number): number {
  const v = x - Math.floor(x);
  return Math.abs(v) < EPS ? 0 : v;
}

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

/** Return a copy with fractional coordinates wrapped to [0, 1), near-zero values cleaned, and sites sorted by species then coordinates. */
export function canonicalize(structure: Structure): Structure {
  const sites = structure.sites.map((site) => ({
    ...site,
    frac: new Float64Array([
      wrap(clean(site.frac[0])),
      wrap(clean(site.frac[1])),
      wrap(clean(site.frac[2])),
    ]),
  }));

  return { ...structure, sites: sortSites(sites) };
}
