import { fromParameters } from "../../lattice/create/fromParameters";
import { parameters } from "../../lattice/parameters";
import { Structure } from "../../structure/structure";
import {
  parseOperations,
  applyOperation,
} from "./symmetryOperations";
import { LineReader } from "../helpers";

function cleanValue(value: string | undefined): number {
  if (value === undefined) return NaN;

  const unquoted = value.replace(/^['"]+|['"]+$/g, "").trim();
  // remove uncertainty notation:
  // 5.432(1) -> 5.432
  return Number(unquoted.replace(/\(.+\)/, ""));
}

function tokenize(line: string): string[] {
  return line.match(/'[^']*'|"[^"]*"|\S+/g) ?? [];
}

function isSymOpHeader(header: string): boolean {
  const t = header.toLowerCase();
  return (
    t.includes("symmetry_equiv_pos") || t.includes("symop_operation_xyz")
  );
}

/** Strips oxidation-state/charge suffixes (e.g. "Na1+" -> "Na", "O2-" -> "O"). */
function cleanSpeciesSymbol(raw: string | undefined): string {
  if (raw === undefined) return "";
  const unquoted = raw.replace(/^['"]+|['"]+$/g, "").trim();
  const m = unquoted.match(/^([A-Z][a-z]?)/);
  return m ? m[1] : unquoted;
}

/** Parses a CIF (Crystallographic Information File) string into a Structure. */
export function fromCIF(text: string): Structure {
  let a = 0;
  let b = 0;
  let c = 0;

  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let atomHeaders: string[] = [];
  const atomRows: string[][] = [];

  let inLoop = false;
  let currentHeaders: string[] = [];
  let collectingAtoms = false;
  let collectingSymOps = false;
  // Headers mention atom sites but the loop kind is only known once data
  // starts (coordinate loop vs. aniso/geom/etc.). Resolved per loop.
  let potentialAtoms = false;
  let loopIsAniso = false;
  const symOpStrings: string[] = [];

  function resetLoopState() {
    inLoop = false;
    collectingAtoms = false;
    collectingSymOps = false;
    potentialAtoms = false;
    loopIsAniso = false;
    currentHeaders = [];
  }

  const r = new LineReader(text);
  let rawLine: string | null;
  while ((rawLine = r.next()) !== null) {
    const line = rawLine.trim();
    if (!line) continue;

    // Comments and data/save blocks always terminate an active loop.
    if (line.startsWith("#")) continue;
    if (line.startsWith("data_") || line.startsWith("save_")) {
      resetLoopState();
      continue;
    }

    if (line === "loop_") {
      inLoop = true;
      currentHeaders = [];
      collectingAtoms = false;
      collectingSymOps = false;
      potentialAtoms = false;
      loopIsAniso = false;
      continue;
    }

    if (line.startsWith("_cell_length_a")) {
      a = cleanValue(tokenize(line)[1]);
    } else if (line.startsWith("_cell_length_b")) {
      b = cleanValue(tokenize(line)[1]);
    } else if (line.startsWith("_cell_length_c")) {
      c = cleanValue(tokenize(line)[1]);
    } else if (line.startsWith("_cell_angle_alpha")) {
      alpha = cleanValue(tokenize(line)[1]);
    } else if (line.startsWith("_cell_angle_beta")) {
      beta = cleanValue(tokenize(line)[1]);
    } else if (line.startsWith("_cell_angle_gamma")) {
      gamma = cleanValue(tokenize(line)[1]);
    }

    if (inLoop && line.startsWith("_")) {
      // A tag after data rows have started belongs outside the loop:
      // terminate the loop and treat it as a regular tag line.
      if (atomRows.length > 0 && collectingAtoms) {
        resetLoopState();
        continue;
      }
      if (symOpStrings.length > 0 && collectingSymOps) {
        resetLoopState();
        continue;
      }

      currentHeaders.push(line);

      if (isSymOpHeader(line)) {
        collectingSymOps = true;
        collectingAtoms = false;
        potentialAtoms = false;
      } else if (line.includes("_atom_site_aniso_")) {
        // Anisotropic displacement parameters for the same sites —
        // never coordinate data.
        loopIsAniso = true;
        collectingAtoms = false;
        potentialAtoms = false;
      } else if (line.includes("_atom_site_")) {
        // Could be the coordinate loop, but also matches geom loops
        // (e.g. `_geom_angle_atom_site_label_1`). Decided at data time.
        if (!loopIsAniso) potentialAtoms = true;
        collectingSymOps = false;
      }

      continue;
    }

    if (inLoop && potentialAtoms && !collectingAtoms) {
      // First data row of a candidate atom loop: only coordinate loops
      // (with fractional columns) are collected; aniso/geom/etc. ignored.
      const hasFract =
        currentHeaders.some((h) => h.includes("fract_x")) ||
        currentHeaders.some((h) => h.includes("fract_y")) ||
        currentHeaders.some((h) => h.includes("fract_z"));

      if (!hasFract || loopIsAniso) {
        potentialAtoms = false;
      } else {
        potentialAtoms = false;
        collectingAtoms = true;
        collectingSymOps = false;
      }
    }

    if (inLoop && collectingAtoms) {
      if (atomHeaders.length === 0) {
        atomHeaders = [...currentHeaders];
      }

      atomRows.push(tokenize(line));
    }

    if (inLoop && collectingSymOps) {
      // Symop rows look like `12 'x+1/2, y, -z'` or `x, y, z`.
      // Parse the whole line instead of individual tokens so unquoted
      // operations are not split apart.
      let s = line;
      const idMatch = s.match(/^\d+\s+(.*)$/);
      if (idMatch) s = idMatch[1].trim();
      s = s.replace(/^['"]+|['"]+$/g, "").trim();

      if (s.includes(",")) {
        symOpStrings.push(s);
      }
    }
  }

  const lattice = fromParameters(a, b, c, alpha, beta, gamma);

  const ix = atomHeaders.findIndex((x) => x.includes("fract_x"));

  const iy = atomHeaders.findIndex((x) => x.includes("fract_y"));

  const iz = atomHeaders.findIndex((x) => x.includes("fract_z"));

  const ispecies = atomHeaders.findIndex((x) => x.includes("type_symbol"));

  if (ix < 0 || iy < 0 || iz < 0 || ispecies < 0) {
    throw new Error("Missing required atom site columns");
  }

  const maxCol = Math.max(ix, iy, iz, ispecies);

  const asymSites = atomRows.map((row) => {
    if (row.length <= maxCol) {
      throw new Error("Incomplete atom site data row");
    }

    return {
      species: {
        symbol: cleanSpeciesSymbol(row[ispecies]),
      },

      frac: new Float64Array([
        cleanValue(row[ix]),
        cleanValue(row[iy]),
        cleanValue(row[iz]),
      ]),
    };
  });

  if (symOpStrings.length === 0) {
    return { lattice, sites: asymSites };
  }

  const symOps = parseOperations(symOpStrings);

  const EPS = 1e-3;

  function wrapValue(x: number): number {
    return ((x % 1) + 1) % 1;
  }

  function cleanNearZero(x: number): number {
    return Math.abs(x) < EPS ? 0 : x;
  }

  function posKey(species: string, frac: number[]): string {
    const w = frac.map((v) => {
      const c = cleanNearZero(wrapValue(v));
      return Math.round(c * 1000) / 1000;
    });

    return `${species}:${w[0]},${w[1]},${w[2]}`;
  }

  const seen = new Set<string>();
  const sites: { species: { symbol: string }; frac: Float64Array }[] = [];

  for (const site of asymSites) {
    for (const op of symOps) {
      const operated = applyOperation(op, Array.from(site.frac));

      const frac = [
        cleanNearZero(wrapValue(operated[0])),
        cleanNearZero(wrapValue(operated[1])),
        cleanNearZero(wrapValue(operated[2])),
      ];

      const key = posKey(site.species.symbol, frac);

      if (!seen.has(key)) {
        seen.add(key);

        sites.push({
          species: { symbol: site.species.symbol },
          frac: new Float64Array(frac),
        });
      }
    }
  }

  return {
    lattice,
    sites,
  };
}

/** Serializes a Structure to a CIF string. */
export function toCIF(structure: Structure, precision = 6): string {
  const p = parameters(structure.lattice);

  const lines: string[] = [];

  lines.push("data_matsci-parse");
  lines.push("");

  lines.push("_symmetry_space_group_name_H-M 'P 1'");
  lines.push("_symmetry_Int_Tables_number 1");

  lines.push("");

  lines.push(`_cell_length_a ${p[0].toFixed(precision)}`);

  lines.push(`_cell_length_b ${p[1].toFixed(precision)}`);

  lines.push(`_cell_length_c ${p[2].toFixed(precision)}`);

  lines.push(`_cell_angle_alpha ${p[3].toFixed(precision)}`);

  lines.push(`_cell_angle_beta ${p[4].toFixed(precision)}`);

  lines.push(`_cell_angle_gamma ${p[5].toFixed(precision)}`);

  lines.push("");

  lines.push("loop_");
  lines.push("_atom_site_label");
  lines.push("_atom_site_type_symbol");
  lines.push("_atom_site_fract_x");
  lines.push("_atom_site_fract_y");
  lines.push("_atom_site_fract_z");

  for (let i = 0; i < structure.sites.length; i++) {
    const site = structure.sites[i];

    lines.push(
      `${site.species.symbol}${i + 1} ` +
        `${site.species.symbol} ` +
        `${site.frac[0].toFixed(precision)} ` +
        `${site.frac[1].toFixed(precision)} ` +
        `${site.frac[2].toFixed(precision)}`,
    );
  }

  return lines.join("\n");
}
