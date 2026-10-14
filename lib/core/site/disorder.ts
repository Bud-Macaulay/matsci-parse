import type { Site } from "./site";
import { occupancyOf } from "./occupancy";

// NOTE — first-class disordered sites: disorder is represented as split
// co-located sites (one species + `occu` fraction each), not as a
// first-class multi-species site. Revisit if split sites cause trouble in
// ordered paths (neighbors/slabs see zero-distance pairs) or if an
// importer needs exact round-trip fidelity (see toPymatgen).

/** One component of a disordered position. */
export interface SiteOccupancy {
  symbol: string;
  fraction: number;
}

/** A disordered position: species sharing one fractional coordinate. */
export interface DisorderedPosition {
  frac: Float64Array;
  occupancy: SiteOccupancy[];
  /** Indices of the contributing split sites in the source array. */
  indices: number[];
}

/**
 * Expand a disordered position into split co-located sites, one per
 * species, with the fraction stashed on `species.properties.occu`
 * (the same pattern readers use; see {@link occupancyOf}).
 */
export function splitSite(
  frac: ArrayLike<number>,
  occupancy: SiteOccupancy[] | Record<string, number>,
): Site[] {
  const entries = Array.isArray(occupancy)
    ? occupancy
    : Object.entries(occupancy).map(([symbol, fraction]) => ({
        symbol,
        fraction,
      }));
  const coords = new Float64Array([frac[0], frac[1], frac[2]]);
  return entries.map(({ symbol, fraction }) => {
    if (!(fraction >= 0 && fraction <= 1 && Number.isFinite(fraction))) {
      throw new Error(`splitSite: invalid fraction ${fraction} for ${symbol}`);
    }
    return {
      species: { symbol, properties: { occu: fraction } },
      frac: coords.slice(),
    };
  });
}

/**
 * Group split co-located sites back into disordered positions.
 * Bitwise-identical coordinates group exactly; `tol` (fractional units)
 * additionally merges hand-built near-duplicates. Ordered sites yield
 * single-component positions with fraction 1.
 *
 * Vacancies (fractions summing below 1) are allowed; overfill throws.
 */
export function groupDisorder(
  sites: readonly Site[],
  tol = 0,
): DisorderedPosition[] {
  const groups: { key: number[]; members: number[] }[] = [];
  const keyOf = (f: ArrayLike<number>): string => `${f[0]},${f[1]},${f[2]}`;
  const byKey = new Map<string, number[]>();

  sites.forEach((site, i) => {
    const f = site.frac;
    if (tol <= 0) {
      const list = byKey.get(keyOf(f)) ?? [];
      list.push(i);
      byKey.set(keyOf(f), list);
      return;
    }
    const g = groups.find(({ key }) =>
      key.every((v, d) => Math.abs(v - (f[d] as number)) <= tol),
    );
    if (g) g.members.push(i);
    else groups.push({ key: [f[0], f[1], f[2]], members: [i] });
  });
  if (tol <= 0) {
    for (const [key, members] of byKey) {
      groups.push({ key: key.split(",").map(Number), members });
    }
  }

  return groups.map(({ key, members }) => {
    const occupancy = members.map((i) => ({
      symbol: sites[i].species.symbol,
      fraction: occupancyOf(sites[i]),
    }));
    const total = occupancy.reduce((acc, o) => acc + o.fraction, 0);
    if (total > 1 + 1e-9) {
      throw new Error(`groupDisorder: occupancies sum to ${total} at [${key}]`);
    }
    return {
      frac: new Float64Array(key),
      occupancy,
      indices: members,
    };
  });
}
