import type { Structure } from "../../structure/structure";
import { metricTensor } from "../../../lattice/metricTensor";

export interface AssignmentResult {
  /** For each site i in A, the matched site index in B (or -1 if unassigned). */
  assignment: Int32Array;
  /** Per-site distances in the same order as A's sites. */
  distances: Float64Array;
  rms: number;
  maxDistance: number;
}

/** O(n^3) Hungarian (Kuhn–Munkres) solver for a square cost matrix.
 *  Returns the column index assigned to each row. */
function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const INF = Number.POSITIVE_INFINITY;

  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(INF);
    const used = new Array<boolean>(n + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;

      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const result = new Array<number>(n);
  for (let j = 1; j <= n; j++) {
    result[p[j] - 1] = j - 1;
  }
  return result;
}

/** Group site indices by species symbol. */
function groupBySpecies(structure: Structure): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  structure.sites.forEach((site, index) => {
    const symbol = site.species.symbol;
    let list = groups.get(symbol);
    if (!list) {
      list = [];
      groups.set(symbol, list);
    }
    list.push(index);
  });
  return groups;
}

/**
 * Squared minimum-image distance between two fractional coordinates in the
 * lattice described by the metric tensor `G` (row-major 3x3). For non-orthogonal
 * lattices the true nearest image is found by searching small integer shifts.
 */
function squaredMinimumImageDistance(
  fa: Float64Array,
  fb: Float64Array,
  G: Float64Array,
): number {
  const dx = fb[0] - fa[0];
  const dy = fb[1] - fa[1];
  const dz = fb[2] - fa[2];

  let best = Number.POSITIVE_INFINITY;

  for (let i = -1; i <= 1; i++) {
    const x = dx - i;
    for (let j = -1; j <= 1; j++) {
      const y = dy - j;
      for (let k = -1; k <= 1; k++) {
        const z = dz - k;
        const d =
          x * (G[0] * x + G[1] * y + G[2] * z) +
          y * (G[3] * x + G[4] * y + G[5] * z) +
          z * (G[6] * x + G[7] * y + G[8] * z);
        if (d < best) best = d;
      }
    }
  }

  return best < 0 ? 0 : best;
}

/**
 * Find the optimal (minimum sum-of-squared distance) assignment of the sites of
 * `structureA` onto those of `structureB`, constrained so that matched sites
 * share the same species.
 *
 * Distances use the minimum-image convention in `structureA`'s metric, which
 * implicitly accounts for any lattice translation.
 *
 * Returns `null` when no species-valid complete assignment exists (i.e. the two
 * structures do not contain the same multiset of species).
 */
export function assignSites(
  structureA: Structure,
  structureB: Structure,
  maxPairDistance?: number,
): AssignmentResult | null {
  const groupsA = groupBySpecies(structureA);
  const groupsB = groupBySpecies(structureB);

  for (const [symbol, indicesA] of groupsA) {
    const indicesB = groupsB.get(symbol);
    if (!indicesB || indicesB.length !== indicesA.length) {
      return null;
    }
  }

  const n = structureA.sites.length;
  const assignment = new Int32Array(n).fill(-1);
  const distances = new Float64Array(n);
  const G = metricTensor(structureA.lattice).data;

  const fracA = structureA.sites.map((site) => site.frac);
  const fracB = structureB.sites.map((site) => site.frac);

  const capSq =
    maxPairDistance !== undefined ? maxPairDistance * maxPairDistance : Number.POSITIVE_INFINITY;

  let sumSquared = 0;
  let maxDist = 0;

  for (const [symbol, indicesA] of groupsA) {
    const indicesB = groupsB.get(symbol)!;
    const m = indicesA.length;

    if (m === 0) continue;

    const cost: number[][] = Array.from({ length: m }, () =>
      new Array<number>(m).fill(0),
    );

    for (let i = 0; i < m; i++) {
      const a = fracA[indicesA[i]];
      for (let j = 0; j < m; j++) {
        const b = fracB[indicesB[j]];
        const d = squaredMinimumImageDistance(a, b, G);
        cost[i][j] =
          capSq !== Number.POSITIVE_INFINITY && d > capSq
            ? Number.POSITIVE_INFINITY
            : d;
      }
    }

    // If any site has no partner within tolerance, no assignment within
    // tolerance is possible — skip the O(n³) Hungarian solver entirely.
    for (let i = 0; i < m; i++) {
      let feasible = false;
      for (let j = 0; j < m; j++) {
        if (cost[i][j] !== Number.POSITIVE_INFINITY) {
          feasible = true;
          break;
        }
      }
      if (!feasible) return null;
    }
    for (let j = 0; j < m; j++) {
      let feasible = false;
      for (let i = 0; i < m; i++) {
        if (cost[i][j] !== Number.POSITIVE_INFINITY) {
          feasible = true;
          break;
        }
      }
      if (!feasible) return null;
    }

    // Replace any remaining infinities with a huge finite cost so the solver
    // (which assumes finite costs) completes safely for the rare infeasible
    // case not caught above (a Hall violation). Such a match is rejected by the
    // rms check downstream.
    const BIG = 1e18;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (cost[i][j] === Number.POSITIVE_INFINITY) cost[i][j] = BIG;
      }
    }

    const perm = hungarian(cost);

    for (let i = 0; i < m; i++) {
      const aIndex = indicesA[i];
      const bIndex = indicesB[perm[i]];
      const distance = Math.sqrt(cost[i][perm[i]]);
      assignment[aIndex] = bIndex;
      distances[aIndex] = distance;
      sumSquared += distance * distance;
      if (distance > maxDist) maxDist = distance;
    }
  }

  const rms = n > 0 ? Math.sqrt(sumSquared / n) : 0;

  return { assignment, distances, rms, maxDistance: maxDist };
}
