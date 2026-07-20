import { Structure } from "../../structure/structure";

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

  sites.sort((a, b) => {
    const sp = a.species.symbol.localeCompare(b.species.symbol);
    if (sp !== 0) return sp;
    if (a.frac[0] !== b.frac[0]) return a.frac[0] - b.frac[0];
    if (a.frac[1] !== b.frac[1]) return a.frac[1] - b.frac[1];
    return a.frac[2] - b.frac[2];
  });

  return { ...structure, sites };
}
