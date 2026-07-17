export interface SymmetryOperation {
  matrix: number[][];
  translation: number[];
}

function parseFraction(s: string): number {
  const trimmed = s.trim();

  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);
    return num / den;
  }

  return Number(trimmed);
}

function parseComponent(expr: string): { coeffs: number[]; offset: number } {
  const cleaned = expr.replace(/\s+/g, "");
  let offset = 0;
  const coeffs = [0, 0, 0];

  const terms = cleaned.match(/[+-]?[^+-]+/g) ?? [];

  const VAR_INDEX: Record<string, number> = { x: 0, y: 1, z: 2 };

  for (const term of terms) {
    const t = term.trim();

    if (t.length > 0 && VAR_INDEX[t.at(-1)!] !== undefined) {
      const idx = VAR_INDEX[t.at(-1)!];
      const sign = t.startsWith("-") ? -1 : 1;

      coeffs[idx] += sign;
    } else {
      const frac = t.match(/([+-]?\d+\s*\/\s*\d+)/);

      if (frac) {
        offset += parseFraction(frac[1].replace(/\s/g, ""));
      } else {
        const val = Number(t);

        if (!isNaN(val)) {
          offset += val;
        }
      }
    }
  }

  return { coeffs, offset };
}

/** Parse a single symmetry operation string like '-y, x, z+1/2' into a matrix + translation.
 * @param op - The operation string (e.g. '-y, x, z+1/2').
 * @returns A SymmetryOperation with 3x3 matrix and translation vector. */
export function parseOperation(op: string): SymmetryOperation {
  const components = op.split(",").map((s) => parseComponent(s));

  return {
    matrix: components.map((c) => c.coeffs),
    translation: components.map((c) => c.offset),
  };
}

/** Parse all symmetry operation strings from a CIF _symmetry_equiv_pos_as_xyz loop.
 * @param ops - Array of operation strings (e.g. ["x, y, z", "-x, -y, z"]).
 * @returns Array of SymmetryOperation objects. */
export function parseOperations(ops: string[]): SymmetryOperation[] {
  return ops.map(parseOperation);
}

/** Apply a symmetry operation to fractional coordinates.
 * @param op - The symmetry operation.
 * @param frac - Fractional coordinates [x, y, z].
 * * @returns New fractional coordinates after applying the operation. */
export function applyOperation(
  op: SymmetryOperation,
  frac: number[],
): number[] {
  const result = [0, 0, 0];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i] += op.matrix[i][j] * frac[j];
    }

    result[i] += op.translation[i];
  }

  return result;
}
