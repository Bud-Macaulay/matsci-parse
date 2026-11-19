import { SymbolToAtomicNumber } from "../data/periodictable/atomicData";
import { inverse } from "../lattice/inverse";
import { createLattice, Lattice } from "../lattice/lattice";
import { cartesian } from "../site/cartesian";
import { Site, SiteProperties } from "../site/site";
import { MoleculeBox, Structure } from "../structure/structure";
import { moleculeBox } from "./helpers";

// FHI-aims geometry.in: one keyword per line, "#" starts a comment.
//   lattice_vector x y z      (Å; three of them, or none for a molecule)
//   atom x y z Species        (Cartesian, Å)
//   atom_frac a b c Species   (fractional; needs the lattice vectors)
// and keywords that apply to the atom above them:
//   initial_moment m, initial_charge q, constrain_relaxation .true.|x|y|z
// Other keywords (velocity, hessian_block, symmetry_*, ...) are ignored.

/** The element of an FHI-aims species name: the name itself, or its leading element symbol ("Fe_up", "O1"). */
function elementOf(species: string): string {
  if (SymbolToAtomicNumber.has(species)) return species;
  const match = /^[A-Z][a-z]?/.exec(species);
  if (match && SymbolToAtomicNumber.has(match[0])) return match[0];
  if (match && SymbolToAtomicNumber.has(match[0][0])) return match[0][0];
  throw new Error(`Unknown element in FHI-aims species '${species}'`);
}

function numbers(tokens: string[], line: string): [number, number, number] {
  const v = tokens.slice(1, 4).map(Number);
  if (v.length < 3 || !v.every(Number.isFinite)) throw new Error(`Invalid numbers in '${line}'`);
  return v as [number, number, number];
}

/**
 * Parses an FHI-aims geometry.in string into a Structure. Without
 * `lattice_vector` lines the atoms form a molecule, put in a padded box as
 * {@link fromXYZ} does (`moleculeBox`).
 * @api
 */
export function fromAims(text: string): Structure {
  const vectors: number[][] = [];
  const atoms: {
    symbol: string;
    position: [number, number, number];
    fractional: boolean;
    properties: SiteProperties;
  }[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    const keyword = tokens[0].toLowerCase();
    const last = atoms[atoms.length - 1];

    if (keyword === "lattice_vector") {
      vectors.push(numbers(tokens, line));
    } else if (keyword === "atom" || keyword === "atom_frac") {
      const species = tokens[4];
      if (!species) throw new Error(`Missing species in '${line}'`);
      const symbol = elementOf(species);
      atoms.push({
        symbol,
        position: numbers(tokens, line),
        fractional: keyword === "atom_frac",
        // the species name when it is not just the element, e.g. "Fe_up"
        properties: species === symbol ? {} : { label: species },
      });
    } else if (keyword === "initial_moment" || keyword === "initial_charge") {
      if (!last) throw new Error(`'${keyword}' before any atom`);
      const value = Number(tokens[1]);
      if (!Number.isFinite(value)) throw new Error(`Invalid number in '${line}'`);
      last.properties[keyword] = value;
    } else if (keyword === "constrain_relaxation") {
      if (!last) throw new Error(`'${keyword}' before any atom`);
      // selectiveDynamics as in POSCAR: true = may move
      const free: [boolean, boolean, boolean] = last.properties.selectiveDynamics ?? [true, true, true];
      const what = (tokens[1] ?? "").toLowerCase();
      if (what === ".true.") free.fill(false);
      else if (what === "x" || what === "y" || what === "z") free["xyz".indexOf(what)] = false;
      else if (what !== ".false.") throw new Error(`Invalid constrain_relaxation in '${line}'`);
      last.properties.selectiveDynamics = free;
    }
  }

  if (atoms.length === 0) throw new Error("No atoms in FHI-aims geometry");
  if (vectors.length !== 0 && vectors.length !== 3) {
    throw new Error(`Expected 3 lattice_vector lines (or none for a molecule), found ${vectors.length}`);
  }

  let lattice: Lattice;
  let box: MoleculeBox | undefined;
  let origin = [0, 0, 0];
  if (vectors.length === 3) {
    lattice = createLattice(vectors.flat());
  } else {
    if (atoms.some((a) => a.fractional)) throw new Error("atom_frac without lattice_vector lines");
    ({ lattice, box } = moleculeBox(atoms.map((a) => a.position)));
    origin = [...box.origin];
  }

  const inv = inverse(lattice).data;
  const sites: Site[] = atoms.map(({ symbol, position, fractional, properties }) => {
    let frac: Float64Array;
    if (fractional) {
      frac = new Float64Array(position);
    } else {
      const [x, y, z] = position.map((p, k) => p - origin[k]);
      frac = new Float64Array([
        inv[0] * x + inv[3] * y + inv[6] * z,
        inv[1] * x + inv[4] * y + inv[7] * z,
        inv[2] * x + inv[5] * y + inv[8] * z,
      ]);
    }
    const site: Site = { species: { symbol }, frac };
    if (Object.keys(properties).length > 0) site.properties = properties;
    return site;
  });

  const constrained = sites.some((s) => s.properties?.selectiveDynamics);
  return {
    lattice,
    sites,
    ...(constrained && { selectiveDynamics: true }),
    ...(box && { moleculeBox: box }),
  };
}

/**
 * Serializes a Structure to an FHI-aims geometry.in string: lattice vectors
 * and Cartesian `atom` lines, or only the atoms for a molecule read without a
 * cell (`moleculeBox`, at the file's positions). Site properties
 * `initial_moment`, `initial_charge`, `selectiveDynamics` and `label` (the
 * species name) are written back.
 * @api
 */
export function toAims(structure: Structure): string {
  const lines: string[] = [];
  const origin = structure.moleculeBox?.origin ?? [0, 0, 0];

  if (!structure.moleculeBox) {
    const m = structure.lattice.basis.data;
    for (let i = 0; i < 3; i++) {
      lines.push(`lattice_vector ${m[3 * i]} ${m[3 * i + 1]} ${m[3 * i + 2]}`);
    }
  }

  for (const site of structure.sites) {
    const c = cartesian(structure.lattice, site);
    const p = site.properties ?? {};
    const species = p.label ?? site.species.symbol;
    lines.push(`atom ${c[0] + origin[0]} ${c[1] + origin[1]} ${c[2] + origin[2]} ${species}`);
    if (p.initial_moment !== undefined) lines.push(`    initial_moment ${p.initial_moment}`);
    if (p.initial_charge !== undefined) lines.push(`    initial_charge ${p.initial_charge}`);
    const free: boolean[] | undefined = p.selectiveDynamics;
    if (free && !free.some(Boolean)) {
      lines.push("    constrain_relaxation .true.");
    } else if (free) {
      free.forEach((f, k) => f || lines.push(`    constrain_relaxation ${"xyz"[k]}`));
    }
  }

  return lines.join("\n") + "\n";
}
