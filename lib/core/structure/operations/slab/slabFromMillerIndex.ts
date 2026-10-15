import { calculateScaleFactor } from "./calculateScaleFactor";
import { supercell } from "../supercell";
import { addVacuum } from "./addVacuum";
import { parameters } from "@/core/lattice/parameters";
import { fromParametersCAlongZ } from "@/core/lattice/create/fromParametersCAlongZ";
import type { Structure } from "../../structure";

interface SlabOptions {
  /** Number of unit cell replications along c (surface normal). Default 1. */
  layers?: number;
  /** Vacuum thickness in Angstroms. Default 0. */
  vacuum?: number;
  /**
   * Termination shift in [0, 1) along the OUC c-direction: the OUC is
   * translated down by this amount (mod 1) before stacking, which sets
   * which atomic plane ends up at the slab surface. Use
   * {@link possibleTerminations} to enumerate shifts that avoid cutting
   * through atomic planes. Default 0.
   */
  shift?: number;
}

/**
 * Generate a slab oriented along the (hkl) plane.
 *
 * Steps:
 * 1. Calculate an integer scale factor U that puts in-plane vectors perpendicular
 *    to the surface normal, and a c-vector with max projection onto the normal.
 * 2. Apply make_supercell(U) to create an oriented unit cell (OUC).
 * 3. Shift the OUC by `shift` along c and wrap (sets the termination).
 * 4. Replicate the OUC along c to get the desired number of layers.
 * 5. Add vacuum by stretching the c-vector.
 * 6. Reorient to standard setting (c along z, reconstructed from the
 *    a/b/c/alpha/beta/gamma parameters). Fractional coordinates are
 *    unaffected (pure rotation).
 *
 * @param structure - The bulk input structure.
 * @param h - Miller index h.
 * @param k - Miller index k.
 * @param l - Miller index l.
 * @param opts - Slab options.
 * @returns A new Structure representing the slab.
 */
export function slabFromMillerIndex(
  structure: Structure,
  h: number,
  k: number,
  l: number,
  opts: SlabOptions = {},
): Structure {
  const { layers = 1, vacuum = 0, shift = 0 } = opts;

  // Step 1: Calculate the scale factor
  const U = calculateScaleFactor([h, k, l], structure.lattice);

  // Step 2: Create the oriented unit cell
  const ouc = supercell(structure, U);

  // Step 3: Shift to the termination: translate down by `shift` (mod 1).
  const terminated: Structure =
    shift === 0
      ? ouc
      : {
          ...ouc,
          sites: ouc.sites.map((site) => {
            let c = site.frac[2] - shift;
            c -= Math.floor(c);
            if (c > 1 - 1e-10 || c < 1e-10) c = 0;
            return {
              ...site,
              frac: new Float64Array([site.frac[0], site.frac[1], c]),
            };
          }),
        };

  // Step 4: Replicate along c
  const replicated = supercell(terminated, [1, 1, layers]);

  // Step 5: Add vacuum
  const withVacuum = addVacuum(replicated, vacuum);

  // Step 6: Reorient to standard setting (pure rotation; fracs unchanged)
  const [a, b, c, alpha, beta, gamma] = parameters(withVacuum.lattice);
  return {
    ...withVacuum,
    lattice: fromParametersCAlongZ(a, b, c, alpha, beta, gamma),
  };
}
