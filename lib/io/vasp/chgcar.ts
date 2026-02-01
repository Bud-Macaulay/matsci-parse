import { CrystalStructure } from "../crystal";
import { parsePoscar } from "./poscar";
import { VolumetricData } from "../volumetric";
import type { CartesianCoords, GridShape } from "../common";

function cellVolume(lattice: CartesianCoords[]): number {
  const [a, b, c] = lattice;
  return Math.abs(
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]),
  );
}

/**
returns structure and charge,
https://www.vasp.at/wiki/CHGCAR
 */
export function chgcarToVolumetric(text: string): {
  structure: CrystalStructure;
  charge: VolumetricData;
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const { structure, linesConsumed } = parsePoscar(lines);

  let cursor = linesConsumed;

  const [nx, ny, nz] = lines[cursor].split(/\s+/).map((v) => parseInt(v, 10));

  if (!nx || !ny || !nz) {
    throw new Error("Invalid CHGCAR grid dimensions");
  }

  const shape: GridShape = [nx, ny, nz];
  cursor += 1;

  const nValues = nx * ny * nz;
  const values = new Float32Array(nValues);

  let count = 0;
  while (count < nValues && cursor < lines.length) {
    const parts = lines[cursor].split(/\s+/);
    for (const p of parts) {
      if (count < nValues) {
        values[count++] = parseFloat(p);
      }
    }
    cursor++;
  }

  if (count !== nValues) {
    throw new Error(`CHGCAR grid truncated: expected ${nValues}, got ${count}`);
  }

  // normalise
  const volume = cellVolume(structure.lattice);
  const norm = 1.0 / (nValues * volume);
  for (let i = 0; i < values.length; i++) {
    values[i] *= norm;
  }

  const charge = new VolumetricData({
    origin: [0, 0, 0],
    basis: latticeToGridBasis(structure.lattice, shape),
    shape,
    values,
    units: "e/Å^3",
  });

  return { structure, charge };
}

function latticeToGridBasis(
  lattice: CartesianCoords[],
  shape: GridShape,
): [CartesianCoords, CartesianCoords, CartesianCoords] {
  const [nx, ny, nz] = shape;
  return [
    [lattice[0][0] / nx, lattice[0][1] / nx, lattice[0][2] / nx],
    [lattice[1][0] / ny, lattice[1][1] / ny, lattice[1][2] / ny],
    [lattice[2][0] / nz, lattice[2][1] / nz, lattice[2][2] / nz],
  ];
}
