import { Structure } from "../../structure";
import { Site } from "../../../site/site";

export function removeSite(structure: Structure, index: number): Structure {
  return {
    ...structure,
    sites: structure.sites.filter((_, i) => i !== index),
  };
}
