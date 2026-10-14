import { supercell } from "../supercell";
import { groupDisorder } from "@/core/site/disorder";
import { analyzeStructure } from "../symmetry/spglib";
import { latticePointsInSupercell } from "@/core/matrix/operations/latticePointsInSupercell";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { transpose } from "@/core/matrix/operations/transpose";
import { mul } from "@/core/matrix/operations/mul";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import type { Structure } from "../../structure";

export interface EnumOptions {
  /** Fractional tolerance when matching supercell sites to parent sites. Default 1e-6. */
  tol?: number;
  /** Symmetry precision for the parent analysis. Default 1e-4. */
  symprec?: number;
  /** Cap on the assignment search space. Default 10_000_000. */
  maxCombinations?: number;
}

/** All index combinations C(pool, k) in lexicographic order. */
function combinations(pool: number[], k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, cur: number[]) => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < pool.length; i++) {
      cur.push(pool[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

function multinomial(n: number, counts: number[]): number {
  let total = 1;
  let rest = n;
  for (const k of counts) {
    let c = 1;
    for (let i = 0; i < k; i++) {
      c = (c * (rest - i)) / (i + 1);
    }
    total *= c;
    rest -= k;
  }
  return Math.round(total);
}

/** Wrapped fractional coordinate key (rounded after arithmetic, never before). */
function snapKey(f: ArrayLike<number>): string {
  return [0, 1, 2]
    .map((d) => {
      let v = f[d] % 1;
      if (v < 0) v += 1;
      if (v > 1 - 1e-9 || v < 1e-12) v = 0;
      return v.toFixed(9);
    })
    .join(",");
}

/**
 * Enumerate symmetrically distinct ordered decorations of a disordered
 * parent in a fixed supercell (sandbox port of enumlib's core loop;
 * superlattice search is not included).
 *
 * Disorder comes from split co-located sites (see `groupDisorder`): each
 * parent orbit's species counts are fixed by its occupancy fractions times
 * its site multiplicity in the supercell (vacancies and incommensurate
 * fractions throw). Decorations are deduped under supercell translations
 * plus parent rotations preserving the supercell, using the closed group
 * (canonical minimum labeling — generators alone miss composed operations).
 *
 * @param parent - Parent structure with disorder as split sites.
 * @param H - Integer supercell matrix (rows = new lattice vectors).
 * @param opts - Tolerances and search cap.
 * @returns Unique ordered supercell structures.
 */
export async function orderDisorderedStructure(
  parent: Structure,
  H: Matrix,
  opts: EnumOptions = {},
): Promise<Structure[]> {
  const tol = opts.tol ?? 1e-6;
  const maxCombinations = opts.maxCombinations ?? 10_000_000;

  if (H.rows !== 3 || H.cols !== 3) {
    throw new Error("orderDisorderedStructure: H must be 3x3");
  }
  const h = Array.from(H.data);
  if (!h.every((v) => Math.abs(v - Math.round(v)) < 1e-8)) {
    throw new Error("orderDisorderedStructure: H must be integer");
  }
  const det =
    h[0] * (h[4] * h[8] - h[5] * h[7]) -
    h[1] * (h[3] * h[8] - h[5] * h[6]) +
    h[2] * (h[3] * h[7] - h[4] * h[6]);
  if (Math.abs(det) < 0.5) {
    throw new Error("orderDisorderedStructure: H is singular");
  }

  // Disorder per parent position; color by occupancy signature so the
  // symmetry analysis preserves the disorder pattern.
  const positions = groupDisorder(parent.sites);
  for (const pos of positions) {
    const total = pos.occupancy.reduce((acc, o) => acc + o.fraction, 0);
    if (total < 1 - 1e-9) {
      throw new Error(
        `orderDisorderedStructure: vacancies not supported (sums to ${total})`,
      );
    }
  }
  const signatures = positions.map((pos) =>
    pos.occupancy
      .map((o) => `${o.symbol}:${o.fraction.toFixed(6)}`)
      .sort()
      .join("|"),
  );
  const sigId = new Map<string, number>();
  for (const sig of signatures) {
    if (!sigId.has(sig)) sigId.set(sig, sigId.size);
  }
  // One site per disordered position: split co-located sites would be
  // rejected as overlapping atoms.
  const colored: Structure = {
    lattice: parent.lattice,
    sites: positions.map((pos, pi) => ({
      species: { symbol: `__enum_${sigId.get(signatures[pi])}` },
      frac: pos.frac,
    })),
  };
  const ds = await analyzeStructure(colored, opts.symprec ?? 1e-4);
  const orbits: number[] = Array.from(ds.orbits);

  // Expand the collapsed average cell (one site per disordered position),
  // not the split parent, and label each supercell site with its orbit.
  // Parent frac of the pre-image is p = H^T F (rows of H are new vectors),
  // matched minimum-image since p need not lie in [0, 1).
  const sc = supercell(colored, H);
  const n = sc.sites.length;
  const scOrbit = sc.sites.map((site) => {
    const F = site.frac;
    const p = [0, 1, 2].map(
      (r) => h[r] * F[0] + h[3 + r] * F[1] + h[6 + r] * F[2],
    );
    for (let i = 0; i < positions.length; i++) {
      const q = positions[i]?.frac;
      if (
        q &&
        [0, 1, 2].every((d) => {
          const dd = (q[d] as number) - (p[d] as number);
          return Math.abs(dd - Math.round(dd)) <= tol;
        })
      ) {
        const o = orbits[i];
        if (o === undefined)
          throw new Error("orderDisorderedStructure: missing orbit");
        return o;
      }
    }
    throw new Error(
      "orderDisorderedStructure: supercell site matches no parent site",
    );
  });

  // Per-orbit species counts from fractions x multiplicity (must be integral).
  const orbitIds = [...new Set(scOrbit)].sort((a, b) => a - b);
  const orbitSites = new Map(orbitIds.map((o) => [o, [] as number[]]));
  scOrbit.forEach((o, i) => orbitSites.get(o)!.push(i));
  // Representative parent position per orbit for the allowed species.
  const orbitOcc = new Map<number, { symbol: string; fraction: number }[]>();
  positions.forEach((pos, i) => {
    const o = orbits[i];
    if (o !== undefined && !orbitOcc.has(o)) {
      orbitOcc.set(o, pos.occupancy);
    }
  });
  const orbitCounts = new Map<number, Map<string, number>>();
  for (const o of orbitIds) {
    const sites = orbitSites.get(o)!;
    const occ = orbitOcc.get(o);
    if (!occ)
      throw new Error("orderDisorderedStructure: orbit has no occupancy");
    const counts = new Map<string, number>();
    for (const { symbol, fraction } of occ) {
      const c = fraction * sites.length;
      if (Math.abs(c - Math.round(c)) > 1e-6) {
        throw new Error(
          `orderDisorderedStructure: incommensurate fraction ${fraction} for ${symbol} (${sites.length} sites)`,
        );
      }
      counts.set(symbol, Math.round(c));
    }
    orbitCounts.set(o, counts);
  }

  // Search-space guard before generating.
  let space = 1;
  for (const o of orbitIds) {
    const counts = [...orbitCounts.get(o)!.values()];
    space *= multinomial(orbitSites.get(o)!.length, counts);
  }
  if (space > maxCombinations) {
    throw new Error(
      `orderDisorderedStructure: search space ${space} exceeds cap ${maxCombinations}`,
    );
  }

  // Group: supercell translations x compatible parent rotations, closed.
  const indexOf = new Map(sc.sites.map((s, i) => [snapKey(s.frac), i]));
  const at = (f: number[]) => {
    const i = indexOf.get(snapKey(f));
    if (i === undefined)
      throw new Error("orderDisorderedStructure: group action leaves cell");
    return i;
  };
  const generators: number[][] = [];
  for (const t of latticePointsInSupercell(H)) {
    generators.push(
      sc.sites.map((s) =>
        at([s.frac[0] + t[0], s.frac[1] + t[1], s.frac[2] + t[2]]),
      ),
    );
  }
  const Hm = createMatrix(3, 3, h);
  const invT = transpose(inverse3x3(Hm));
  const Ht = transpose(Hm);
  for (const op of ds.operations) {
    const R = createMatrix(3, 3, Array.from(op.rotation));
    // A parent rotation preserves the supercell iff H^-T R H^T is integral.
    const M = Array.from(mul(mul(invT, R), Ht).data);
    if (!M.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) continue;
    const Ri = M.map(Math.round);
    const tsc = Array.from(
      mul(invT, createMatrix(3, 1, Array.from(op.translation))).data,
    );
    generators.push(
      sc.sites.map((s) => {
        const F = s.frac;
        return at([
          Ri[0] * F[0] + Ri[1] * F[1] + Ri[2] * F[2] + tsc[0],
          Ri[3] * F[0] + Ri[4] * F[1] + Ri[5] * F[2] + tsc[1],
          Ri[6] * F[0] + Ri[7] * F[1] + Ri[8] * F[2] + tsc[2],
        ]);
      }),
    );
  }
  const group: number[][] = [];
  const seenG = new Set<string>();
  const queue = [...generators];
  while (queue.length > 0) {
    const p = queue.pop()!;
    const key = p.join(",");
    if (seenG.has(key)) continue;
    seenG.add(key);
    group.push(p);
    for (const q of generators) {
      queue.push(p.map((_, i) => p[q[i]]));
    }
  }

  // Species ids for canonical tuples.
  const symbols = [
    ...new Set(orbitIds.flatMap((o) => [...orbitCounts.get(o)!.keys()])),
  ].sort();
  const sid = new Map(symbols.map((s, i) => [s, i]));

  // Per-orbit assignments, then product + canonical dedup.
  const perOrbit: { sites: number[]; labels: string[][] }[] = [];
  for (const o of orbitIds) {
    const sites = orbitSites.get(o)!;
    const entries = [...orbitCounts.get(o)!.entries()].sort(([a], [b]) =>
      a < b ? -1 : 1,
    );
    const last = entries[entries.length - 1];
    if (!last)
      throw new Error("orderDisorderedStructure: orbit has no species");
    const [lastSym] = last;
    let assigns: Map<number, string>[] = [new Map()];
    for (let s = 0; s < entries.length - 1; s++) {
      const entry = entries[s];
      if (!entry) continue;
      const [sym, c] = entry;
      const next: Map<number, string>[] = [];
      for (const a of assigns) {
        const pool = sites.filter((i) => !a.has(i));
        for (const ch of combinations(pool, c)) {
          const m = new Map(a);
          for (const i of ch) m.set(i, sym);
          next.push(m);
        }
      }
      assigns = next;
    }
    perOrbit.push({
      sites,
      labels: assigns.map((a) => {
        const lab = new Array<string>(n).fill("");
        for (const [i, s] of a) lab[i] = s;
        for (const i of sites) if (!lab[i]) lab[i] = lastSym;
        return lab;
      }),
    });
  }

  const unique = new Map<string, string[]>();
  const atLab = (lab: string[], i: number): string => {
    const s = lab[i];
    if (s === undefined || s === "")
      throw new Error("orderDisorderedStructure: unassigned site");
    return s;
  };
  const combine = (oi: number, lab: string[]) => {
    const entry = perOrbit[oi];
    if (!entry) {
      let best: string | null = null;
      for (const g of group) {
        const key = lab
          .map((_, i) => sid.get(atLab(lab, g[i] ?? -1)) ?? -1)
          .join(",");
        if (best === null || key < best) best = key;
      }
      if (best !== null && !unique.has(best)) unique.set(best, [...lab]);
      return;
    }
    for (const labels of entry.labels) {
      const next = [...lab];
      for (const i of entry.sites) next[i] = atLab(labels, i);
      combine(oi + 1, next);
    }
  };
  combine(0, new Array<string>(n).fill(""));

  return [...unique.values()].map((lab) => ({
    lattice: sc.lattice,
    sites: sc.sites.map((site, i) => ({
      species: { symbol: atLab(lab, i) },
      frac: site.frac,
    })),
  }));
}
