/**
 * Quantum ESPRESSO Fortran namelist parser.
 *
 * Parses QE-style namelists (`&NAME ... /`) from input text.
 * Supports strings, reals (including Fortran D notation),
 * logicals, integers, and array syntax `key(i) = value`.
 */

export interface QeNamelist {
  /** Namelist block name (uppercase). */
  name: string;
  /** Key → raw string value (keys stored lowercase). */
  values: Map<string, string>;
}

function convertFortranReal(s: string): string {
  const v = s.replace(/[dD]/g, "e");
  return String(Number.parseFloat(v));
}

function convertValue(raw: string): string {
  const trimmed = raw.trim();

  // quoted string
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  // logical
  if (/^\.(?:true|false)\.$/i.test(trimmed)) {
    return trimmed.toLowerCase() === ".true." ? "true" : "false";
  }

  // Fortran D-notation real
  if (/[dD]/.test(trimmed)) {
    return convertFortranReal(trimmed);
  }

  return trimmed;
}

/**
 * Parse a single QE namelist block from lines.
 * Returns the namelist and the index after the closing `/`.
 */
function parseOne(
  lines: string[],
  start: number,
): { namelist: QeNamelist; end: number } | null {
  const openLine = lines[start].trim();

  const openMatch = openLine.match(/^&(\w+)/i);
  if (!openMatch) return null;

  const name = openMatch[1].toUpperCase();
  const values = new Map<string, string>();

  for (let i = start + 1; i < lines.length; i++) {
    let line = lines[i];

    // strip inline comments
    const commentIdx = line.indexOf("!");
    if (commentIdx >= 0) line = line.slice(0, commentIdx);

    // closing slash
    if (/^\//.test(line.trim())) {
      return { namelist: { name, values }, end: i };
    }

    // key = value pairs (commas optional)
    const pairs = line.split(",");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx < 0) continue;

      const key = pair.slice(0, eqIdx).trim().toLowerCase();
      const raw = pair.slice(eqIdx + 1);

      if (!key) continue;

      // check for array syntax: key(i)
      const arrMatch = key.match(/^(\w+)\((\d+)\)$/);
      const storeKey = arrMatch ? `${arrMatch[1]}(${arrMatch[2]})` : key;

      values.set(storeKey, convertValue(raw));
    }
  }

  // unterminated namelist
  return { namelist: { name, values }, end: lines.length };
}

/**
 * Parse all QE namelists from input text.
 * Returns namelists in order of appearance.
 */
export function parseQeNamelist(text: string): QeNamelist[] {
  const lines = text.split("\n");
  const result: QeNamelist[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*&\w+/.test(lines[i])) {
      const parsed = parseOne(lines, i);
      if (parsed) {
        result.push(parsed.namelist);
        i = parsed.end;
      }
    }
  }

  return result;
}

/** Find a namelist block by name. */
function findBlock(
  namelists: QeNamelist[],
  block: string,
): QeNamelist | undefined {
  const upper = block.toUpperCase();
  return namelists.find((n) => n.name === upper);
}

/** Get a raw string value from a namelist block. */
export function getString(
  namelists: QeNamelist[],
  block: string,
  key: string,
): string | undefined {
  return findBlock(namelists, block)?.values.get(key.toLowerCase());
}

/** Get a numeric value from a namelist block. */
export function getNumber(
  namelists: QeNamelist[],
  block: string,
  key: string,
): number | undefined {
  const raw = getString(namelists, block, key);
  if (raw === undefined) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** Get an array value (e.g. celldm(1)..celldm(6)) from a namelist block. */
export function getArray(
  namelists: QeNamelist[],
  block: string,
  key: string,
  size: number,
): number[] {
  const lower = key.toLowerCase();
  const result: number[] = [];
  for (let i = 1; i <= size; i++) {
    const raw = getString(namelists, block, `${lower}(${i})`);
    if (raw !== undefined) {
      result.push(Number.parseFloat(raw));
    } else {
      result.push(0);
    }
  }
  return result;
}
