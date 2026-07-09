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
    const line = end === -1 ? this.text.slice(this.pos) : this.text.slice(this.pos, end);
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
