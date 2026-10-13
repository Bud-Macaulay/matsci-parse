import { getDisplacement } from "../distance/getDisplacement";
import { supercell } from "../supercell";
import { calculateScaleFactor } from "./calculateScaleFactor";
import { addVacuum } from "./addVacuum";
import { cross } from "@/core/matrix/operations/vector/cross";
import { cartesian } from "@/core/site/cartesian";
import { fractional } from "@/core/site/fractional";
import { gcd } from "@/core/math/numeric";
import type { Structure } from "../../structure";

interface SlabOptions {
  /** Number of oriented-cell replications along c (surface normal). Default 1. */
  layers?: number;
  /** Vacuum thickness in Angstroms. Default 0. */
  vacuum?: number;
}

/** Largest Miller index searched when rationalizing the plane. */
const MAX_INDEX = 12;
/** Tolerance for a scaled component to count as an integer. */
const INDEX_TOL = 1e-3;

/**
 * Miller indices of the lattice plane through three sites.
 *
 * The plane contains the fractional displacements f1 = s_j - s_i and
 * f2 = s_k - s_i, and (hkl) satisfies hkl·f = 0 for every in-plane
 * fractional vector, so hkl ∝ f1 × f2 (no metric needed). Throws when the
 * plane is not a lattice plane with indices up to MAX_INDEX.
 */
export function millerIndexFromSites(
  structure: Structure,
  i: number,
  j: number,
  k: number,
): [number, number, number] {
  const f1 = getDisplacement(structure, i, j);
  const f2 = getDisplacement(structure, i, k);
  const raw = Array.from(cross(f1, f2));
  const maxAbs = Math.max(...raw.map(Math.abs));
  if (maxAbs < 1e-10) {
    throw new Error("Cannot construct plane from collinear sites");
  }
  const unit = raw.map((x) => x / maxAbs);

  for (let m = 1; m <= MAX_INDEX; m++) {
    const scaled = unit.map((x) => x * m);
    const rounded = scaled.map(Math.round);
    if (rounded.every((r, d) => Math.abs(r - scaled[d]) < INDEX_TOL * m)) {
      const g = rounded.reduce((acc, r) => gcd(acc, Math.abs(r)), 0);
      // "+ 0" normalizes -0.
      return rounded.map((r) => r / g + 0) as [number, number, number];
    }
  }
  throw new Error(
    `Sites ${i}, ${j}, ${k} do not define a lattice plane with Miller indices up to ${MAX_INDEX}`,
  );
}

/**
 * Generate a slab whose surface is the lattice plane through three sites.
 *
 * Steps: Miller indices of the plane → oriented unit cell (a, b in the plane,
 * as in {@link slabFromMillerIndex}) → shift so the chosen plane sits at
 * c = 0 (the bottom termination) → replicate along c → add vacuum.
 * The Cartesian frame is unchanged; only the cell and termination change.
 *
 * @param structure - The bulk input structure.
 * @param i - Index of first site defining the surface plane.
 * @param j - Index of second site defining the surface plane.
 * @param k - Index of third site defining the surface plane.
 * @param opts - Slab options.
 * @returns A new Structure representing the slab.
 */
export function slabFromSites(
  structure: Structure,
  i: number,
  j: number,
  k: number,
  opts: SlabOptions = {},
): Structure {
  const { layers = 1, vacuum = 0 } = opts;

  const hkl = millerIndexFromSites(structure, i, j, k);
  const ouc = supercell(structure, calculateScaleFactor(hkl, structure.lattice));

  // a and b lie in the plane, so every point of it shares one c fraction.
  const anchor = cartesian(structure.lattice, structure.sites[i]);
  const c0 = fractional(ouc.lattice, anchor)[2];
  const shifted: Structure = {
    ...ouc,
    sites: ouc.sites.map((site) => {
      let c = site.frac[2] - c0;
      c -= Math.floor(c);
      if (c > 1 - 1e-8 || c < 1e-8) c = 0;
      return {
        ...site,
        frac: new Float64Array([site.frac[0], site.frac[1], c]),
      };
    }),
  };

  return addVacuum(supercell(shifted, [1, 1, layers]), vacuum);
}
