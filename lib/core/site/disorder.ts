import type { SiteProperties, Vec3 } from "./site";

/** Slack on occupancy bounds, absorbing float noise from readers. */
const OCCUPANCY_TOL = 1e-6;

/** One species' share of a disordered position. */
export interface SiteOccupancy {
  symbol: string;
  fraction: number;
  /** Species properties (as on `Species.properties`), if any. */
  properties?: Record<string, any>;
}

/**
 * A crystallographic position shared by one or more species, each with a
 * fractional occupancy. Fractions summing below 1 leave a vacancy.
 *
 * Deliberately has no `species` field, so it is not assignable to `Site`:
 * ordered-only code cannot be handed a disordered site by accident.
 */
export interface DisorderedSite<P extends SiteProperties = SiteProperties> {
  frac: Vec3;
  occupancy: SiteOccupancy[];
  properties?: P;
}

/**
 * Create a validated disordered site.
 *
 * @param frac - Fractional coordinates.
 * @param occupancy - Species fractions, as a list or a `{ symbol: fraction }` record.
 * @param properties - Optional site properties.
 * @returns A new DisorderedSite.
 * @throws If a fraction is outside [0, 1], a symbol repeats, the site is
 *   empty, or the fractions sum above 1.
 */
export function createDisorderedSite<P extends SiteProperties>(
  frac: ArrayLike<number>,
  occupancy: SiteOccupancy[] | Record<string, number>,
  properties?: P,
): DisorderedSite<P> {
  const entries: SiteOccupancy[] = Array.isArray(occupancy)
    ? occupancy.map((o) => ({ ...o }))
    : Object.entries(occupancy).map(([symbol, fraction]) => ({
        symbol,
        fraction,
      }));
  if (entries.length === 0) {
    throw new Error("createDisorderedSite: no species");
  }
  const seen = new Set<string>();
  let total = 0;
  for (const { symbol, fraction } of entries) {
    if (
      !Number.isFinite(fraction) ||
      fraction < 0 ||
      fraction > 1 + OCCUPANCY_TOL
    ) {
      throw new Error(
        `createDisorderedSite: invalid fraction ${fraction} for ${symbol}`,
      );
    }
    if (seen.has(symbol)) {
      throw new Error(`createDisorderedSite: duplicate species ${symbol}`);
    }
    seen.add(symbol);
    total += fraction;
  }
  if (total > 1 + OCCUPANCY_TOL) {
    throw new Error(`createDisorderedSite: occupancies sum to ${total}`);
  }
  return {
    frac: new Float64Array([frac[0], frac[1], frac[2]]),
    occupancy: entries,
    properties,
  };
}

/** Total occupancy of a disordered site (1 when fully occupied). */
export function totalOccupancy(site: DisorderedSite): number {
  return site.occupancy.reduce((acc, o) => acc + o.fraction, 0);
}

/** True when the site holds exactly one species at full occupancy. */
export function isOrderedSite(site: DisorderedSite): boolean {
  return (
    site.occupancy.length === 1 &&
    Math.abs(site.occupancy[0].fraction - 1) <= OCCUPANCY_TOL
  );
}
