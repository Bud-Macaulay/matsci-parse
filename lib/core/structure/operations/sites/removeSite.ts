import { Structure } from "../../structure";

/** Remove the site at the given index. */
export function removeSite(structure: Structure, index: number): Structure {
  const sites = structure.sites.slice();
  sites.splice(index, 1);

  return {
    ...structure,
    sites,
  };
}

/** Remove sites at the given indices. */
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
