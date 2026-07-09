import { createLattice, Lattice } from "../lattice/lattice";
import { inverse } from "../lattice/inverse";
import { cartesian } from "../site";
import { Site } from "../site/site";
import { Structure } from "../structure/structure";
import { LineReader } from "./helpers";

type ExtendedXYZInfo = Record<string, string>;

type PropDef = {
  name: string;
  type: string;
  count: number;
  offset: number;
};

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

function parseProperties(propStr: string): PropDef[] {
  const parts = propStr.split(":");
  const props: PropDef[] = [];
  let offset = 0;

  for (let i = 0; i < parts.length; i += 3) {
    const count = Number(parts[i + 2]);
    props.push({
      name: parts[i],
      type: parts[i + 1],
      count,
      offset,
    });
    offset += count;
  }

  return props;
}

/** Parses an extended XYZ string into a Structure. */
export function fromXYZ(text: string): Structure {
  const r = new LineReader(text);

  // skip leading blank lines
  let line: string | null;
  do {
    line = r.next();
  } while (line !== null && line.trim().length === 0);

  if (line === null) throw new Error("XYZ file is too short");

  const n = Number(line.trim());

  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Invalid atom count in XYZ file");
  }

  const comment = r.next();
  if (comment === null) throw new Error("XYZ file is too short");

  const info = parseHeader(comment);
  const lattice = parseLattice(info);

  const propDefs = info.Properties
    ? parseProperties(info.Properties)
    : [
        { name: "species", type: "S", count: 1, offset: 0 },
        { name: "pos", type: "R", count: 3, offset: 1 },
      ];

  const sites: Site[] = [];

  let hasSelective = false;

  const invData = inverse(lattice).data;

  for (let i = 0; i < n; i++) {
    const atomLine = r.next();
    if (atomLine === null)
      throw new Error("Atom count exceeds available lines in XYZ file");

    const tokens = atomLine.trim().split(/\s+/);

    let symbol = "";
    let x = 0,
      y = 0,
      z = 0;
    const props: Record<string, unknown> = {};

    for (const def of propDefs) {
      const values = tokens.slice(def.offset, def.offset + def.count);

      if (def.name === "species") {
        symbol = values[0];
      } else if (def.name === "pos") {
        x = Number(values[0]);
        y = Number(values[1]);
        z = Number(values[2]);
      } else if (def.name === "selectiveDynamics") {
        const sd = values.map((v: string) => v.toLowerCase() === "t") as [
          boolean,
          boolean,
          boolean,
        ];
        props.selectiveDynamics = sd;
        hasSelective = true;
      } else {
        if (def.type === "L") {
          props[def.name] = values.map((v: string) => v.toLowerCase() === "t");
        } else if (def.type === "R" || def.type === "I") {
          props[def.name] = values.map(Number);
        } else {
          props[def.name] = values.length === 1 ? values[0] : values;
        }
      }
    }

    if (!symbol) throw new Error("Missing species in XYZ");
    if (!z && z !== 0) throw new Error("Invalid coordinates in XYZ");

    const site: Site = {
      species: { symbol },
      // inlined site conv for perf.
      frac: new Float64Array([
        invData[0] * x + invData[3] * y + invData[6] * z,
        invData[1] * x + invData[4] * y + invData[7] * z,
        invData[2] * x + invData[5] * y + invData[8] * z,
      ]),
    };

    if (Object.keys(props).length > 0) {
      site.properties = props;
    }

    sites.push(site);
  }

  return {
    lattice,
    sites,
    selectiveDynamics: hasSelective || undefined,
  };
}

function formatLattice(lattice: Lattice): string {
  const m = lattice.basis.data;

  return `${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]} ${m[7]} ${m[8]}`;
}

/** Serializes a Structure to an extended XYZ string. */
export function toXYZ(structure: Structure): string {
  const lines: string[] = [];

  const sites = structure.sites;
  lines.push(String(sites.length));

  const latticeStr = formatLattice(structure.lattice);

  const propParts: string[] = ["species", "S", "1", "pos", "R", "3"];
  const hasSelective =
    structure.selectiveDynamics ??
    sites.some((s) => s.properties?.selectiveDynamics);

  if (hasSelective) {
    propParts.push("selectiveDynamics", "L", "3");
  }

  lines.push(`Lattice="${latticeStr}" Properties=${propParts.join(":")}`);

  for (const site of sites) {
    const cart = cartesian(structure.lattice, site);
    let line = `${site.species.symbol} ${cart[0]} ${cart[1]} ${cart[2]}`;

    const sd = site.properties?.selectiveDynamics;

    if (sd) {
      line += ` ${sd.map((f: boolean) => (f ? "T" : "F")).join(" ")}`;
    }

    lines.push(line);
  }

  return lines.join("\n");
}
