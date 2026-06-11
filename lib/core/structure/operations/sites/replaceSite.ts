import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function replaceSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  return {
    ...structure,
    sites: structure.sites.map((s, i) => (i === index ? site : s)),
  };
}
