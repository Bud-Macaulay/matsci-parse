import type { VaspIncarTags } from "./schema";

export type { VaspIncarTags } from "./schema";

/** A single INCAR value as written in the file. */
export type IncarValue =
  number | boolean | string | readonly number[] | readonly boolean[];

/**
 * INCAR options for {@link toINCAR}: the typed tags, plus `extra` for any tag
 * outside the typed schema.
 */
export interface VaspIncarOptions extends VaspIncarTags {
  /** Any other INCAR tags, written verbatim after the typed ones. */
  extra?: Readonly<Record<string, IncarValue>>;
}

// ──────────────────────────────────────────────────────────────────────
//  toINCAR
// ──────────────────────────────────────────────────────────────────────

/** Number to text, keeping the sign of -0 (String(-0) is "0"). */
function formatNumber(value: number): string {
  return Object.is(value, -0) ? "-0" : String(value);
}

function formatScalar(value: number | boolean | string): string {
  if (typeof value === "boolean") return value ? ".TRUE." : ".FALSE.";
  return typeof value === "number" ? formatNumber(value) : value;
}

/** Write a numeric array, compressing runs of equal values as `N*value`. */
function formatArray(values: readonly number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < values.length) {
    let j = i + 1;
    while (j < values.length && Object.is(values[j], values[i])) j++;
    const run = j - i;
    const text = formatNumber(values[i]);
    // A lone value is written as 1*value so it reads back as an array.
    parts.push(run > 1 || values.length === 1 ? `${run}*${text}` : text);
    i = j;
  }
  return parts.join(" ");
}

/** Write a logical array as space-separated T / F. */
function formatLogicalArray(values: readonly boolean[]): string {
  return values.map((v) => (v ? "T" : "F")).join(" ");
}

function formatValue(value: IncarValue): string {
  if (typeof value !== "object") return formatScalar(value);
  return value.length > 0 && typeof value[0] === "boolean"
    ? formatLogicalArray(value as readonly boolean[])
    : formatArray(value as readonly number[]);
}

/**
 * Serialize INCAR options to INCAR text: one `TAG = value` per line, typed
 * tags in the order given, then `extra`. Undefined and non-finite values are
 * skipped; booleans are written as `.TRUE.` / `.FALSE.`, arrays with runs
 * compressed as `N*value`.
 */
export function toINCAR(options: VaspIncarOptions): string {
  const { extra, ...tags } = options;
  const lines: string[] = [];

  for (const [key, value] of [
    ...Object.entries(tags),
    ...Object.entries(extra ?? {}),
  ]) {
    if (value === undefined) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    lines.push(`${key.toUpperCase()} = ${formatValue(value as IncarValue)}`);
  }

  return lines.join("\n") + "\n";
}

// ──────────────────────────────────────────────────────────────────────
//  fromINCAR
// ──────────────────────────────────────────────────────────────────────

const TRUE_TOKENS = new Set([".TRUE.", "T", ".T.", "TRUE"]);
const FALSE_TOKENS = new Set([".FALSE.", "F", ".F.", "FALSE"]);
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?$/;

/** Fortran reals may use `d` exponents (1d-6). */
function parseNumber(token: string): number | null {
  if (!NUMBER.test(token)) return null;
  return Number(token.replace(/[dD]/, "e"));
}

/** Expand `N*value` repeats; returns null if any token is not numeric. */
function parseNumbers(tokens: string[]): number[] | null {
  const out: number[] = [];
  for (const token of tokens) {
    const star = token.indexOf("*");
    if (star > 0) {
      const count = Number(token.slice(0, star));
      const value = parseNumber(token.slice(star + 1));
      if (!Number.isInteger(count) || count < 0 || value === null) return null;
      for (let i = 0; i < count; i++) out.push(value);
    } else {
      const value = parseNumber(token);
      if (value === null) return null;
      out.push(value);
    }
  }
  return out;
}

function parseValue(raw: string): IncarValue {
  const text = raw
    .trim()
    .replace(/^"(.*)"$/s, "$1")
    .trim();
  const tokens = text.split(/\s+/).filter(Boolean);

  const logicals = tokens.map((t) => {
    const upper = t.toUpperCase();
    return TRUE_TOKENS.has(upper)
      ? true
      : FALSE_TOKENS.has(upper)
        ? false
        : null;
  });
  if (tokens.length > 0 && logicals.every((v) => v !== null)) {
    return tokens.length === 1
      ? (logicals[0] as boolean)
      : (logicals as boolean[]);
  }

  const numbers = parseNumbers(tokens);
  if (numbers !== null && numbers.length > 0) {
    return numbers.length === 1 && !tokens[0].includes("*")
      ? numbers[0]
      : numbers;
  }

  return text;
}

/** Strip a `!` or `#` comment, ignoring markers inside double quotes. */
function stripComment(line: string): string {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (c === "!" || c === "#")) return line.slice(0, i);
  }
  return line;
}

/** Split on `;` statement separators outside double quotes. */
function splitStatements(text: string): string[] {
  const parts: string[] = [];
  let inQuotes = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') inQuotes = !inQuotes;
    else if (text[i] === ";" && !inQuotes) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Parse INCAR text into its tags, keys upper-cased.
 *
 * Handles `!` / `#` comments, several `TAG = value` statements per line
 * separated by `;`, `\` line continuations, double-quoted multi-line values,
 * `N*value` repeats, and `.TRUE.`/`T`/`.FALSE.`/`F` logicals (several
 * logicals give a boolean array, e.g. LATTICE_CONSTRAINTS). Without a
 * schema the parser cannot know a tag's declared type, so values are
 * returned as written: a single number stays a number (even for array tags
 * such as MAGMOM), several numbers or any `N*value` give an array, logicals
 * a boolean, anything else a string.
 */
export function fromINCAR(text: string): Record<string, IncarValue> {
  // Join continuation lines and quoted multi-line values into statements.
  const statements: string[] = [];
  let buffer = "";
  let inQuotes = false;

  for (const rawLine of text.split(/\r?\n/)) {
    let line = inQuotes ? rawLine : stripComment(rawLine);
    if ((line.match(/"/g)?.length ?? 0) % 2 === 1) inQuotes = !inQuotes;

    if (!inQuotes && line.trimEnd().endsWith("\\")) {
      buffer += line.trimEnd().slice(0, -1) + " ";
      continue;
    }

    buffer += line;
    if (inQuotes) {
      buffer += "\n";
      continue;
    }
    statements.push(...splitStatements(buffer));
    buffer = "";
  }
  if (buffer.trim()) statements.push(...splitStatements(buffer));

  const tags: Record<string, IncarValue> = {};
  for (const statement of statements) {
    const eq = statement.indexOf("=");
    if (eq === -1) continue;
    const key = statement.slice(0, eq).trim().toUpperCase();
    if (!key) continue;
    tags[key] = parseValue(statement.slice(eq + 1));
  }
  return tags;
}
