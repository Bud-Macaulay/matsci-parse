import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function replaceSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  const sites = structure.sites.slice();
  sites[index] = site;

  return {
    ...structure,
    sites,
  };
}

export function replaceSites(
  structure: Structure,
  replacements: readonly {
    index: number;
    site: Site;
  }[],
): Structure {
  const sites = structure.sites.slice();

  for (const { index, site } of replacements) {
    sites[index] = site;
  }

  return {
    ...structure,
    sites,
  };
}
