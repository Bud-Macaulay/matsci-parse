import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function appendSite(structure: Structure, site: Site): Structure {
  const sites = structure.sites.slice();
  sites.push(site);

  return {
    ...structure,
    sites,
  };
}

export function appendSites(
  structure: Structure,
  sitesToAppend: readonly Site[],
): Structure {
  return {
    ...structure,
    sites: [...structure.sites, ...sitesToAppend],
  };
}
