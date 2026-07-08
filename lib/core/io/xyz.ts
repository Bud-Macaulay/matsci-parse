import { createLattice, Lattice } from "../lattice/lattice";
import { cartesian, fractional } from "../site";
import { Site } from "../site/site";
import { Structure } from "../structure/structure";

type ExtendedXYZInfo = Record<string, string>;

function parseHeader(comment: string): ExtendedXYZInfo {
  const info: ExtendedXYZInfo = {};
  const kvRegex = /(\w+)=(".*?"|\S+)/g;

  for (const match of comment.matchAll(kvRegex)) {
    let value = match[2];
    if (value.startsWith('"')) value = value.slice(1, -1);
    info[match[1]] = value;
  }

  return info;
}

function parseLattice(info: ExtendedXYZInfo) {
  if (!info.Lattice) {
    throw new Error("Extended XYZ must contain Lattice");
  }

  const v = info.Lattice.split(/\s+/).map(Number);
  if (v.length !== 9) throw new Error("Invalid Lattice");

  return createLattice([v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]]);
}

/** Parses an extended XYZ string into a Structure. */
export function fromXYZ(text: string) {
  const lines = text.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("XYZ file is too short");
  }

  const n = Number(lines[0]);

  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Invalid atom count in XYZ file");
  }

  const comment = lines[1];

  const info = parseHeader(comment);
  const lattice = parseLattice(info);

  const sites: Site[] = [];

  if (lines.length < 2 + n) {
    throw new Error("Atom count exceeds available lines in XYZ file");
  }

  for (let i = 0; i < n; i++) {
    const [symbol, x, y, z] = lines[2 + i].split(/\s+/);

    const cart = new Float64Array([+x, +y, +z]);

    const frac = fractional(lattice, cart);

    sites.push({
      species: { symbol },
      frac,
    });
  }

  return { lattice, sites };
}

function formatLattice(lattice: Lattice): string {
  const m = lattice.basis.data;

  // row-major flattening assumption (consistent with your matrix code)
  return `${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]} ${m[7]} ${m[8]}`;
}

/** Serializes a Structure to an extended XYZ string. */
export function toXYZ(structure: Structure): string {
  const lines: string[] = [];

  const sites = structure.sites;
  lines.push(String(sites.length));

  const latticeStr = formatLattice(structure.lattice);

  lines.push(`Lattice="${latticeStr}" Properties=species:S:1:pos:R:3`);

  for (const site of sites) {
    const cart = cartesian(structure.lattice, site);

    lines.push(`${site.species.symbol} ${cart[0]} ${cart[1]} ${cart[2]}`);
  }

  return lines.join("\n");
}
