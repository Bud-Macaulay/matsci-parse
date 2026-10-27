import { Structure } from "../structure/structure";
import type { DisorderedStructure } from "../structure/disordered";

import { fromCIF } from "./cif";
import { fromPOSCAR } from "./poscar";
import { fromXSF } from "./xsf";
import { fromXYZ } from "./xyz";
import { fromPW } from "./pw";
import { fromPDB } from "./pdb";
import { fromGRO } from "./gro";
import { fromJSON } from "./json";
import { fromPymatgen } from "./pymatgen";
import { fromASE } from "./ase";
import { fromOptimade } from "./optimade";
import { fromStructureData } from "./structuredata";

/** Text formats. */
const TEXT_READERS = {
  cif: fromCIF,
  pw: (text: string) => fromPW(text),
  poscar: fromPOSCAR,
  xsf: fromXSF,
  xyz: fromXYZ,
  pdb: fromPDB,
  gro: fromGRO,
};

/** JSON formats, read from the parsed document. */
const JSON_READERS = {
  /** matsci-parse's own `toJSON` output. */
  json: fromJSON,
  pymatgen: fromPymatgen,
  ase: fromASE,
  /** A structure resource, or an API response holding one (the first is used). */
  optimade: (doc: any) =>
    fromOptimade(Array.isArray(doc.data) ? doc.data[0] : (doc.data ?? doc)),
  /** AiiDA StructureData attributes. */
  aiida: fromStructureData,
};

type TextFormat = keyof typeof TEXT_READERS;
type JsonFormat = keyof typeof JSON_READERS;

/** A structure format {@link parseStructure} can read. */
export type StructureFormat = TextFormat | JsonFormat;

const JSON_FORMATS = Object.keys(JSON_READERS) as JsonFormat[];

/** Every format {@link parseStructure} can read. */
const STRUCTURE_FORMATS = [
  ...Object.keys(TEXT_READERS),
  ...JSON_FORMATS,
] as StructureFormat[];

/** File extensions and other names for formats, lower case. */
const ALIASES: Record<string, StructureFormat[]> = {
  cif: ["cif"],
  mcif: ["cif"],
  pw: ["pw"],
  pwi: ["pw"],
  in: ["pw"],
  qe: ["pw"],
  poscar: ["poscar"],
  contcar: ["poscar"],
  vasp: ["poscar"],
  xsf: ["xsf"],
  xyz: ["xyz"],
  extxyz: ["xyz"],
  pdb: ["pdb"],
  gro: ["gro"],
  json: ["json"],
  pymatgen: ["pymatgen"],
  ase: ["ase"],
  optimade: ["optimade"],
  aiida: ["aiida"],
  structuredata: ["aiida"],
};

/**
 * Formats suggested by a file name: its extension, or VASP's fixed names.
 * `.json` says nothing about which JSON format, so the content decides.
 */
function formatsFromFileName(fileName: string): StructureFormat[] {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  if (/^(POSCAR|CONTCAR)/i.test(base)) return ["poscar"];
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  return ext === "json" ? [] : (ALIASES[ext] ?? []);
}

const isInteger = (line: string | undefined) => !!line && /^\d+$/.test(line);
const isNumbers = (line: string | undefined, n: number) => {
  const tokens = line?.split(/\s+/) ?? [];
  return tokens.length >= n && tokens.slice(0, n).every((t) => Number.isFinite(Number(t)));
};

/** Text formats the content looks like, most specific first. */
function formatsFromText(text: string): TextFormat[] {
  const formats: TextFormat[] = [];
  if (/^\s*&(control|system)\b/im.test(text) || /^\s*(ATOMIC_POSITIONS|CELL_PARAMETERS)\b/im.test(text))
    formats.push("pw");
  if (/^\s*data_/m.test(text) || /^\s*_(cell_length_a|atom_site_)/m.test(text)) formats.push("cif");
  if (/^\s*(PRIMVEC|PRIMCOORD)\b/m.test(text)) formats.push("xsf");
  if (/^(ATOM {2}|HETATM|CRYST1)/m.test(text)) formats.push("pdb");

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // XYZ: atom count first. GRO: a title, then the atom count.
  if (isInteger(lines[0])) formats.push("xyz");
  if (!isInteger(lines[0]) && isInteger(lines[1])) formats.push("gro");
  // POSCAR: a comment, the scale factor, then three lattice vectors.
  if (isNumbers(lines[1], 1) && [2, 3, 4].every((i) => isNumbers(lines[i], 3))) formats.push("poscar");
  return formats;
}

/** JSON formats the document looks like. */
function formatsFromJson(doc: any): JsonFormat[] {
  if (!doc || typeof doc !== "object") return [];
  const formats: JsonFormat[] = [];
  const site = Array.isArray(doc.sites) ? doc.sites[0] : undefined;
  if (Array.isArray(doc.lattice) && site?.frac) formats.push("json");
  if (doc["@class"] === "Structure" || (doc.lattice?.matrix && site?.abc)) formats.push("pymatgen");
  if (doc.__ase_objtype__ === "atoms" || doc.positions?.__ndarray__) formats.push("ase");
  const resource = Array.isArray(doc.data) ? doc.data[0] : (doc.data ?? doc);
  if (resource?.attributes?.lattice_vectors) formats.push("optimade");
  if (Array.isArray(doc.cell) && site?.kind_name !== undefined) formats.push("aiida");
  return formats;
}

/** Reject a "successful" parse that produced nothing usable. */
function checkParsed(structure: Structure | DisorderedStructure) {
  if (!structure?.sites?.length) throw new Error("no atoms found");
  if (!Array.from(structure.lattice.basis.data).every(Number.isFinite)) {
    throw new Error("invalid lattice");
  }
  for (const site of structure.sites) {
    if (!Array.from(site.frac).every(Number.isFinite)) {
      throw new Error("invalid atomic positions");
    }
  }
}

/** Options for {@link parseStructure}. */
export interface ParseStructureOptions {
  /**
   * The expected format, or a file extension (`"vasp"`, `"in"`, ...). Tried
   * first; if it fails, the format is inferred instead.
   */
  format?: string;
  /** File name; its extension (or a VASP name like `POSCAR`) is the next hint. */
  fileName?: string;
  /**
   * Only try the hinted formats (`format`, else `fileName`'s), never ones
   * inferred from the content. Default: false.
   */
  strict?: boolean;
}

/** A structure read by {@link parseStructure}, and the format it was read as. */
export interface ParsedStructure {
  format: StructureFormat;
  structure: Structure | DisorderedStructure;
}

/**
 * Formats {@link parseStructure} would try for this input, in order: the
 * `format` hint, the file name's, then those inferred from the content.
 */
function guessStructureFormats(
  text: string,
  { format, fileName, strict = false }: ParseStructureOptions = {},
): StructureFormat[] {
  const fromFormat = format ? (ALIASES[format.toLowerCase()] ?? []) : [];
  const fromFileName = fileName ? formatsFromFileName(fileName) : [];
  if (strict) return fromFormat.length > 0 ? fromFormat : fromFileName;

  const hinted = [...fromFormat, ...fromFileName];
  let json: unknown;
  const looksLikeJson = /^\s*[{[]/.test(text);
  if (looksLikeJson) {
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON after all */
    }
  }
  const inferred = json !== undefined ? formatsFromJson(json) : formatsFromText(text);
  return [...new Set([...hinted, ...inferred])];
}

/**
 * Read a structure from file contents in any supported format, e.g. a file
 * a user uploaded.
 *
 * The `format` hint is tried first, then the format implied by `fileName`,
 * then the formats the content looks like. The first that parses to at
 * least one atom with finite coordinates wins. Throws, listing every format
 * tried and why it failed, if none does. With `strict`, only the hinted
 * format is tried.
 *
 * Returns a DisorderedStructure for CIF and pymatgen input with partial
 * occupancies; narrow with `isDisordered`.
 *
 * @example
 * const { format, structure } = parseStructure(await file.text(), { fileName: file.name });
 * @api
 */
export function parseStructure(
  text: string,
  options: ParseStructureOptions = {},
): ParsedStructure {
  const candidates = guessStructureFormats(text, options);
  if (candidates.length === 0) {
    const what = options.strict
      ? `Unknown structure format '${options.format ?? options.fileName ?? ""}'`
      : "Unrecognised structure format";
    throw new Error(`${what} (supported: ${STRUCTURE_FORMATS.join(", ")})`);
  }

  let json: unknown;
  const failures: string[] = [];
  for (const format of candidates) {
    try {
      let structure: Structure | DisorderedStructure;
      if (format in JSON_READERS) {
        json ??= JSON.parse(text);
        structure = JSON_READERS[format as JsonFormat](json as any);
      } else {
        structure = TEXT_READERS[format as TextFormat](text);
      }
      checkParsed(structure);
      return { format, structure };
    } catch (err) {
      failures.push(`${format}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Could not read the structure. Tried ${failures.join("; ")}`);
}
