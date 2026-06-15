import { createLattice } from "../lattice/lattice";
import { fractional } from "../site/fractional";
import { cartesian } from "../site/cartesian";
import { Site } from "../site/site";
import { Structure } from "../structure/structure";

function findSection(lines: string[], section: string): number {
  const idx = lines.findIndex((line) => line.trim().toUpperCase() === section);

  if (idx === -1) {
    throw new Error(`Missing ${section}`);
  }

  return idx;
}

// TODO: support atomic numbers instead of symbols in primvec.

export function fromXSF(text: string): Structure {
  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const vecStart = findSection(lines, "PRIMVEC");

  const lattice = createLattice([
    ...lines[vecStart + 1].split(/\s+/).map(Number),
    ...lines[vecStart + 2].split(/\s+/).map(Number),
    ...lines[vecStart + 3].split(/\s+/).map(Number),
  ]);

  const coordStart = findSection(lines, "PRIMCOORD");

  const [nAtoms] = lines[coordStart + 1].split(/\s+/).map(Number);

  const sites: Site[] = [];

  for (let i = 0; i < nAtoms; i++) {
    const tokens = lines[coordStart + 2 + i].split(/\s+/);

    const symbol = tokens[0];

    const x = Number(tokens[1]);
    const y = Number(tokens[2]);
    const z = Number(tokens[3]);

    const frac = fractional(lattice, new Float64Array([x, y, z]));

    sites.push({
      species: { symbol },
      frac,
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
