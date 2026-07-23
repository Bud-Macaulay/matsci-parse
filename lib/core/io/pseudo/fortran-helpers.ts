/** Parse a Fortran-style number (D-notation) to a JS number. */
export function parseFortranNumber(s: string): number {
  return Number.parseFloat(s.replace(/[dD]/g, "e"));
}

/** Parse a Fortran-style boolean string. */
export function parseFortranBool(s: string): boolean {
  const v = s.trim().toLowerCase();
  return v === ".true." || v === "true" || v === "t";
}

/** Parse whitespace-separated text into a Float64Array. */
export function parseFloat64Array(text: string): Float64Array {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const arr = new Float64Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    arr[i] = parseFortranNumber(tokens[i]);
  }
  return arr;
}

/** Parse a string to integer, trimming whitespace. */
export function parseIntSafe(s: string): number {
  return Number.parseInt(s.trim(), 10);
}

/** Format a number in Fortran D-notation. */
export function formatFortranNumber(n: number, width = 20): string {
  const s = n.toExponential(15);
  const d = s.replace(/e/, "D").replace(/e\+/, "D+").replace(/e-/, "D-");
  return d.padStart(width);
}

/** Format a boolean as Fortran `.true.` / `.false.`. */
export function formatFortranBool(b: boolean): string {
  return b ? ".true." : ".false.";
}

/** Escape special characters for XML attribute values. */
export function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Format a Float64Array as columns of Fortran D-notation numbers. */
export function formatDataArray(arr: Float64Array, columns = 4): string {
  const lines: string[] = [];
  for (let i = 0; i < arr.length; i += columns) {
    const row: string[] = [];
    for (let j = 0; j < columns && i + j < arr.length; j++) {
      row.push(formatFortranNumber(arr[i + j]));
    }
    lines.push(row.join(" "));
  }
  return lines.join("\n");
}
