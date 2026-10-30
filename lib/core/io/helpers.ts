import { createLattice, Lattice } from "../lattice/lattice";
import type { MoleculeBox } from "../structure/structure";

/**
 * Reads lines from a string one at a time, without pre-splitting into an array.
 */
export class LineReader {
  private pos = 0;
  /** Number of lines returned so far (including blank lines). */
  count = 0;

  constructor(private readonly text: string) {}

  /** Return the next line (without the newline character), or `null` at EOF. */
  next(): string | null {
    if (this.pos >= this.text.length) return null;
    const end = this.text.indexOf("\n", this.pos);
    const line =
      end === -1 ? this.text.slice(this.pos) : this.text.slice(this.pos, end);
    this.pos = end === -1 ? this.text.length : end + 1;
    this.count++;
    return line;
  }

  /** Return a trimmed line, or throw on unexpected EOF. */
  nextTrimmed(): string {
    const line = this.next();
    if (line === null) throw new Error("Unexpected EOF");
    return line.trim();
  }
}

/** Vacuum (Å) on each side of a molecule read from a file without a cell. */
export const MOLECULE_PADDING = 10.0;

/** The box of a molecule from a file without a cell: its bounding box plus
 * MOLECULE_PADDING on each side (at least 1 Å along each axis). Positions
 * are shifted by -box.origin into it. */
export function moleculeBox(positions: ArrayLike<number>[]): {
  lattice: Lattice;
  box: MoleculeBox;
} {
  const min = [0, 1, 2].map((k) => Math.min(...positions.map((p) => p[k])));
  const max = [0, 1, 2].map((k) => Math.max(...positions.map((p) => p[k])));
  const [a, b, c] = [0, 1, 2].map((k) =>
    Math.max(max[k] - min[k] + 2 * MOLECULE_PADDING, 1.0),
  );

  return {
    lattice: createLattice([a, 0, 0, 0, b, 0, 0, 0, c]),
    box: {
      padding: MOLECULE_PADDING,
      origin: [
        min[0] - MOLECULE_PADDING,
        min[1] - MOLECULE_PADDING,
        min[2] - MOLECULE_PADDING,
      ],
    },
  };
}
