import { Structure } from "../structure";
import { gcd } from "../../math/numeric";

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

function reducedComposition(
  comp: Record<string, number>,
): Record<string, number> {
  const factor = compositionGCD(comp);

  const out: Record<string, number> = {};

  for (const [element, count] of Object.entries(comp)) {
    out[element] = count / factor;
  }

  return out;
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
