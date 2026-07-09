import { createLattice } from "../lattice/lattice";
import { inverse } from "../lattice/inverse";
import { cartesian } from "../site/cartesian";
import { Site } from "../site/site";
import { Structure } from "../structure/structure";
import { LineReader } from "./helpers";

function nextSectionLine(r: LineReader, section: string): void {
  let line: string | null;
  while ((line = r.next()) !== null) {
    if (line.trim().toUpperCase() === section) return;
  }
  throw new Error(`Missing ${section}`);
}

// TODO: support atomic numbers instead of symbols in primvec.

/** Parses an XSF (XCrySDen Structure Format) string into a Structure. */
export function fromXSF(text: string): Structure {
  const r = new LineReader(text);

  nextSectionLine(r, "PRIMVEC");

  const lattice = createLattice([
    ...r.nextTrimmed().split(/\s+/).map(Number),
    ...r.nextTrimmed().split(/\s+/).map(Number),
    ...r.nextTrimmed().split(/\s+/).map(Number),
  ]);

  nextSectionLine(r, "PRIMCOORD");

  const countLine = r.nextTrimmed();
  const [nAtoms] = countLine.split(/\s+/).map(Number);

  if (!Number.isInteger(nAtoms) || nAtoms < 0) {
    throw new Error("Invalid atom count in PRIMCOORD");
  }

  const invData = inverse(lattice).data;

  const sites: Site[] = [];

  for (let i = 0; i < nAtoms; i++) {
    const tokens = r.nextTrimmed().split(/\s+/);

    const symbol = tokens[0];

    const x = Number(tokens[1]);
    const y = Number(tokens[2]);
    const z = Number(tokens[3]);

    sites.push({
      species: { symbol },
      // inlined frac conv for perf.
      frac: new Float64Array([
        invData[0] * x + invData[3] * y + invData[6] * z,
        invData[1] * x + invData[4] * y + invData[7] * z,
        invData[2] * x + invData[5] * y + invData[8] * z,
      ]),
    });
  }

  return {
    lattice,
    sites,
  };
}

function formatVec(v: number[]): string {
  return `${v[0]} ${v[1]} ${v[2]}`;
}

function formatLattice(lattice: Structure["lattice"]): string[] {
  const m = lattice.basis.data;

  return [
    formatVec([m[0], m[1], m[2]]),
    formatVec([m[3], m[4], m[5]]),
    formatVec([m[6], m[7], m[8]]),
  ];
}

/** Serializes a Structure to an XSF string. */
export function toXSF(structure: Structure): string {
  const lines: string[] = [];

  lines.push("CRYSTAL");
  lines.push("PRIMVEC");

  const latticeLines = formatLattice(structure.lattice);
  lines.push(...latticeLines);
  lines.push("PRIMCOORD");
  lines.push(`${structure.sites.length} 1`);

  for (const site of structure.sites) {
    const c = cartesian(structure.lattice, site);
    lines.push(`${site.species.symbol} ${c[0]} ${c[1]} ${c[2]}`);
  }

  return lines.join("\n");
}
