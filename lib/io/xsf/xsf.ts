import { CrystalStructure } from "../crystal";
import { CartesianCoords, Site } from "../common";

/* 
derived from XCrySDen documentation: www.xcrysden.org/doc/XSF.html
*/

export function structureToXsf(structure: CrystalStructure): string {
  const lines: string[] = [];

  lines.push("CRYSTAL");
  lines.push("PRIMVEC");

  // lattice vectors
  structure.lattice.forEach((v: CartesianCoords) => {
    lines.push(v.map((x) => x.toFixed(10)).join(" "));
  });

  lines.push("PRIMCOORD");

  // first line: number of atoms, 1 = Cartesian
  lines.push(`${structure.numSites} 1`);

  // atomic positions
  structure.sites.forEach((s: Site) => {
    const element = structure.species[s.speciesIndex];
    lines.push(`${element} ${s.cart.map((x) => x.toFixed(10)).join(" ")}`);
  });

  return lines.join("\n");
}

export function xsfToStructure(xsfString: string): CrystalStructure {
  const lines = xsfString
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lattice: CartesianCoords[] = [];
  const species: string[] = [];
  const sites: Site[] = [];
  let i = 0;

  // skip to PRIMVEC
  while (i < lines.length && lines[i].toUpperCase() !== "PRIMVEC") i++;
  if (i === lines.length) throw new Error("PRIMVEC block not found in XSF");
  i++;

  // read 3 lattice vectors
  for (let j = 0; j < 3; j++) {
    lattice.push(lines[i++].split(/\s+/).map(Number) as CartesianCoords);
  }

  // skip to PRIMCOORD
  while (i < lines.length && lines[i].toUpperCase() !== "PRIMCOORD") i++;
  if (i === lines.length) throw new Error("PRIMCOORD block not found in XSF");
  i++;

  // read number of atoms
  const [numAtoms] = lines[i++].split(/\s+/).map(Number);

  for (let n = 0; n < numAtoms; n++) {
    const parts = lines[i++].split(/\s+/);
    const element = parts[0];
    const cart = parts.slice(1, 4).map(Number) as CartesianCoords;

    // add element to species list if not already
    let speciesIndex = species.indexOf(element);
    if (speciesIndex === -1) {
      species.push(element);
      speciesIndex = species.length - 1;
    }

    sites.push(new Site(speciesIndex, cart));
  }

  return new CrystalStructure({ lattice, species, sites });
}
