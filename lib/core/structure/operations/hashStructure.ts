import { Structure } from "../structure";
import { canonicalize } from "./canonicalize";
import { Vec3 } from "../../site/site";
import { fnv1a32 } from "../../math/hash";

function toFixedArray(v: Readonly<Vec3>, precision = 8): string {
  return Array.from(v)
    .map((x) => x.toFixed(precision))
    .join(",");
}

/** FNV-1a hash of a canonicalized structure (lattice + sorted sites). */
export function hashStructure(structure: Structure): number {
  const s = canonicalize(structure);

  const lattice = s.lattice.basis.data;
  const latticeKey = toFixedArray(lattice);

  const sitesKey = s.sites
    .map((site) => {
      return site.species.symbol + ":" + toFixedArray(site.frac);
    })
    .sort()
    .join("|");

  return fnv1a32(latticeKey + "::" + sitesKey);
}
