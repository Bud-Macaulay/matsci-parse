import { Site, SiteProperties } from "./site";

function wrapValue(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** Wrap a site's fractional coordinates into [0, 1).
 * @param site - The site to wrap.
 * @returns A new site with wrapped coordinates. */
export function wrap<T extends SiteProperties>(site: Site<T>): Site<T> {
  return {
    ...site,
    frac: [
      wrapValue(site.frac[0]),
      wrapValue(site.frac[1]),
      wrapValue(site.frac[2]),
    ],
  };
}
