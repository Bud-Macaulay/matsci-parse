import { createLattice } from "@/core/lattice/lattice";
import type { Structure } from "../structure";
import type { Site } from "@/core/site/site";

type SupercellSize = number | [number, number, number];

export function supercell(
  structure: Structure,
  size: SupercellSize,
): Structure {
  const [nx, ny, nz] = typeof size === "number" ? [size, size, size] : size;

  if (
    nx < 1 ||
    ny < 1 ||
    nz < 1 ||
    !Number.isInteger(nx) ||
    !Number.isInteger(ny) ||
    !Number.isInteger(nz)
  ) {
    throw new Error("Supercell dimensions must be positive integers");
  }

  const m = structure.lattice.basis.data;

  // row-major scaling
  const newBasis = [
    m[0] * nx,
    m[1] * nx,
    m[2] * nx,

    m[3] * ny,
    m[4] * ny,
    m[5] * ny,

    m[6] * nz,
    m[7] * nz,
    m[8] * nz,
  ];

  const sites: Site[] = [];

  for (const site of structure.sites) {
    const [x, y, z] = site.frac;

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          sites.push({
            species: site.species,

            frac: new Float64Array([(x + i) / nx, (y + j) / ny, (z + k) / nz]),
          });
        }
      }
    }
  }

  return {
    lattice: createLattice(newBasis),
    sites,
  };
}
