import { Structure } from "../structure";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import { elementSymbolOf } from "../../data/periodictable/isotopes";
import { getCovalentRadius } from "../../data/periodictable/covalentRadii";
import { minimumImage } from "./distance/utils";

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

function pairCutoff(a: string, b: string, skin: number): number | undefined {
  const ra = getCovalentRadius(elementSymbolOf(a));
  const rb = getCovalentRadius(elementSymbolOf(b));

  if (ra == null || rb == null) return undefined;

  return ra + rb + skin;
}

/** Neighboring site images of site `idx` within the cutoff, sorted by distance.
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
 * @returns Neighbors sorted by distance (then index, then image). */
export function getNeighbors(
  structure: Structure,
  idx: number,
  options?: NeighborOptions,
): Neighbor[] {
  const skin = options?.skin ?? 0.3;

  if (!Number.isFinite(skin)) return [];

  if (
    options?.cutoff !== undefined &&
    !(options.cutoff > 0 && Number.isFinite(options.cutoff))
  ) {
    return [];
  }

  const self = structure.sites[idx].species.symbol;
  const m = structure.lattice.basis.data;

  // Fractional extent of the cutoff sphere via reciprocal row norms.
  // Lattice-vector lengths undercount for skewed cells (false negatives).
  const g = reciprocalLatticeCrystallographic(structure.lattice).basis.data;
  const gn = [0, 1, 2].map((i) =>
    Math.sqrt(g[i * 3] ** 2 + g[i * 3 + 1] ** 2 + g[i * 3 + 2] ** 2),
  );

  if (!gn.every(Number.isFinite)) {
    throw new Error("getNeighbors: degenerate lattice");
  }

  const fi = structure.sites[idx].frac;
  const out: Neighbor[] = [];

  for (let j = 0; j < structure.sites.length; j++) {
    const cutoff =
      options?.cutoff ??
      pairCutoff(self, structure.sites[j].species.symbol, skin);

    if (cutoff === undefined || !(cutoff > 0)) continue;

    // O(images) brute-force scan per pair, no cell lists; add them if large cells get slow
    const nmax = gn.map((n) => Math.floor(cutoff * n + 0.5 + 1e-9));
    const fj = structure.sites[j].frac;
    const symbol = structure.sites[j].species.symbol;
    // Wrapped offset keeps image labels canonical for non-canonical fracs.
    const df = minimumImage(
      new Float64Array([fj[0] - fi[0], fj[1] - fi[1], fj[2] - fi[2]]),
    );
    const c2 = cutoff * cutoff;

    for (let ia = 0 - nmax[0]; ia <= nmax[0]; ia++) {
      for (let ib = 0 - nmax[1]; ib <= nmax[1]; ib++) {
        for (let ic = 0 - nmax[2]; ic <= nmax[2]; ic++) {
          if (j === idx && ia === 0 && ib === 0 && ic === 0) continue;

          const dx = df[0] + ia;
          const dy = df[1] + ib;
          const dz = df[2] + ic;
          const x = dx * m[0] + dy * m[3] + dz * m[6];
          const y = dx * m[1] + dy * m[4] + dz * m[7];
          const z = dx * m[2] + dy * m[5] + dz * m[8];
          const d2 = x * x + y * y + z * z;

          if (d2 <= c2) {
            out.push({
              index: j,
              symbol,
              distance: Math.sqrt(d2),
              image: [ia, ib, ic],
            });
          }
        }
      }
    }
  }

  return out.sort(
    (a, b) =>
      a.distance - b.distance ||
      a.index - b.index ||
      a.image[0] - b.image[0] ||
      a.image[1] - b.image[1] ||
      a.image[2] - b.image[2],
  );
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
