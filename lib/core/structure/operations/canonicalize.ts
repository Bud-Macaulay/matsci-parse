import { Structure } from "../../structure/structure";

const EPS = 1e-12;

function wrap(x: number): number {
  const v = x - Math.floor(x);
  return Math.abs(v) < EPS ? 0 : v;
}

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

export function canonicalize(structure: Structure): Structure {
  return {
    ...structure,
    sites: structure.sites.map((site) => ({
      ...site,
      frac: new Float64Array([
        wrap(clean(site.frac[0])),
        wrap(clean(site.frac[1])),
        wrap(clean(site.frac[2])),
      ]),
    })),
  };
}
