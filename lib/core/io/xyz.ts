import { createLattice, Lattice } from "../lattice/lattice";
import { Site } from "../site/site";
import { Structure } from "../structure/structure";

type ExtendedXYZInfo = Record<string, string>;

function parseHeader(comment: string): ExtendedXYZInfo {
  const info: ExtendedXYZInfo = {};
  const kvRegex = /(\w+)=(".*?"|\S+)/g;

  for (const match of comment.matchAll(kvRegex)) {
    let value = match[2];
    if (value.startsWith('"')) value = value.slice(1, -1);
    info[match[1]] = value;
  }

  return info;
}

function parseLattice(info: ExtendedXYZInfo) {
  if (!info.Lattice) {
    throw new Error("Extended XYZ must contain Lattice");
  }

  const v = info.Lattice.split(/\s+/).map(Number);
  if (v.length !== 9) throw new Error("Invalid Lattice");

  return createLattice([v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]]);
}

/**
 * Parses a crystal structure from extended XYZ format.
 *
 * Reads atomic structure from XYZ format with extended headers containing
 * lattice information (Extended XYZ format used by ASE and other tools).
 *
 * @param text - The XYZ file content as a string
 * @returns A Structure object parsed from the XYZ data
 * @throws Error if lattice information or required fields are missing
 *
 * @remarks
 * - First line: number of atoms
 * - Second line: properties header in key=value format (must include "Lattice")
 * - Remaining lines: atomic species and Cartesian positions
 * - Lattice must be specified in extended header as 9 space-separated values
 * - Standard XYZ format (without lattice) is not supported
 *
 * @example
 * ```typescript
 * const xyzText = `2
 * Lattice="4.05 0 0 0 4.05 0 0 0 4.05" Properties=species:S:1:pos:R:3
 * Al 0.0 0.0 0.0
 * Al 2.025 2.025 2.025`;
 * const structure = fromXYZ(xyzText);
 * ```
 */
export function fromXYZ(text: string) {
  const lines = text.trim().split("\n");

  const n = Number(lines[0]);
  const comment = lines[1];

  const info = parseHeader(comment);
  const lattice = parseLattice(info);

  const sites: Site[] = [];

  for (let i = 0; i < n; i++) {
    const [symbol, x, y, z] = lines[2 + i].split(/\s+/);

    sites.push({
      species: { symbol },
      frac: new Float64Array([+x, +y, +z]),
    });
  }

  return { lattice, sites };
}

function formatLattice(lattice: Lattice): string {
  const m = lattice.basis.data;

  // row-major flattening assumption (consistent with your matrix code)
  return `${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]} ${m[7]} ${m[8]}`;
}

/**
 * Serializes a structure to extended XYZ format.
 *
 * Converts a Structure to extended XYZ format suitable for visualization
 * and exchange with other materials science tools (ASE, OVITO, etc.).
 *
 * @param structure - The structure to serialize
 * @returns The structure as an extended XYZ formatted string
 *
 * @remarks
 * - Line 1: Number of atoms
 * - Line 2: Header with lattice information in extended XYZ format
 * - Remaining lines: Atomic species and fractional coordinates
 * - Lattice is specified as 9 space-separated values in row-major order
 * - The output uses fractional coordinates as given in the structure
 *
 * @example
 * ```typescript
 * const structure = { lattice: cubic(4.05), sites: [...] };
 * const xyzString = toXYZ(structure);
 * // Output can be written to file and opened in visualization software
 * ```
 */
export function toXYZ(structure: Structure): string {
  const sites = structure.sites;

  const lines: string[] = [];

  lines.push(String(sites.length));

  const latticeStr = formatLattice(structure.lattice);

  lines.push(`Lattice="${latticeStr}"`);

  for (const site of sites) {
    const f = site.frac;

    lines.push(`${site.species.symbol} ${f[0]} ${f[1]} ${f[2]}`);
  }

  return lines.join("\n");
}
