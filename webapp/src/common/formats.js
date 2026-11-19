import { isDisordered, parseStructure } from "matsci-parse";

/**
 * A structure from a file's text, in any format matsci-parse reads (CIF,
 * POSCAR, QE pw, XSF, XYZ, FHI-aims geometry.in, PDB, GRO, JSON formats); the
 * file name helps it choose.
 */
export function parseFileText(fileText, fileName) {
  const { format, structure } = parseStructure(fileText, { fileName });

  if (isDisordered(structure)) {
    throw new Error(
      "This file has partially occupied sites (a disordered structure), which the viewer doesn't support yet.",
    );
  }

  return {
    format,
    structure,
  };
}
