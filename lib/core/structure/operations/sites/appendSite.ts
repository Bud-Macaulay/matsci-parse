import { Structure } from "../../structure";
import { Site } from "../../../site/site";

/** Append a single site to the structure. */
export function appendSite(structure: Structure, site: Site): Structure {
  const sites = structure.sites.slice();
  sites.push(site);

  return {
    ...structure,
    sites,
  };
}

/** Append multiple sites to the structure. */
export function appendSites(
  structure: Structure,
  sitesToAppend: readonly Site[],
): Structure {
  return {
    ...structure,
    sites: [...structure.sites, ...sitesToAppend],
  };
}
