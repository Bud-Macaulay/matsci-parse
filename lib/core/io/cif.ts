import { fromParameters } from "../lattice/create/fromParameters";
import { parameters } from "../lattice/parameters";
import { Structure } from "../structure/structure";
import { LineReader } from "./helpers";

function cleanValue(value: string | undefined): number {
  if (value === undefined) return NaN;

  // remove uncertainty notation:
  // 5.432(1) -> 5.432
  return Number(value.replace(/\(.+\)/, ""));
}

function tokenize(line: string): string[] {
  return line.match(/'[^']*'|"[^"]*"|\S+/g) ?? [];
}

function warnUnsupportedSymmetry(spaceGroup: string) {
  console.warn(
    `Space group "${spaceGroup}" detected. ` +
      `Symmetry operations are not currently applied; ` +
      `only asymmetric-unit sites will be parsed.`,
  );
}

/** Parses a CIF (Crystallographic Information File) string into a Structure. */
export function fromCIF(text: string): Structure {
  let a = 0;
  let b = 0;
  let c = 0;

  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let spaceGroup = "P1";

  let atomHeaders: string[] = [];
  const atomRows: string[][] = [];

  let inLoop = false;
  let currentHeaders: string[] = [];
  let collectingAtoms = false;

  const r = new LineReader(text);
  let rawLine: string | null;
  while ((rawLine = r.next()) !== null) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("_symmetry_space_group_name_H-M")) {
      const tokens = tokenize(line);
      spaceGroup = tokens.at(-1)?.replace(/['"]/g, "") ?? "P1";
    } else if (line.startsWith("_space_group_name_H-M_alt")) {
      const tokens = tokenize(line);
      spaceGroup = tokens.at(-1)?.replace(/['"]/g, "") ?? "P1";
    } else if (line.startsWith("_cell_length_a")) {
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
      continue;
    }

    if (inLoop && line.startsWith("_")) {
      currentHeaders.push(line);

      if (line.includes("_atom_site_")) {
        collectingAtoms = true;
      }

      continue;
    }

    if (inLoop && collectingAtoms) {
      if (atomHeaders.length === 0) {
        atomHeaders = [...currentHeaders];
      }

      atomRows.push(tokenize(line));
    }
  }

  const isP1 = /^P\s*1$/i.test(spaceGroup);

  if (!isP1) {
    warnUnsupportedSymmetry(spaceGroup);
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

  const sites = atomRows.map((row) => {
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
