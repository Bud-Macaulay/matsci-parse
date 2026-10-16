import type { Structure } from "../../structure/structure";
import type { KPoints } from "../../kpoints/kpoints";
import { kspacingToGrid } from "../../lattice/kspacingToGrid";
import { poscarOrder, toPOSCAR } from "../poscar";
import { toKPOINTS } from "../kpoints/vasp";
import { toINCAR, type VaspIncarOptions } from "./incar";

/** Options for {@link toVaspInput}. */
export interface VaspInputOptions {
  /** INCAR tags, written as given (no reordering). */
  incar?: VaspIncarOptions;
  /**
   * Per-site INCAR arrays in `structure.sites` order, reordered to POSCAR
   * order on output. MAGMOM takes one value per site (collinear) or a
   * [x, y, z] vector per site (noncollinear).
   */
  perSite?: {
    MAGMOM?: readonly number[] | readonly (readonly [number, number, number])[];
  };
  /**
   * Per-element INCAR arrays, e.g. `{ LDAUU: { Fe: 5.3, O: 0 } }`, written in
   * POSCAR species order. Every element in the structure needs a value.
   */
  perSpecies?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * KPOINTS file: a canonical k-point specification, or a spacing in Å⁻¹
   * (2π included) for a Gamma-centered mesh. Omit to write no KPOINTS
   * (e.g. when using the KSPACING tag).
   */
  kpoints?: KPoints | { spacing: number };
  /**
   * Comment on the first line of the POSCAR. (The INCAR's own title is the
   * SYSTEM tag, set through `incar`.)
   */
  poscarComment?: string;
}

/** Generated VASP input files, keyed by file name. */
export interface VaspInput {
  POSCAR: string;
  INCAR: string;
  KPOINTS?: string;
}

/**
 * Write the VASP input files for a structure.
 *
 * POSCAR groups sites by element (see {@link poscarOrder}); per-site and
 * per-element INCAR arrays given through `perSite` / `perSpecies` are
 * reordered to match it, so values always land on the right atoms. Tags in
 * `incar` are written as given; setting the same tag in `incar` and in
 * `perSite`/`perSpecies` is an error.
 */
export function toVaspInput(
  structure: Structure,
  options: VaspInputOptions = {},
): VaspInput {
  const { species, order } = poscarOrder(structure);
  const derived: Record<string, number[]> = {};

  const magmom = options.perSite?.MAGMOM;
  if (magmom !== undefined) {
    if (magmom.length !== structure.sites.length) {
      throw new Error(
        `perSite.MAGMOM has ${magmom.length} values but the structure has ${structure.sites.length} sites`,
      );
    }
    derived.MAGMOM = order.flatMap((i) => {
      const m = magmom[i];
      return typeof m === "number" ? [m] : [...m];
    });
  }

  for (const [tag, byElement] of Object.entries(options.perSpecies ?? {})) {
    const missing = species.filter((el) => byElement[el] === undefined);
    if (missing.length > 0) {
      throw new Error(`perSpecies.${tag} has no value for ${missing.join(", ")}`);
    }
    derived[tag] = species.map((el) => byElement[el]);
  }

  const incar = options.incar ?? {};
  const clashes = Object.keys(derived).filter(
    (tag) => tag in incar || tag in (incar.extra ?? {}),
  );
  if (clashes.length > 0) {
    throw new Error(
      `${clashes.join(", ")} set both in incar and in perSite/perSpecies`,
    );
  }

  const files: VaspInput = {
    POSCAR: toPOSCAR(structure, { title: options.poscarComment }),
    INCAR: toINCAR({ ...incar, extra: { ...incar.extra, ...derived } }),
  };

  if (options.kpoints) {
    files.KPOINTS = toKPOINTS(
      "spacing" in options.kpoints
        ? {
            kind: "grid",
            mesh: kspacingToGrid(structure.lattice, options.kpoints.spacing),
            origin: [0, 0, 0],
            scheme: "gamma-centered",
          }
        : options.kpoints,
    );
  }

  return files;
}
