import { createLattice } from "../lattice/lattice";
import { fractional } from "../site";
import { cartesian } from "../site/cartesian";
import type { Site } from "../site/site";
import type { Structure } from "../structure/structure";

type CoordinateMode = "crystal" | "angstrom";

// NOTE / TODO:
// PW is a very complex file format, it would be good if i can do some intense reading.
// It might take a while to get a nice representation of these things...

/**
 * Parses a crystal structure from Quantum ESPRESSO input format (PW).
 *
 * Extracts lattice and atomic information from a Quantum ESPRESSO pw.x input file.
 * Supports both crystal (fractional) and Cartesian (angstrom) coordinate systems.
 *
 * @param text - The Quantum ESPRESSO input file content
 * @returns A Structure object parsed from the input
 * @throws Error if required fields (CELL_PARAMETERS, ATOMIC_SPECIES, ATOMIC_POSITIONS) are missing
 *
 * @remarks
 * - QE input format is very complex; this is a simplified parser
 * - Requires CELL_PARAMETERS section for lattice definition
 * - Requires ATOMIC_SPECIES and ATOMIC_POSITIONS for atomic information
 * - Supports both crystal and angstrom coordinate modes
 * - Pseudo-potential information is ignored
 * - May not handle all advanced QE features
 *
 * @example
 * ```typescript
 * const qeInput = `
 *   CELL_PARAMETERS angstrom
 *   4.05 0 0
 *   0 4.05 0
 *   0 0 4.05
 *   ATOMIC_SPECIES
 *   Al 26.98 Al.pbe-n-kjpaw_psl.1.0.0.UPF
 *   ATOMIC_POSITIONS crystal
 *   Al 0 0 0
 * `;
 * const structure = fromPW(qeInput);
 * ```
 */
export function fromPW(text: string): Structure {
  const lines = text.split("\n").map((x) => x.trim());

  let latticeRows: number[][] = [];
  const atomLines: string[] = [];

  // ---------- lattice ----------
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^CELL_PARAMETERS/i.test(line)) {
      for (let j = 1; j <= 3; j++) {
        latticeRows.push(lines[i + j].split(/\s+/).map(Number));
      }

      break;
    }
  }

  if (latticeRows.length !== 3) {
    throw new Error("CELL_PARAMETERS block not found");
  }

  const lattice = createLattice([
    ...latticeRows[0],
    ...latticeRows[1],
    ...latticeRows[2],
  ]);

  // ---------- atomic positions ----------
  let atomUnits = "angstrom";
  let inAtomicBlock = false;

  for (const line of lines) {
    if (/^ATOMIC_POSITIONS/i.test(line)) {
      inAtomicBlock = true;

      const match = line.match(
        /^ATOMIC_POSITIONS\s*(?:\{|\()?(\w+)(?:\}|\))?/i,
      );

      atomUnits = match?.[1]?.toLowerCase() ?? "angstrom";

      continue;
    }

    if (!inAtomicBlock) continue;

    const parts = line.split(/\s+/);

    if (
      parts.length < 4 ||
      !/^[A-Za-z]/.test(parts[0]) ||
      parts.slice(1, 4).some((x) => Number.isNaN(+x))
    ) {
      break;
    }

    atomLines.push(line);
  }

  if (atomLines.length === 0) {
    throw new Error("ATOMIC_POSITIONS block not found");
  }

  const isCrystal = atomUnits === "crystal";

  const sites: Site[] = [];

  for (const line of atomLines) {
    const [symbol, x, y, z] = line.split(/\s+/);

    let frac: Float64Array;

    if (isCrystal) {
      frac = new Float64Array([+x, +y, +z]);
    } else {
      // convert cartesian → fractional

      frac = fractional(lattice, new Float64Array([+x, +y, +z]));
    }

    sites.push({
      species: { symbol },
      frac,
    });
  }

  return {
    lattice,
    sites,
  };
}

export function toPW(structure: Structure): string {
  const lines: string[] = [];

  lines.push("&SYSTEM");
  lines.push("/");

  lines.push("");

  lines.push(`CELL_PARAMETERS angstrom`);

  const m = structure.lattice.basis.data;

  lines.push(`${m[0]} ${m[1]} ${m[2]}`);
  lines.push(`${m[3]} ${m[4]} ${m[5]}`);
  lines.push(`${m[6]} ${m[7]} ${m[8]}`);

  lines.push("");

  lines.push(`ATOMIC_POSITIONS crystal`);

  for (const site of structure.sites) {
    const coords = site.frac;

    lines.push(
      `${site.species.symbol} ` + `${coords[0]} ${coords[1]} ${coords[2]}`,
    );
  }

  return lines.join("\n");
}
