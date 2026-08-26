import { Structure } from "../structure";
import { gcd } from "../../math/numeric";
import { electronegativity } from "../../data/periodictable/electronegativity";

/**
 * Count each element's occurrences in the structure.
 * @param structure - Structure to evaluate.
 * @returns Map of element symbols to counts.
 */
export function composition(structure: Structure): Record<string, number> {
  const out: Record<string, number> = {};

  for (const site of structure.sites) {
    const symbol = site.species.symbol;

    out[symbol] ??= 0;
    out[symbol]++;
  }

  return out;
}

function compositionGCD(comp: Record<string, number>): number {
  const values = Object.values(comp);

  return values.reduce((a, b) => gcd(a, b));
}

function hillOrder(elements: string[]): string[] {
  if (!elements.includes("C")) {
    return [...elements].sort();
  }

  const rest = elements.filter((e) => e !== "C" && e !== "H").sort();

  return ["C", ...(elements.includes("H") ? ["H"] : []), ...rest];
}

function alphabeticalOrder(elements: string[]): string[] {
  return [...elements].sort();
}

function iupacOrder(elements: string[]): string[] {
  return [...elements].sort((a, b) => {
    const ea = electronegativity[a];
    const eb = electronegativity[b];

    if (ea === undefined && eb === undefined) return a.localeCompare(b);
    if (ea === undefined) return 1;
    if (eb === undefined) return -1;

    return ea - eb || a.localeCompare(b);
  });
}

function formulaFromComposition(
  comp: Record<string, number>,
  ordering: (elements: string[]) => string[],
): string {
  const elements = ordering(Object.keys(comp));

  return elements
    .map((el) => {
      const count = comp[el];

      return count === 1 ? el : `${el}${count}`;
    })
    .join("");
}

export function reducedComposition(
  comp: Record<string, number>,
): Record<string, number> {
  const factor = compositionGCD(comp);

  const out: Record<string, number> = {};

  for (const [element, count] of Object.entries(comp)) {
    out[element] = count / factor;
  }

  return out;
}

const SUBSCRIPT_DIGITS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

const SUBSCRIPT_TO_DIGIT: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

/** Label for anonymous formula ordering: 0 -> A, 25 -> Z, 26 -> AA, ... */
function anonymousLabel(index: number): string {
  let out = "";
  let n = index;

  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return out;
}

function formulaWithSubscripts(formula: string): string {
  return formula.replace(/\d+/g, (digits) =>
    Array.from(digits, (d) => SUBSCRIPT_DIGITS[Number(d)]).join(""),
  );
}

function anonymousFromComposition(comp: Record<string, number>): string {
  const entries = Object.entries(comp).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  return entries
    .map(([, count], i) => {
      const label = anonymousLabel(i);

      return count === 1 ? label : `${label}${count}`;
    })
    .join("");
}

function mergeInto(
  target: Record<string, number>,
  source: Record<string, number>,
  multiplier: number,
): void {
  for (const [element, count] of Object.entries(source)) {
    target[element] = (target[element] ?? 0) + count * multiplier;
  }
}

function tokenizeFormula(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
    } else if ("()[]{}".includes(ch)) {
      tokens.push(ch);
      i++;
    } else if (/[A-Z]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[a-z]/.test(text[j])) j++;
      tokens.push(text.slice(i, j));
      i = j;
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9]/.test(text[j])) j++;

      if (text[j] === "." && /[0-9]/.test(text[j + 1] ?? "")) {
        j++;
        while (j < text.length && /[0-9]/.test(text[j])) j++;
      }

      tokens.push(text.slice(i, j));
      i = j;
    } else {
      throw new Error(`Invalid character '${ch}' in formula`);
    }
  }

  return tokens;
}

function assertBalanced(text: string): void {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];

  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (ch === ")" || ch === "]" || ch === "}") {
      const top = stack.pop();

      if (top === undefined || pairs[top] !== ch) {
        throw new Error(`Unbalanced brackets in formula: ${text}`);
      }
    }
  }

  if (stack.length > 0) {
    throw new Error(`Unbalanced brackets in formula: ${text}`);
  }
}

function parseTokens(tokens: string[]): Record<string, number> {
  let idx = 0;
  const isNumber = (tok: string): boolean => /^[0-9]/.test(tok);

  function readCount(): number {
    const tok = tokens[idx];

    if (tok !== undefined && isNumber(tok)) {
      idx++;
      return Number(tok);
    }

    return 1;
  }

  function parseGroup(): Record<string, number> {
    const comp: Record<string, number> = {};
    let leading = 1;

    if (idx < tokens.length && isNumber(tokens[idx])) {
      leading = Number(tokens[idx]);
      idx++;
    }

    while (idx < tokens.length) {
      const tok = tokens[idx];

      if (tok === ")" || tok === "]" || tok === "}") break;

      if (tok === "(" || tok === "[" || tok === "{") {
        idx++;
        const inner = parseGroup();
        idx++;
        mergeInto(comp, inner, readCount());
        continue;
      }

      if (isNumber(tok)) {
        throw new Error(`Unexpected number '${tok}' in formula`);
      }

      const symbol = tok;
      idx++;
      comp[symbol] = (comp[symbol] ?? 0) + readCount();
    }

    if (leading !== 1) {
      for (const element of Object.keys(comp)) {
        comp[element] *= leading;
      }
    }

    return comp;
  }

  const result: Record<string, number> = {};

  while (idx < tokens.length) {
    mergeInto(result, parseGroup(), 1);

    if (idx < tokens.length) {
      throw new Error("Unbalanced brackets in formula");
    }
  }

  return result;
}

/**
 * Return the Hill-ordered chemical formula of a structure.
 * @param structure - Structure to evaluate.
 * @returns Hill-formula string.
 */
export function hillFormula(structure: Structure): string {
  return formulaFromComposition(composition(structure), hillOrder);
}

/**
 * Return the reduced Hill-ordered chemical formula.
 * @param structure - Structure to evaluate.
 * @returns Reduced formula string.
 */
export function reducedFormula(structure: Structure): string {
  return formulaFromComposition(
    reducedComposition(composition(structure)),
    hillOrder,
  );
}

/**
 * Return the alphabetically-ordered chemical formula.
 * @param structure - Structure to evaluate.
 * @returns Alphabetical-formula string.
 */
export function alphabeticalFormula(structure: Structure): string {
  return formulaFromComposition(composition(structure), alphabeticalOrder);
}

/**
 * Return the reduced alphabetically-ordered chemical formula.
 * @param structure - Structure to evaluate.
 * @returns Reduced alphabetical-formula string.
 */
export function reducedAlphabeticalFormula(structure: Structure): string {
  return formulaFromComposition(
    reducedComposition(composition(structure)),
    alphabeticalOrder,
  );
}

/**
 * Return the IUPAC-ordered chemical formula (by increasing electronegativity).
 * @param structure - Structure to evaluate.
 * @returns IUPAC-formula string.
 */
export function iupacFormula(structure: Structure): string {
  return formulaFromComposition(composition(structure), iupacOrder);
}

/**
 * Return the reduced IUPAC-ordered chemical formula.
 * @param structure - Structure to evaluate.
 * @returns Reduced IUPAC-formula string.
 */
export function reducedIUPACFormula(structure: Structure): string {
  return formulaFromComposition(
    reducedComposition(composition(structure)),
    iupacOrder,
  );
}

/**
 * Return an anonymous formula where elements are labeled A, B, C, ...
 * by decreasing abundance.
 * @param structure - Structure to evaluate.
 * @returns Anonymous-formula string.
 */
export function anonymousFormula(structure: Structure): string {
  return anonymousFromComposition(composition(structure));
}

/**
 * Return the reduced anonymous formula.
 * @param structure - Structure to evaluate.
 * @returns Reduced anonymous-formula string.
 */
export function reducedAnonymousFormula(structure: Structure): string {
  return anonymousFromComposition(reducedComposition(composition(structure)));
}

/**
 * Return the Hill-ordered formula with Unicode subscript digits.
 * @param structure - Structure to evaluate.
 * @returns Formula string with subscript digits.
 */
export function subscriptFormula(structure: Structure): string {
  return formulaWithSubscripts(
    formulaFromComposition(composition(structure), hillOrder),
  );
}

/**
 * Return the reduced Hill-ordered formula with Unicode subscript digits.
 * @param structure - Structure to evaluate.
 * @returns Reduced formula string with subscript digits.
 */
export function reducedSubscriptFormula(structure: Structure): string {
  return formulaWithSubscripts(
    formulaFromComposition(
      reducedComposition(composition(structure)),
      hillOrder,
    ),
  );
}

/**
 * Parse a chemical formula string into a composition.
 *
 * Supports element symbols, integer and decimal counts, nested bracket
 * groups (e.g. "(NH4)2SO4"), and dot/asterisk separated hydrate segments
 * (e.g. "CaSO4·2H2O" or "CaSO4*2H2O").
 * @param text - Formula string to parse.
 * @returns Map of element symbols to counts.
 */
export function parseFormula(text: string): Record<string, number> {
  if (text.trim().length === 0) {
    throw new Error("Formula string is empty");
  }

  const normalized = text.replace(/[₀-₉]/g, (ch) => SUBSCRIPT_TO_DIGIT[ch]);
  assertBalanced(normalized);

  const result: Record<string, number> = {};

  for (const segment of normalized.split(/[·*]/)) {
    if (segment.length === 0) continue;

    mergeInto(result, parseTokens(tokenizeFormula(segment)), 1);
  }

  return result;
}

/**
 * Count the total number of atoms (sites) in the structure.
 * @param structure - Structure to evaluate.
 * @returns Number of atoms.
 */
export function numAtoms(structure: Structure): number {
  return structure.sites.length;
}
