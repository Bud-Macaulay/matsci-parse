import { Structure } from "../structure";

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return Math.abs(a);
}

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

export function hillFormula(structure: Structure): string {
  return formulaFromComposition(composition(structure), hillOrder);
}

export function reducedFormula(structure: Structure): string {
  return formulaFromComposition(
    reducedComposition(composition(structure)),
    hillOrder,
  );
}
