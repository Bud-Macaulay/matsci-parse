import { Structure } from "../structure";
import { canonicalize } from "./canonicalize";
import { Vec3 } from "@/main";

function toFixedArray(v: Vec3, precision = 8): string {
  return Array.from(v)
    .map((x) => x.toFixed(precision))
    .join(",");
}

function fnv1a(str: string): number {
  let hash = 2166136261;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash *= 16777619;
  }

  return hash >>> 0;
}

/** FNV-1a hash of a canonicalized structure (lattice + sorted sites). */
export function hashStructure(structure: Structure): number {
  const s = canonicalize(structure);

  const lattice = s.lattice.basis.data;
  const latticeKey = toFixedArray(lattice);

  const sitesKey = s.sites
    .map((site) => {
      return site.species + ":" + toFixedArray(site.frac);
    })
    .sort()
    .join("|");

  const key = latticeKey + "::" + sitesKey;

  return fnv1a(key);
}
