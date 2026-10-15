import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { norm } from "@/core/matrix/operations/vector/norm";
import { dot } from "@/core/matrix/operations/vector/dot";
import { mul } from "@/core/matrix/operations/mul";
import { row } from "@/core/matrix/operations/row";
import { createMatrix } from "@/core/matrix/matrix";
import { calculateScaleFactor } from "./calculateScaleFactor";
import { supercell } from "../supercell";
import type { Structure } from "../../structure";

/**
 * Termination shifts for a (hkl) slab: fractional offsets along the OUC
 * c-direction where a cut avoids slicing through an atomic plane.
 *
 * OUC sites are clustered along the surface normal by Cartesian z-distance
 * (single linkage, PBC-aware, cutoff `ftol` in Angstrom); each termination
 * is the midpoint between adjacent cluster planes.
 *
 * @param structure - The bulk input structure.
 * @param millerIndex - The Miller indices [h, k, l].
 * @param ftol - Plane-clustering threshold in Angstroms. Default 0.1.
 * @returns Termination shifts in [0, 1) along the OUC c-direction, sorted.
 * @api
 */
export function possibleTerminations(
  structure: Structure,
  millerIndex: [number, number, number],
  ftol = 0.1,
): number[] {
  const ouc = supercell(
    structure,
    calculateScaleFactor(millerIndex, structure.lattice),
  );
  const n = ouc.sites.length;
  if (n === 0) return [];
  const zs = ouc.sites.map((s) => s.frac[2]);
  if (n === 1) {
    const t = zs[0] + 0.5;
    return [t - Math.floor(t)];
  }

  // Surface normal n = (h, k, l) B*; plane-stacking height is c . n / |n|.
  const normal = mul(
    createMatrix(1, 3, millerIndex),
    reciprocalLatticeCrystallographic(structure.lattice).basis,
  ).data;
  const height =
    Math.abs(dot(normal, row(ouc.lattice.basis, 2))) / norm(normal);

  // Single-linkage clustering on PBC z-distances (Kruskal, no deps).
  const edges: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dz = Math.abs(zs[i] - zs[j] - Math.round(zs[i] - zs[j])) * height;
      edges.push([dz, i, j]);
    }
  }
  edges.sort((a, b) => a[0] - b[0]);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  for (const [d, i, j] of edges) {
    if (d > ftol) break;
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r)!.push(zs[i]);
  }

  // Circular mean per cluster, then midpoints between adjacent planes.
  const means = [...clusters.values()]
    .map((members) => {
      let re = 0;
      let im = 0;
      for (const z of members) {
        re += Math.cos(2 * Math.PI * z);
        im += Math.sin(2 * Math.PI * z);
      }
      return (
        (((Math.atan2(im / members.length, re / members.length) /
          (2 * Math.PI)) %
          1) +
          1) %
        1
      );
    })
    .sort((a, b) => a - b);
  const terms = means.slice(1).map((z, i) => 0.5 * (means[i] + z));
  terms.push((0.5 * (means[0] + 1 + means[means.length - 1])) % 1);
  return terms.sort((a, b) => a - b);
}
