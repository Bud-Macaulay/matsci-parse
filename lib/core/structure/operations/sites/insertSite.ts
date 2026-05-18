import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function insertSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  return {
    ...structure,
    sites: [
      ...structure.sites.slice(0, index),
      site,
      ...structure.sites.slice(index),
    ],
  };
}
