import { createLattice } from "../../lattice/lattice";
import { ibravToLattice } from "./ibrav";
import { fractional } from "../../site";
import type { Site } from "../../site/site";
import type { Structure } from "../../structure/structure";
import {
  parseQeNamelist,
  getNumber,
  getString,
  getArray,
} from "./namelist";

const BOHR_TO_ANGSTROM = 0.529177;

type AtomCoordMode = "crystal" | "angstrom" | "bohr" | "alat";

/** Parses a Quantum ESPRESSO PW input string into a Structure. */
export function fromPW(text: string): Structure {
  const namelists = parseQeNamelist(text);
  const lines = text.split("\n");

  // --- extract &SYSTEM parameters ---
  const ibrav = getNumber(namelists, "SYSTEM", "ibrav") ?? 0;
  const nat = getNumber(namelists, "SYSTEM", "nat");
  const celldm = getArray(namelists, "SYSTEM", "celldm", 6);

  // --- build lattice ---
  let lattice: ReturnType<typeof createLattice>;

  if (ibrav !== 0) {
    // ibravToLattice returns lattice vectors in Bohr → convert to angstrom
    const bohr = ibravToLattice(ibrav, celldm);
    const m = bohr.basis.data;
    lattice = createLattice([
      m[0] * BOHR_TO_ANGSTROM, m[1] * BOHR_TO_ANGSTROM, m[2] * BOHR_TO_ANGSTROM,
      m[3] * BOHR_TO_ANGSTROM, m[4] * BOHR_TO_ANGSTROM, m[5] * BOHR_TO_ANGSTROM,
      m[6] * BOHR_TO_ANGSTROM, m[7] * BOHR_TO_ANGSTROM, m[8] * BOHR_TO_ANGSTROM,
    ]);
  } else {
    // ibrav=0: lattice must come from CELL_PARAMETERS block
    const { lattice: cellLattice, units: cellUnits } = parseCellParameters(lines);

    if (cellUnits === "alat") {
      if (celldm[0] === 0) {
        throw new Error("CELL_PARAMETERS alat requires celldm(1) in &SYSTEM");
      }
      // lattice vectors are in units of celldm(1) Bohr → convert to angstrom
      const factor = celldm[0] / BOHR_TO_ANGSTROM;
      const m = cellLattice.basis.data;
      lattice = createLattice([
        m[0] * factor, m[1] * factor, m[2] * factor,
        m[3] * factor, m[4] * factor, m[5] * factor,
        m[6] * factor, m[7] * factor, m[8] * factor,
      ]);
    } else if (cellUnits === "bohr") {
      // lattice vectors in Bohr → convert to angstrom
      const m = cellLattice.basis.data;
      const factor = 1 / BOHR_TO_ANGSTROM;
      lattice = createLattice([
        m[0] * factor, m[1] * factor, m[2] * factor,
        m[3] * factor, m[4] * factor, m[5] * factor,
        m[6] * factor, m[7] * factor, m[8] * factor,
      ]);
    } else {
      // angstrom — use directly
      lattice = cellLattice;
    }
  }

  // --- parse atomic positions ---
  const { lines: atomLines, units, selectiveDynamics } = parseAtomicPositions(lines);

  if (atomLines.length === 0) {
    throw new Error("ATOMIC_POSITIONS block not found");
  }

  if (nat !== undefined && atomLines.length !== nat) {
    throw new Error(
      `Expected ${nat} atoms (from &SYSTEM nat), got ${atomLines.length}`,
    );
  }

  const sites: Site[] = [];

  for (const line of atomLines) {
    const parts = line.split(/\s+/);
    const symbol = parts[0];
    const x = +parts[1];
    const y = +parts[2];
    const z = +parts[3];

    let frac: Float64Array;

    switch (units) {
      case "crystal":
        frac = new Float64Array([x, y, z]);
        break;

      case "angstrom":
        frac = fractional(lattice, new Float64Array([x, y, z]));
        break;

      case "bohr": {
        // Bohr → angstrom → fractional
        const angstrom = new Float64Array([
          x * BOHR_TO_ANGSTROM,
          y * BOHR_TO_ANGSTROM,
          z * BOHR_TO_ANGSTROM,
        ]);
        frac = fractional(lattice, angstrom);
        break;
      }

      case "alat": {
        // alat = celldm(1) Bohr → Bohr → angstrom → fractional
        if (celldm[0] === 0) {
          throw new Error("ATOMIC_POSITIONS alat requires celldm(1) in &SYSTEM");
        }
        const bohr = new Float64Array([
          x * celldm[0],
          y * celldm[0],
          z * celldm[0],
        ]);
        const angstrom = new Float64Array([
          bohr[0] / BOHR_TO_ANGSTROM,
          bohr[1] / BOHR_TO_ANGSTROM,
          bohr[2] / BOHR_TO_ANGSTROM,
        ]);
        frac = fractional(lattice, angstrom);
        break;
      }
    }

    const site: Site = { species: { symbol }, frac };

    if (selectiveDynamics && parts.length >= 7) {
      const ifPos = [+parts[4], +parts[5], +parts[6]];
      (site.properties ??= {}).ifPos = ifPos;
    }

    sites.push(site);
  }

  return {
    lattice,
    sites,
    ...(selectiveDynamics ? { selectiveDynamics: true } : {}),
  };
}

// ---------- internal parsing helpers ----------

interface CellParamsResult {
  lattice: ReturnType<typeof createLattice>;
  units: string;
}

function parseCellParameters(lines: string[]): CellParamsResult {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^CELL_PARAMETERS/i.test(line)) {
      const unitMatch = line.match(
        /^CELL_PARAMETERS\s*(?:\{|\()?(\w+)(?:\}|\))?/i,
      );
      const units = unitMatch?.[1]?.toLowerCase() ?? "angstrom";

      const rows: number[][] = [];
      for (let j = 1; j <= 3; j++) {
        if (i + j >= lines.length) {
          throw new Error("Incomplete CELL_PARAMETERS block");
        }
        rows.push(lines[i + j].trim().split(/\s+/).map(Number));
      }

      return {
        lattice: createLattice([...rows[0], ...rows[1], ...rows[2]]),
        units,
      };
    }
  }

  throw new Error("CELL_PARAMETERS block not found");
}

interface AtomBlockResult {
  lines: string[];
  units: AtomCoordMode;
  selectiveDynamics: boolean;
}

function parseAtomicPositions(lines: string[]): AtomBlockResult {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^ATOMIC_POSITIONS/i.test(line)) {
      const unitMatch = line.match(
        /^ATOMIC_POSITIONS\s*(?:\{|\()?(\w+)(?:\}|\))?/i,
      );
      const units = (unitMatch?.[1]?.toLowerCase() ?? "angstrom") as AtomCoordMode;

      const atomLines: string[] = [];

      // check for "Selective dynamics" on the NEXT line
      let selectiveDynamics = false;
      let j = i + 1;
      if (j < lines.length && /^selective\s+dynamics/i.test(lines[j].trim())) {
        selectiveDynamics = true;
        j++;
      }

      for (; j < lines.length; j++) {
        const l = lines[j].trim();
        if (!l) break;

        const parts = l.split(/\s+/);
        if (
          parts.length < 4 ||
          !/^[A-Za-z]/.test(parts[0]) ||
          parts.slice(1, 4).some((x) => Number.isNaN(+x))
        ) {
          break;
        }

        atomLines.push(l);
      }

      return { lines: atomLines, units, selectiveDynamics };
    }
  }

  return { lines: [], units: "angstrom", selectiveDynamics: false };
}

/** Serializes a Structure to a Quantum ESPRESSO PW input string. */
export function toPW(structure: Structure): string {
  const lines: string[] = [];

  lines.push("&SYSTEM");
  lines.push("  nat = " + structure.sites.length);
  lines.push("  ibrav = 0");
  lines.push("/");

  lines.push("");

  lines.push("CELL_PARAMETERS angstrom");

  const m = structure.lattice.basis.data;

  lines.push(`${m[0]} ${m[1]} ${m[2]}`);
  lines.push(`${m[3]} ${m[4]} ${m[5]}`);
  lines.push(`${m[6]} ${m[7]} ${m[8]}`);

  lines.push("");

  lines.push("ATOMIC_POSITIONS crystal");

  if (structure.selectiveDynamics) {
    lines.push("Selective dynamics");
  }

  for (const site of structure.sites) {
    const coords = site.frac;

    let suffix = "";
    if (site.properties?.ifPos) {
      const [a, b, c] = site.properties.ifPos;
      suffix = ` ${a} ${b} ${c}`;
    }

    lines.push(
      `${site.species.symbol} ${coords[0]} ${coords[1]} ${coords[2]}${suffix}`,
    );
  }

  return lines.join("\n");
}
