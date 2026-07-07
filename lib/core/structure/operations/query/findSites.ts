import { Structure } from "../../structure";
import { Site } from "../../../site/site";

// generic method for finding sites on a given condition.

export function findSites(
  structure: Structure,
  predicate: (site: Site, index: number) => boolean,
): number[] {
  const indices: number[] = [];

  for (let i = 0; i < structure.sites.length; i++) {
    if (predicate(structure.sites[i], i)) {
      indices.push(i);
    }
  }

  return indices;
}
