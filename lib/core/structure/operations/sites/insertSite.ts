import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function insertSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  const oldSites = structure.sites;
  const sites = new Array(oldSites.length + 1);

  for (let i = 0; i < index; i++) {
    sites[i] = oldSites[i];
  }

  sites[index] = site;

  for (let i = index; i < oldSites.length; i++) {
    sites[i + 1] = oldSites[i];
  }

  return {
    ...structure,
    sites,
  };
}

export function insertSites(
  structure: Structure,
  index: number,
  sitesToInsert: readonly Site[],
): Structure {
  const oldSites = structure.sites;
  const n = sitesToInsert.length;

  const sites = new Array(oldSites.length + n);

  for (let i = 0; i < index; i++) {
    sites[i] = oldSites[i];
  }

  for (let i = 0; i < n; i++) {
    sites[index + i] = sitesToInsert[i];
  }

  for (let i = index; i < oldSites.length; i++) {
    sites[i + n] = oldSites[i];
  }

  return {
    ...structure,
    sites,
  };
}
