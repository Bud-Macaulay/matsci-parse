import { Structure } from "../structure";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import { elementSymbolOf } from "../../data/periodictable/isotopes";
import { getCovalentRadius } from "../../data/periodictable/covalentRadii";

// TODO: see if a KDTree is a better way of doing this.

/** A neighboring site image within the cutoff. */
export interface Neighbor {
  /** Index of the neighboring site. */
  index: number;
  /** Species symbol of the neighboring site. */
  symbol: string;
  /** Distance in angstrom. */
  distance: number;
  /** Cell translation of the periodic image ([0, 0, 0] = in-cell). */
  image: readonly [number, number, number];
}

/** Options for {@link getNeighbors}. */
export interface NeighborOptions {
  /** Global cutoff in angstrom, overriding the per-pair radii sum. */
  cutoff?: number;
  /** Padding added to the covalent-radii sum per pair. Defaults to 0.3. */
  skin?: number;
}

/** Options for {@link getNeighborList}. */
export interface NeighborListOptions {
  /** Cutoff in angstrom: one for every pair, or per pair of site indices
   * (undefined, zero or negative skips the pair). Defaults to the
   * covalent-radii sum plus `skin`. */
  cutoff?: number | ((i: number, j: number) => number | undefined);
  /** Padding added to the covalent-radii sum per pair. Defaults to 0.3. */
  skin?: number;
}

/** Covalent radius of each site (undefined if unknown), looked up once. */
function siteRadii(structure: Structure): (number | undefined)[] {
  return structure.sites.map(
    (site) =>
      getCovalentRadius(elementSymbolOf(site.species.symbol)) ?? undefined,
  );
}

function pairCutoff(
  ra: number | undefined,
  rb: number | undefined,
  skin: number,
): number | undefined {
  return ra === undefined || rb === undefined ? undefined : ra + rb + skin;
}

/** Fractional extent of a sphere of radius 1 along each axis, via the
 * reciprocal row norms (lattice-vector lengths undercount for skewed cells). */
function reciprocalNorms(structure: Structure): number[] {
  const g = reciprocalLatticeCrystallographic(structure.lattice).basis.data;
  const gn = [0, 1, 2].map((i) =>
    Math.sqrt(g[i * 3] ** 2 + g[i * 3 + 1] ** 2 + g[i * 3 + 2] ** 2),
  );

  if (!gn.every(Number.isFinite)) {
    throw new Error("getNeighbors: degenerate lattice");
  }

  return gn;
}

/** The images of every site j closer than cutoff(j) to site idx (strictly,
 * as ASE's NeighborList), in the order j, then image. Images are labeled
 * relative to the wrapped offset (`trueImages` false) or to the stored
 * fractional coordinates (true).
 *
 * The offset is wrapped per component into [-0.5, 0.5] only to keep the
 * labels canonical; it need not be the nearest image (skewed cells). The
 * scan covers it: an image within the cutoff has |df_k + n_k| <= cutoff *
 * |g_k| (g_k the reciprocal row), so |n_k| <= cutoff * |g_k| + 0.5. */
function scanNeighbors(
  structure: Structure,
  idx: number,
  gn: number[],
  cutoffOf: (j: number) => number | undefined,
  trueImages: boolean,
): Neighbor[] {
  const m = structure.lattice.basis.data;
  const fi = structure.sites[idx].frac;
  const out: Neighbor[] = [];

  for (let j = 0; j < structure.sites.length; j++) {
    const cutoff = cutoffOf(j);

    if (cutoff === undefined || !(cutoff > 0)) continue;

    // O(images) brute-force scan per pair, no cell lists; add them if large cells get slow
    const nmax = gn.map((n) => Math.floor(cutoff * n + 0.5 + 1e-9));
    const fj = structure.sites[j].frac;
    const symbol = structure.sites[j].species.symbol;
    const r0 = Math.round(fj[0] - fi[0]);
    const r1 = Math.round(fj[1] - fi[1]);
    const r2 = Math.round(fj[2] - fi[2]);
    const df0 = fj[0] - fi[0] - r0;
    const df1 = fj[1] - fi[1] - r1;
    const df2 = fj[2] - fi[2] - r2;
    // df + image = (fj - fi) + (image - r): the label relative to the stored fracs
    const [s0, s1, s2] = trueImages ? [r0, r1, r2] : [0, 0, 0];
    const c2 = cutoff * cutoff;

    for (let ia = 0 - nmax[0]; ia <= nmax[0]; ia++) {
      for (let ib = 0 - nmax[1]; ib <= nmax[1]; ib++) {
        for (let ic = 0 - nmax[2]; ic <= nmax[2]; ic++) {
          if (j === idx && ia === 0 && ib === 0 && ic === 0) continue;

          const dx = df0 + ia;
          const dy = df1 + ib;
          const dz = df2 + ic;
          const x = dx * m[0] + dy * m[3] + dz * m[6];
          const y = dx * m[1] + dy * m[4] + dz * m[7];
          const z = dx * m[2] + dy * m[5] + dz * m[8];
          const d2 = x * x + y * y + z * z;

          if (d2 < c2) {
            out.push({
              index: j,
              symbol,
              distance: Math.sqrt(d2),
              // "+ 0" normalizes -0.
              image: [ia - s0 + 0, ib - s1 + 0, ic - s2 + 0],
            });
          }
        }
      }
    }
  }

  return out;
}

/** Neighboring site images of site `idx` closer than the cutoff, sorted by distance.
 *
 * Periodic images are enumerated: each entry names the site index plus the
 * cell translation of the image, so small cells correctly report neighbors
 * from adjacent cells (including self-images). Default cutoff per pair is
 * the covalent-radii sum plus `skin`. Pairs with unknown radii are skipped
 * unless `cutoff` is given.
 *
 * @param structure - Structure to search.
 * @param idx - Index of the central site.
 * @param options - Global cutoff override and skin padding.
 * @returns Neighbors sorted by distance (then index, then image).
 * @throws RangeError if `idx` is not the index of a site. */
export function getNeighbors(
  structure: Structure,
  idx: number,
  options?: NeighborOptions,
): Neighbor[] {
  if (!Number.isInteger(idx) || idx < 0 || idx >= structure.sites.length) {
    throw new RangeError(
      `getNeighbors: no site ${idx} (${structure.sites.length} sites)`,
    );
  }

  const skin = options?.skin ?? 0.3;

  if (!Number.isFinite(skin)) return [];

  if (
    options?.cutoff !== undefined &&
    !(options.cutoff > 0 && Number.isFinite(options.cutoff))
  ) {
    return [];
  }

  const gn = reciprocalNorms(structure);
  const radii = options?.cutoff === undefined ? siteRadii(structure) : [];
  const cutoffOf = (j: number) =>
    options?.cutoff ?? pairCutoff(radii[idx], radii[j], skin);

  return scanNeighbors(structure, idx, gn, cutoffOf, false).sort(
    (a, b) =>
      a.distance - b.distance ||
      a.index - b.index ||
      a.image[0] - b.image[0] ||
      a.image[1] - b.image[1] ||
      a.image[2] - b.image[2],
  );
}

/** The neighbors of every site (periodic images included), as a neighbor
 * list: entry i lists the images of the sites closer than the cutoff to site i,
 * in the order index, then image (not by distance). Unlike
 * {@link getNeighbors}, `image` is the lattice translation from the stored
 * fractional coordinates: the neighbor is at `sites[index].frac + image`,
 * also for coordinates outside [0, 1). Both directions of a pair are listed.
 *
 * @param structure - Structure to search.
 * @param options - Cutoff (global or per pair) and skin padding.
 * @returns The neighbors of each site, by site index. */
export function getNeighborList(
  structure: Structure,
  options?: NeighborListOptions,
): Neighbor[][] {
  const skin = options?.skin ?? 0.3;
  const cutoff = options?.cutoff;
  const none = () => structure.sites.map((): Neighbor[] => []);

  if (!Number.isFinite(skin)) return none();

  if (typeof cutoff === "number" && !(cutoff > 0 && Number.isFinite(cutoff))) {
    return none();
  }

  const gn = reciprocalNorms(structure);
  const radii = cutoff === undefined ? siteRadii(structure) : [];

  return structure.sites.map((_, i) => {
    const cutoffOf = (j: number): number | undefined => {
      if (typeof cutoff === "number") return cutoff;
      if (cutoff !== undefined) {
        const c = cutoff(i, j);
        return c !== undefined && Number.isFinite(c) ? c : undefined;
      }
      return pairCutoff(radii[i], radii[j], skin);
    };

    return scanNeighbors(structure, i, gn, cutoffOf, true);
  });
}

/** Coordination numbers for every site (periodic images included).
 * @param structure - Structure to evaluate.
 * @param options - Same cutoff options as {@link getNeighbors}.
 * @returns Neighbor count per site index. */
export function getCoordinationNumbers(
  structure: Structure,
  options?: NeighborOptions,
): number[] {
  return structure.sites.map(
    (_, i) => getNeighbors(structure, i, options).length,
  );
}
