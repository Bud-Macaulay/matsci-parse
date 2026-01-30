import { CrystalStructure } from "../crystal";
import { CartesianCoords, Site, hasSelectiveDynamics } from "../common";

/**
 * Convert a CrystalStructure to an (extended) XYZ string
 */
export function structureToXyz(structure: CrystalStructure): string {
  const lines: string[] = [];
  const n = structure.sites.length;
  lines.push(String(n));

  const useSelective = hasSelectiveDynamics(structure);

  const lat = structure.lattice;
  const latticeFlat = [
    lat[0][0],
    lat[1][0],
    lat[2][0],
    lat[0][1],
    lat[1][1],
    lat[2][1],
    lat[0][2],
    lat[1][2],
    lat[2][2],
  ].join(" ");

  const props = [
    "species:S:1",
    "pos:R:3",
    useSelective ? "selectiveDynamics:L:3" : null,
  ]
    .filter(Boolean)
    .join(":");

  lines.push(`Lattice="${latticeFlat}" Properties=${props}`);

  for (const site of structure.sites) {
    const el = structure.species[site.speciesIndex];
    const [x, y, z] = site.cart;

    let line = `${el} ${x.toFixed(10)} ${y.toFixed(10)} ${z.toFixed(10)}`;

    if (useSelective) {
      const flags = Array.isArray(site.props?.selectiveDynamics)
        ? site.props.selectiveDynamics
        : [true, true, true];

      line += " " + flags.map((f: boolean) => (f ? "T" : "F")).join(" ");
    }

    lines.push(line);
  }

  return lines.join("\n");
}

export function xyzToStructure(xyzString: string): CrystalStructure {
  const lines: string[] = xyzString
    .trim()
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  let i = 0;
  const natoms = parseInt(lines[i++], 10);
  if (!Number.isFinite(natoms))
    throw new Error("Invalid XYZ: first line must be atom count");

  const comment = lines[i++];
  const info: Record<string, string> = {};

  // regex to get all props in the header.
  const kvRegex = /(\w+)=(".*?"|\S+)/g;
  for (const match of comment.matchAll(kvRegex)) {
    let value = match[2];
    if (value.startsWith('"')) value = value.slice(1, -1);
    info[match[1]] = value;
  }

  let lattice: CartesianCoords[];
  if (info.Lattice) {
    const v = info.Lattice.split(/\s+/).map(Number);
    if (v.length !== 9) throw new Error("Invalid Lattice in extended XYZ");

    lattice = [
      [v[0], v[3], v[6]],
      [v[1], v[4], v[7]],
      [v[2], v[5], v[8]],
    ];
  } else {
    throw new Error("Lattice must be present in extended XYZ format");
  }

  // derive property positions
  let speciesOffset = 0;
  let posOffset = 1;
  let selectiveOffset: number | null = null;
  if (info.Properties) {
    const tokens = info.Properties.split(":");
    let offset = 0;
    for (let j = 0; j < tokens.length; j += 3) {
      const name = tokens[j];
      const count = parseInt(tokens[j + 2], 10);
      if (name === "species") speciesOffset = offset;
      if (name === "pos") posOffset = offset;
      if (name === "selectiveDynamics") selectiveOffset = offset;
      offset += count;
    }
  }

  const species: string[] = [];
  const speciesMap = new Map<string, number>();
  const sites: Site[] = [];

  // add properties to each site.
  for (let a = 0; a < natoms; a++) {
    const parts = lines[i++].split(/\s+/);
    const el = parts[speciesOffset];
    if (!speciesMap.has(el)) {
      speciesMap.set(el, species.length);
      species.push(el);
    }
    const speciesIndex = speciesMap.get(el)!;
    const cart = parts
      .slice(posOffset, posOffset + 3)
      .map(Number) as CartesianCoords;

    const props: Record<string, unknown> = {};

    if (selectiveOffset !== null) {
      const flags = parts
        .slice(selectiveOffset, selectiveOffset + 3)
        .map((x) => x.toUpperCase() === "T");

      if (flags.length === 3) {
        props.selectiveDynamics = flags;
      }
    }

    sites.push(new Site(speciesIndex, cart, props));
  }

  return new CrystalStructure({ lattice, species, sites });
}
