import { CrystalStructure } from "../crystal";
import { CartesianCoords, Site } from "../common";
import { stringToLines } from "../utils";

import { cellLengthsAnglesToLattice, fractionalToCartesian } from "../math";

function dot(a: CartesianCoords, b: CartesianCoords): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(v: CartesianCoords): number {
  return Math.sqrt(dot(v, v));
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function cartesianToFractional(
  cart: CartesianCoords,
  lattice: CartesianCoords[],
): CartesianCoords {
  const [a, b, c] = lattice;

  // column-major lattice matrix
  const det =
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0]);

  if (Math.abs(det) < 1e-12) {
    throw new Error("Singular lattice matrix");
  }

  const inv = [
    [
      (b[1] * c[2] - b[2] * c[1]) / det,
      (a[2] * c[1] - a[1] * c[2]) / det,
      (a[1] * b[2] - a[2] * b[1]) / det,
    ],
    [
      (b[2] * c[0] - b[0] * c[2]) / det,
      (a[0] * c[2] - a[2] * c[0]) / det,
      (a[2] * b[0] - a[0] * b[2]) / det,
    ],
    [
      (b[0] * c[1] - b[1] * c[0]) / det,
      (a[1] * c[0] - a[0] * c[1]) / det,
      (a[0] * b[1] - a[1] * b[0]) / det,
    ],
  ];

  return [
    cart[0] * inv[0][0] + cart[1] * inv[1][0] + cart[2] * inv[2][0],
    cart[0] * inv[0][1] + cart[1] * inv[1][1] + cart[2] * inv[2][1],
    cart[0] * inv[0][2] + cart[1] * inv[1][2] + cart[2] * inv[2][2],
  ];
}

export function structureToCif(structure: CrystalStructure): string {
  const [aVec, bVec, cVec] = structure.lattice;

  const a = norm(aVec);
  const b = norm(bVec);
  const c = norm(cVec);

  const alpha = radToDeg(Math.acos(dot(bVec, cVec) / (b * c)));
  const beta = radToDeg(Math.acos(dot(aVec, cVec) / (a * c)));
  const gamma = radToDeg(Math.acos(dot(aVec, bVec) / (a * b)));

  let cif = `data_made_with_matsci-parse
    _symmetry_space_group_name_H-M   'P 1'
    _symmetry_Int_Tables_number    1

    _cell_length_a   ${a.toFixed(6)}
    _cell_length_b   ${b.toFixed(6)}
    _cell_length_c   ${c.toFixed(6)}
    _cell_angle_alpha   ${alpha.toFixed(6)}
    _cell_angle_beta    ${beta.toFixed(6)}
    _cell_angle_gamma   ${gamma.toFixed(6)}

    loop_
    _atom_site_label
    _atom_site_type_symbol
    _atom_site_fract_x
    _atom_site_fract_y
    _atom_site_fract_z
`;

  structure.sites.forEach((site, i) => {
    const el = structure.species[site.speciesIndex];
    const f = cartesianToFractional(site.cart, structure.lattice);

    cif += `${el}${i + 1} ${el} ${f[0].toFixed(6)} ${f[1].toFixed(
      6,
    )} ${f[2].toFixed(6)}\n`;
  });

  return cif;
}

export function cifToStructure(cifString: string): CrystalStructure {
  const lines = stringToLines(cifString);

  // --- Parse unit cell parameters ---
  let a = 0,
    b = 0,
    c = 0;
  let alpha = 0,
    beta = 0,
    gamma = 0;

  const atomRows: string[][] = [];
  let inLoop = false;
  let loopHeaders: string[] = [];

  for (const line of lines) {
    if (line.startsWith("_cell_length_a")) a = parseFloat(line.split(/\s+/)[1]);
    else if (line.startsWith("_cell_length_b"))
      b = parseFloat(line.split(/\s+/)[1]);
    else if (line.startsWith("_cell_length_c"))
      c = parseFloat(line.split(/\s+/)[1]);
    else if (line.startsWith("_cell_angle_alpha"))
      alpha = parseFloat(line.split(/\s+/)[1]);
    else if (line.startsWith("_cell_angle_beta"))
      beta = parseFloat(line.split(/\s+/)[1]);
    else if (line.startsWith("_cell_angle_gamma"))
      gamma = parseFloat(line.split(/\s+/)[1]);
    // --- Detect loop of atom sites ---
    else if (line.startsWith("loop_")) {
      inLoop = true;
      loopHeaders = [];
    } else if (inLoop && line.startsWith("_")) {
      loopHeaders.push(line);
    } else if (inLoop && line && !line.startsWith("_")) {
      atomRows.push(line.split(/\s+/));
    }
  }

  const lattice = cellLengthsAnglesToLattice(a, b, c, alpha, beta, gamma);

  const species: string[] = [];
  const sites: Site[] = [];

  const idxX = loopHeaders.findIndex((h) => h.includes("fract_x"));
  const idxY = loopHeaders.findIndex((h) => h.includes("fract_y"));
  const idxZ = loopHeaders.findIndex((h) => h.includes("fract_z"));
  const idxType = loopHeaders.findIndex((h) => h.includes("type_symbol"));

  if (idxX < 0 || idxY < 0 || idxZ < 0 || idxType < 0) {
    throw new Error("CIF missing required _atom_site columns");
  }

  for (const row of atomRows) {
    const fract: CartesianCoords = [
      parseFloat(row[idxX]),
      parseFloat(row[idxY]),
      parseFloat(row[idxZ]),
    ];

    const cart = fractionalToCartesian(fract, lattice);

    let speciesIndex = species.indexOf(row[idxType]);
    if (speciesIndex === -1) {
      speciesIndex = species.length;
      species.push(row[idxType]);
    }

    sites.push(new Site(speciesIndex, cart));
  }

  return new CrystalStructure({ lattice, species, sites });
}
