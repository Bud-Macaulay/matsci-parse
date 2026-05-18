import { createLattice, Lattice } from "../lattice/lattice";
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

export function fromXYZ(text: string) {
  const lines = text.trim().split("\n");

  const n = Number(lines[0]);
  const comment = lines[1];

  const info = parseHeader(comment);
  const lattice = parseLattice(info);

  const sites: Site[] = [];

  for (let i = 0; i < n; i++) {
    const [symbol, x, y, z] = lines[2 + i].split(/\s+/);

    sites.push({
      species: { symbol },
      frac: new Float64Array([+x, +y, +z]),
    });
  }

  return { lattice, sites };
}

function formatLattice(lattice: Lattice): string {
  const m = lattice.basis.data;

  // row-major flattening assumption (consistent with your matrix code)
  return `${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]} ${m[7]} ${m[8]}`;
}

export function toXYZ(structure: Structure): string {
  const sites = structure.sites;

  const lines: string[] = [];

  lines.push(String(sites.length));

  const latticeStr = formatLattice(structure.lattice);

  lines.push(`Lattice="${latticeStr}"`);

  for (const site of sites) {
    const f = site.frac;

    lines.push(`${site.species.symbol} ${f[0]} ${f[1]} ${f[2]}`);
  }

  return lines.join("\n");
}
