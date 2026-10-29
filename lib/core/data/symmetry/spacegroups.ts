/**
 * Point group and crystal system of each International space group
 * number (1-230), from the space-group numbering of the International
 * Tables for Crystallography, Vol. A.
 */

export type CrystalSystem =
  | "triclinic"
  | "monoclinic"
  | "orthorhombic"
  | "tetragonal"
  | "trigonal"
  | "hexagonal"
  | "cubic";

// Last space group number of each of the 32 crystallographic point groups,
// in pointgroupMapping order (1 = "1", ..., 32 = "m-3m").
// prettier-ignore
const LAST_SPACEGROUP_OF_POINTGROUP = [
  1, 2, 5, 9, 15, 24, 46, 74, 80, 82, 88, 98, 110, 122, 142, 146, 148, 155,
  161, 167, 173, 174, 176, 182, 186, 190, 194, 199, 206, 214, 220, 230,
];

// Last space group number of each crystal system.
const LAST_SPACEGROUP_OF_CRYSTAL_SYSTEM: [number, CrystalSystem][] = [
  [2, "triclinic"],
  [15, "monoclinic"],
  [74, "orthorhombic"],
  [142, "tetragonal"],
  [167, "trigonal"],
  [194, "hexagonal"],
  [230, "cubic"],
];

function checkSpacegroupNumber(spacegroupNumber: number): void {
  if (
    !Number.isInteger(spacegroupNumber) ||
    spacegroupNumber < 1 ||
    spacegroupNumber > 230
  ) {
    throw new Error(`Invalid space group number ${spacegroupNumber}`);
  }
}

/**
 * International number (1-32) of the point group of a space group: the
 * index into {@link pointgroupMapping}.
 *
 * @param spacegroupNumber - International space group number (1-230).
 */
export function pointgroupNumber(spacegroupNumber: number): number {
  checkSpacegroupNumber(spacegroupNumber);
  return (
    LAST_SPACEGROUP_OF_POINTGROUP.findIndex(
      (last) => spacegroupNumber <= last,
    ) + 1
  );
}

/**
 * Crystal system of a space group (trigonal and hexagonal kept apart, as
 * spglib and pymatgen do).
 *
 * @param spacegroupNumber - International space group number (1-230).
 */
export function crystalSystem(spacegroupNumber: number): CrystalSystem {
  checkSpacegroupNumber(spacegroupNumber);
  return LAST_SPACEGROUP_OF_CRYSTAL_SYSTEM.find(
    ([last]) => spacegroupNumber <= last,
  )![1];
}
