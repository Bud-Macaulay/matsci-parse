import { CrystalStructure } from "../crystal";
import { CartesianCoords, Site } from "../common";
import { stringToLines } from "../utils";

/**
 * Parse Quantum ESPRESSO input/output string to a CrystalStructure.
 * Two-pass parser: first finds lattice, then parses atomic positions.
 * Supports fractional (crystal) and Cartesian coordinates (angstrom/bohr).
 */
export function parsePw(lines: string[]): {
  structure: CrystalStructure;
  linesConsumed: number;
} {
  let lattice: CartesianCoords[] = [];
  const atomLines: string[] = [];

  // ---------- FIRST PASS: find lattice ----------
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("&")) continue;

    if (/^CELL_PARAMETERS/i.test(line)) {
      let count = 0;
      let j = i + 1;
      while (count < 3 && j < lines.length) {
        const vecLine = lines[j].trim();
        if (vecLine !== "") {
          lattice.push(vecLine.split(/\s+/).map(Number) as CartesianCoords);
          count++;
        }
        j++;
      }

      if (count < 3) throw new Error("Incomplete CELL_PARAMETERS block");
      break;
    }
  }

  if (lattice.length !== 3)
    throw new Error("CELL_PARAMETERS block not found or incomplete");

  // ---------- SECOND PASS: collect atomic positions ----------
  let inAtomicBlock = false;
  let atomUnits = "angstrom";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("&")) continue;

    if (/^ATOMIC_POSITIONS/i.test(line)) {
      inAtomicBlock = true;
      const match = line.match(/^ATOMIC_POSITIONS\s+(\w+)/i);
      atomUnits = match ? match[1].toLowerCase() : "angstrom";
      continue;
    }

    if (inAtomicBlock) {
      const parts = line.split(/\s+/);
      if (
        parts.length < 4 ||
        !/^[A-Za-z]/.test(parts[0]) ||
        parts.slice(1, 4).some((x) => Number.isNaN(Number(x)))
      )
        break;

      atomLines.push(line);
    }
  }

  if (atomLines.length === 0)
    throw new Error("ATOMIC_POSITIONS block not found");

  const isCrystal = atomUnits === "crystal";

  // ---------- determine species order ----------
  const species: string[] = [];
  for (const line of atomLines) {
    const element = line.split(/\s+/)[0];
    if (!species.includes(element)) species.push(element);
  }

  // ---------- parse atomic positions ----------
  const sites: Site[] = [];
  for (const line of atomLines) {
    const parts = line.split(/\s+/);
    const element = parts[0];
    const f = parts.slice(1, 4).map(Number) as CartesianCoords;

    let cart: CartesianCoords;
    if (isCrystal) {
      cart = [
        f[0] * lattice[0][0] + f[1] * lattice[1][0] + f[2] * lattice[2][0],
        f[0] * lattice[0][1] + f[1] * lattice[1][1] + f[2] * lattice[2][1],
        f[0] * lattice[0][2] + f[1] * lattice[1][2] + f[2] * lattice[2][2],
      ] as CartesianCoords;
    } else {
      cart = f;
    }

    sites.push(new Site(species.indexOf(element), cart));
  }

  return {
    structure: new CrystalStructure({ lattice, species, sites }),
    linesConsumed: lines.length,
  };
}

/**
 * Parse QE string to CrystalStructure
 */
export function pwToStructure(pwString: string): CrystalStructure {
  const lines = stringToLines(pwString);
  return parsePw(lines).structure;
}
