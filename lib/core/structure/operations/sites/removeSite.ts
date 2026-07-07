import { Structure } from "../../structure";

export function removeSite(structure: Structure, index: number): Structure {
  const sites = structure.sites.slice();
  sites.splice(index, 1);

  return {
    ...structure,
    sites,
  };
}

export function removeSites(
  structure: Structure,
  indices: readonly number[],
): Structure {
  const remove = new Set(indices);

  return {
    ...structure,
    sites: structure.sites.filter((_, i) => !remove.has(i)),
  };
}
