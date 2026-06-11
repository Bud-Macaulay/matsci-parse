import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function appendSite(structure: Structure, site: Site): Structure {
  return {
    ...structure,
    sites: [...structure.sites, site],
  };
}
