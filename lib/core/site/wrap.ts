import { Site, SiteProperties } from "./site";
import { wrapFrac } from "../math/numeric";

/** Wrap a site's fractional coordinates into [0, 1).
 * @param site - The site to wrap.
 * @returns A new site with wrapped coordinates. */
export function wrap<T extends SiteProperties>(site: Site<T>): Site<T> {
  return {
    ...site,
    frac: [
      wrapFrac(site.frac[0]),
      wrapFrac(site.frac[1]),
      wrapFrac(site.frac[2]),
    ],
  };
}
