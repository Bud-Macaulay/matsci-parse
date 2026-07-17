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

  // remove uncertainty notation:
  // 5.432(1) -> 5.432
  return Number(value.replace(/\(.+\)/, ""));
}

function tokenize(line: string): string[] {
  return line.match(/'[^']*'|"[^"]*"|\S+/g) ?? [];
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
  const symOpStrings: string[] = [];

  const r = new LineReader(text);
  let rawLine: string | null;
  while ((rawLine = r.next()) !== null) {
    const line = rawLine.trim();
    if (!line) continue;

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
    } else if (line === "loop_") {
      inLoop = true;
      currentHeaders = [];
      collectingAtoms = false;
      collectingSymOps = false;
      continue;
    }

    if (inLoop && line.startsWith("_")) {
      currentHeaders.push(line);

      if (line.includes("_atom_site_")) {
        collectingAtoms = true;
        collectingSymOps = false;
      } else if (line.includes("_symmetry_equiv_pos_as_xyz")) {
        collectingSymOps = true;
        collectingAtoms = false;
      }

      continue;
    }

    if (inLoop && collectingAtoms) {
      if (atomHeaders.length === 0) {
        atomHeaders = [...currentHeaders];
      }

      atomRows.push(tokenize(line));
    }

    if (inLoop && collectingSymOps) {
      const tokens = tokenize(line);

      for (const t of tokens) {
        const cleaned = t.replace(/['"]/g, "").trim();

        if (cleaned.includes(",")) {
          symOpStrings.push(cleaned);
        }
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
        symbol: row[ispecies],
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
