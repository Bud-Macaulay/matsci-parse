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

/**
 * Computes a hash of a structure for fast structure identification and comparison.
 *
 * Generates a 32-bit hash using the FNV-1a algorithm based on the canonical structure.
 * Useful for detecting duplicate structures and structure database lookups.
 *
 * @param structure - The structure to hash
 * @returns A 32-bit integer hash value
 *
 * @remarks
 * - Hash is computed from the canonicalized structure (coordinates wrapped to [0,1))
 * - Same hash does NOT guarantee identical structures (hash collisions are possible)
 * - Different structures may occasionally have the same hash (false positives)
 * - Use for quick filtering; verify with full structure comparison if needed
 * - Precision: coordinates are rounded to 8 decimal places for hash calculation
 *
 * @example
 * ```typescript
 * const struct1 = { lattice: cubic(4), sites: [...] };
 * const struct2 = { ...struct1 };
 * const hash1 = hashStructure(struct1);
 * const hash2 = hashStructure(struct2);
 * console.log(hash1 === hash2);  // true (same structure)
 * ```
 */
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
