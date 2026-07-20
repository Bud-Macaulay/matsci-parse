import { Site } from "../../site/site";

/** Sort sites by species symbol, then by fractional coordinates (x, y, z). Returns a new array. */
export function sortSites(sites: Site[]): Site[] {
  return [...sites].sort((a, b) => {
    const sp = a.species.symbol.localeCompare(b.species.symbol);
    if (sp !== 0) return sp;
    if (a.frac[0] !== b.frac[0]) return a.frac[0] - b.frac[0];
    if (a.frac[1] !== b.frac[1]) return a.frac[1] - b.frac[1];
    return a.frac[2] - b.frac[2];
  });
}
