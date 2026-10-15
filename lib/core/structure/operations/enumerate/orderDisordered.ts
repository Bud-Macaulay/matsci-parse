import { supercell } from "../supercell";
import { fnv1a32 } from "@/core/math/hash";
import { totalOccupancy } from "@/core/site/disorder";
import { analyzeStructure } from "../symmetry/spglib";
import { latticePointsInSupercell } from "@/core/matrix/operations/latticePointsInSupercell";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { transpose } from "@/core/matrix/operations/transpose";
import { mul } from "@/core/matrix/operations/mul";
import { determinant } from "@/core/matrix/operations/determinant";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import {
  hermiteNormalForm,
  hermiteNormalForms,
} from "@/core/matrix/operations/hermiteNormalForm";
import type { Structure } from "../../structure";
import type { DisorderedStructure } from "../../disordered";

/**
 * Default cap on the assignment search space. Every candidate is
 * materialized and canonicalized against the full symmetry group, so
 * spaces much beyond this get slow and memory-hungry; raise it per call
 * via `EnumOptions.maxCombinations` when needed.
 */
export const DEFAULT_MAX_COMBINATIONS = 10_000;

export interface EnumOptions {
  /** Fractional tolerance when matching supercell sites to parent sites. Default 1e-6. */
  tol?: number;
  /** Symmetry precision for the parent analysis. Default 1e-4. */
  symprec?: number;
  /** Cap on the assignment search space. Default {@link DEFAULT_MAX_COMBINATIONS}. */
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

/** Compact string key for small non-negative integer arrays (< 65536). */
function keyOf(a: ArrayLike<number>): string {
  let k = "";
  for (let i = 0; i < a.length; i++) k += String.fromCharCode(a[i]!);
  return k;
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

/** Disordered parent, validated and symmetry-analyzed once. */
interface ParentAnalysis {
  parent: DisorderedStructure;
  colored: Structure;
  orbits: number[];
  operations: { rotation: Matrix; translation: Matrix }[];
  tol: number;
}

// analyzeStructure (wasm spglib) costs ~3ms per call and dominates small
// enumerations, but the same parent is re-analyzed for every H. Cache by the
// full parent description plus precisions; bounded FIFO so long sessions
// can't grow it without bound.
const analysisCache = new Map<string, ParentAnalysis>();
const ANALYSIS_CACHE_CAP = 32;

function parentKey(parent: DisorderedStructure, opts: EnumOptions): string {
  const parts = [
    `symprec=${opts.symprec ?? 1e-4}`,
    `tol=${opts.tol ?? 1e-6}`,
    `basis=${Array.from(parent.lattice.basis.data).join(",")}`,
  ];
  for (const site of parent.sites) {
    parts.push(
      `site=${Array.from(site.frac).join(",")}|${site.occupancy.map((o) => `${o.symbol}:${o.fraction}`).join(";")}`,
    );
  }
  return parts.join("\n");
}

async function analyzeParent(
  parent: DisorderedStructure,
  opts: EnumOptions,
): Promise<ParentAnalysis> {
  // Disorder per parent position; color by occupancy signature so the
  // symmetry analysis preserves the disorder pattern.
  const positions = parent.sites;
  for (const pos of positions) {
    const total = totalOccupancy(pos);
    if (total < 1 - 1e-9) {
      throw new Error(
        `orderDisorderedStructure: vacancies not supported (sums to ${total})`,
      );
    }
    // Sites may be hand-built literals that skipped createDisorderedSite.
    const symbols = pos.occupancy.map((o) => o.symbol);
    if (new Set(symbols).size !== symbols.length) {
      throw new Error(
        `orderDisorderedStructure: duplicate species at one site (${symbols.join(", ")})`,
      );
    }
  }
  const key = parentKey(parent, opts);
  const hit = analysisCache.get(key);
  if (hit) return hit;
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
  const colored: Structure = {
    lattice: parent.lattice,
    sites: positions.map((pos, pi) => ({
      species: { symbol: `__enum_${sigId.get(signatures[pi])}` },
      frac: pos.frac,
    })),
  };
  const ds = await analyzeStructure(colored, opts.symprec ?? 1e-4);
  const out: ParentAnalysis = {
    parent,
    colored,
    orbits: Array.from(ds.orbits),
    operations: ds.operations.map((op) => ({
      // moyo serializes its (nalgebra) matrices column-major; transpose to
      // the row-major rotation acting on column fractional vectors.
      rotation: transpose(createMatrix(3, 3, Array.from(op.rotation))),
      translation: createMatrix(3, 1, Array.from(op.translation)),
    })),
    tol: opts.tol ?? 1e-6,
  };
  if (analysisCache.size >= ANALYSIS_CACHE_CAP) {
    const oldest = analysisCache.keys().next().value;
    if (oldest !== undefined) analysisCache.delete(oldest);
  }
  analysisCache.set(parentKey(parent, opts), out);
  return out;
}

/** Search-space size of one cell, or null when its composition is impossible. */
interface CellPlan {
  space: number;
  run: () => Structure[];
}

/**
 * Plan the enumeration of distinct decorations in one supercell H.
 * `derivative` mode (used by {@link enumerateDerivativeStructures}) drops
 * superperiodic decorations and returns null for cells that cannot hold the
 * parent's composition; otherwise those cases throw.
 */
function planCell(
  a: ParentAnalysis,
  Hm: Matrix,
  derivative: boolean,
): CellPlan | null {
  const { parent, colored, orbits, operations, tol } = a;
  const positions = parent.sites;

  // Expand the colored average cell and label each supercell site with
  // its orbit.
  // Parent frac of the pre-image is p = H^T F (rows of H are new vectors),
  // i.e. row-wise P = F H, matched minimum-image since p need not lie in
  // [0, 1).
  const sc = supercell(colored, Hm);
  const n = sc.sites.length;
  const scFrac = createMatrix(
    n,
    3,
    sc.sites.flatMap((site) => [...site.frac]),
  );
  const parentFrac = mul(scFrac, Hm).data;
  const scOrbit = sc.sites.map((_, si) => {
    const p = parentFrac.subarray(3 * si, 3 * si + 3);
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
  const orbitIds = [...new Set(scOrbit)].sort((x, y) => x - y);
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
        if (derivative) return null;
        throw new Error(
          `orderDisorderedStructure: incommensurate fraction ${fraction} for ${symbol} (${sites.length} sites)`,
        );
      }
      counts.set(symbol, Math.round(c));
    }
    orbitCounts.set(o, counts);
  }

  let space = 1;
  for (const o of orbitIds) {
    const counts = [...orbitCounts.get(o)!.values()];
    space *= multinomial(orbitSites.get(o)!.length, counts);
  }

  const run = (): Structure[] => {
    // Group: supercell translations x compatible parent rotations, closed.
    const indexOf = new Map(sc.sites.map((s, i) => [snapKey(s.frac), i]));
    const at = (f: number[]) => {
      const i = indexOf.get(snapKey(f));
      if (i === undefined)
        throw new Error("orderDisorderedStructure: group action leaves cell");
      return i;
    };
    const translations: number[][] = latticePointsInSupercell(Hm).map((t) =>
      sc.sites.map((s) =>
        at([s.frac[0] + t[0], s.frac[1] + t[1], s.frac[2] + t[2]]),
      ),
    );
    const generators: number[][] = [...translations];
    const invT = transpose(inverse3x3(Hm));
    const Ht = transpose(Hm);
    for (const op of operations) {
      // A parent rotation preserves the supercell iff H^-T R H^T is integral.
      const M = Array.from(mul(mul(invT, op.rotation), Ht).data);
      if (!M.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) continue;
      const Ri = createMatrix(3, 3, M.map(Math.round));
      const tsc = mul(invT, op.translation).data;
      // Row-wise F' = F Ri^T + tsc.
      const moved = mul(scFrac, transpose(Ri)).data;
      generators.push(
        sc.sites.map((_, si) =>
          at([0, 1, 2].map((d) => moved[3 * si + d] + tsc[d])),
        ),
      );
    }
    // Close the generators into the full group, as site permutations. Each
    // composition reuses one scratch buffer (no per-pair closure or
    // allocation); only unseen products are stored and queued, so the work
    // is |group| x |gens| compositions plus one hash each instead of
    // re-composing every duplicate the queue used to carry.
    const group: Int32Array[] = [];
    const seenG = new Set<string>();
    const gens = generators.map((g) => Int32Array.from(g));
    const comp = new Int32Array(n);
    const queue: Int32Array[] = [];
    const offer = (p: Int32Array): void => {
      const key = keyOf(p);
      if (seenG.has(key)) return;
      seenG.add(key);
      const cp = Int32Array.from(p);
      group.push(cp);
      queue.push(cp);
    };
    for (const g of gens) offer(g);
    while (queue.length > 0) {
      const p = queue.pop()!;
      for (const gen of gens) {
        for (let i = 0; i < n; i++) comp[i] = p[gen[i]!]!;
        offer(comp);
      }
    }
    // Non-identity translations: a decoration they leave unchanged has a
    // smaller true period (superperiodic) and belongs to a smaller cell.
    const shifts = translations
      .filter((t) => t.some((j, i) => j !== i))
      .map((t) => Int32Array.from(t));

    // Species as small integer ids; labelings are Uint8Arrays of ids.
    const symbols = [
      ...new Set(orbitIds.flatMap((o) => [...orbitCounts.get(o)!.keys()])),
    ].sort();
    if (symbols.length > 255) {
      throw new Error("orderDisorderedStructure: too many species");
    }
    const sid = new Map(symbols.map((sym, i) => [sym, i]));

    // Per orbit, every way to place its species counts on its sites, in a
    // fixed order (species sorted, positions in lexicographic combinations).
    const perOrbit: { sites: number[]; patterns: Uint8Array[] }[] = [];
    for (const o of orbitIds) {
      const sites = orbitSites.get(o)!;
      const entries = [...orbitCounts.get(o)!.entries()].sort(([x], [y]) =>
        x < y ? -1 : 1,
      );
      const last = entries[entries.length - 1];
      if (!last)
        throw new Error("orderDisorderedStructure: orbit has no species");
      const lastId = sid.get(last[0])!;
      // Patterns index orbit-local positions 0..m-1 (-1 = unassigned).
      let patterns: Int16Array[] = [new Int16Array(sites.length).fill(-1)];
      for (const [sym, c] of entries.slice(0, -1)) {
        const id = sid.get(sym)!;
        const next: Int16Array[] = [];
        for (const pat of patterns) {
          const pool = [...pat.keys()].filter((j) => pat[j] === -1);
          for (const ch of combinations(pool, c)) {
            const q = pat.slice();
            for (const j of ch) q[j] = id;
            next.push(q);
          }
        }
        patterns = next;
      }
      perOrbit.push({
        sites,
        patterns: patterns.map((pat) =>
          Uint8Array.from(pat, (v) => (v === -1 ? lastId : v)),
        ),
      });
    }

    // Walk every labeling in that order. The first unseen labeling of each
    // symmetry class is its representative: mark all its images under the
    // group as seen, so every later member of the class costs one lookup.
    // Buckets are keyed by fnv1a32 with full memcmp on hits: a bare 32-bit
    // hash could silently drop a structure on collision, so equality is
    // always verified and the hash only picks the bucket.
    const lab = new Uint8Array(n);
    const img = new Uint8Array(n);
    const seen = new Map<number, Uint8Array[]>();
    const reps: Uint8Array[] = [];
    // Find-or-store in one hash.
    const known = (a: Uint8Array): boolean => {
      const h = fnv1a32(a);
      const bucket = seen.get(h);
      if (bucket === undefined) {
        seen.set(h, [a.slice()]);
        return false;
      }
      for (const b of bucket) {
        let same = true;
        for (let i = 0; i < n; i++) {
          if (b[i]! !== a[i]!) {
            same = false;
            break;
          }
        }
        if (same) return true;
      }
      bucket.push(a.slice());
      return false;
    };
    const visit = (oi: number) => {
      const entry = perOrbit[oi];
      if (!entry) {
        if (known(lab)) return;
        for (const g of group) {
          for (let i = 0; i < n; i++) img[i] = lab[g[i]!]!;
          known(img);
        }
        if (
          derivative &&
          shifts.some((t) => t.every((j, i) => lab[j] === lab[i]))
        ) {
          return;
        }
        reps.push(lab.slice());
        return;
      }
      const { sites, patterns } = entry;
      for (const pat of patterns) {
        for (let j = 0; j < sites.length; j++) lab[sites[j]!] = pat[j]!;
        visit(oi + 1);
      }
    };
    visit(0);

    return reps.map((r) => ({
      lattice: sc.lattice,
      sites: sc.sites.map((site, i) => ({
        species: { symbol: symbols[r[i]!]! },
        frac: site.frac,
      })),
    }));
  };

  return { space, run };
}

function checkSupercellMatrix(H: Matrix): Matrix {
  if (H.rows !== 3 || H.cols !== 3) {
    throw new Error("orderDisorderedStructure: H must be 3x3");
  }
  const h = Array.from(H.data);
  if (!h.every((v) => Math.abs(v - Math.round(v)) < 1e-8)) {
    throw new Error("orderDisorderedStructure: H must be integer");
  }
  const Hm = createMatrix(3, 3, h.map(Math.round));
  if (Math.abs(determinant(Hm)) < 0.5) {
    throw new Error("orderDisorderedStructure: H is singular");
  }
  return Hm;
}

/**
 * Enumerate symmetrically distinct ordered decorations of a disordered
 * parent in one fixed supercell H (enumlib's coloring step for a single
 * superlattice; see {@link enumerateDerivativeStructures} for the search
 * over all supercells of a given size).
 *
 * Each parent orbit's species counts are fixed by its occupancy fractions times
 * its site multiplicity in the supercell (vacancies and incommensurate
 * fractions throw). Decorations are deduped under supercell translations
 * plus parent rotations preserving the supercell, using the closed group
 * (canonical minimum labeling — generators alone miss composed operations).
 * Decorations whose true period is smaller than H are kept.
 *
 * @param parent - Disordered parent structure.
 * @param H - Integer supercell matrix (rows = new lattice vectors).
 * @param opts - Tolerances and search cap.
 * @returns Unique ordered supercell structures.
 * @api
 */
export async function orderDisorderedStructure(
  parent: DisorderedStructure,
  H: Matrix,
  opts: EnumOptions = {},
): Promise<Structure[]> {
  const Hm = checkSupercellMatrix(H);
  const maxCombinations = opts.maxCombinations ?? DEFAULT_MAX_COMBINATIONS;
  const plan = planCell(await analyzeParent(parent, opts), Hm, false)!;
  if (plan.space > maxCombinations) {
    throw new Error(
      `orderDisorderedStructure: search space ${plan.space} exceeds cap ${maxCombinations}`,
    );
  }
  return plan.run();
}

export interface DerivativeOptions extends EnumOptions {
  /** Smallest supercell size, in parent cells. Default 1. */
  minSize?: number;
  /** Largest supercell size, in parent cells. */
  maxSize: number;
}

/**
 * The distinct supercells of index n up to the parent's symmetry: one
 * representative HNF per class of superlattices related by a parent
 * rotation (lattice rows transform as H -> H R^T).
 */
function inequivalentSupercells(a: ParentAnalysis, n: number): Matrix[] {
  const key = (M: Matrix) => Array.from(hermiteNormalForm(M).data).join(",");
  const rotations = a.operations.map((op) => transpose(op.rotation));
  const seen = new Set<string>();
  const reps: Matrix[] = [];
  for (const H of hermiteNormalForms(n)) {
    if (seen.has(key(H))) continue;
    reps.push(H);
    for (const Rt of rotations) seen.add(key(mul(H, Rt)));
  }
  return reps;
}

/**
 * Enumerate all symmetrically distinct ordered structures derived from a
 * disordered parent with supercells of `minSize`..`maxSize` parent cells
 * (the Hart-Forcade derivative-structure search, as in enumlib).
 *
 * For each size every superlattice is generated as a Hermite normal form,
 * superlattices related by a parent rotation are reduced to one, and each
 * representative is decorated as in {@link orderDisorderedStructure}.
 * Decorations whose true period is smaller than their cell (superperiodic)
 * are dropped, since they appear at their own, smaller size; cells that
 * cannot hold the parent's composition are skipped. Sizes are counted in
 * cells of the given parent, so pass a primitive cell to match enumlib.
 *
 * @param parent - Disordered parent structure.
 * @param opts - Size range, tolerances, and a cap on the total search space.
 * @returns Unique ordered structures, smallest cells first.
 * @api
 */
export async function enumerateDerivativeStructures(
  parent: DisorderedStructure,
  opts: DerivativeOptions,
): Promise<Structure[]> {
  const { minSize = 1, maxSize } = opts;
  if (
    !Number.isInteger(minSize) ||
    !Number.isInteger(maxSize) ||
    minSize < 1 ||
    maxSize < minSize
  ) {
    throw new Error(
      "enumerateDerivativeStructures: need integers 1 <= minSize <= maxSize",
    );
  }
  const maxCombinations = opts.maxCombinations ?? DEFAULT_MAX_COMBINATIONS;
  const analysis = await analyzeParent(parent, opts);

  // Plan every cell first so the cap applies to the whole search.
  const plans: CellPlan[] = [];
  let space = 0;
  for (let size = minSize; size <= maxSize; size++) {
    for (const H of inequivalentSupercells(analysis, size)) {
      const plan = planCell(analysis, H, true);
      if (!plan) continue;
      space += plan.space;
      if (space > maxCombinations) {
        throw new Error(
          `enumerateDerivativeStructures: search space exceeds cap ${maxCombinations} (at size ${size})`,
        );
      }
      plans.push(plan);
    }
  }
  return plans.flatMap((plan) => plan.run());
}
