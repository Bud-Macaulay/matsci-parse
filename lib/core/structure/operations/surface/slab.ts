import { Structure } from "../../structure";
import { Site } from "../../../site/site";
import { Lattice, createLattice } from "../../../lattice/lattice";
import { inverse } from "../../../lattice/inverse";
import { cartesian } from "../../../site/cartesian";
import { supercell } from "../supercell";
import { planeFromMillerIndex } from "../geometry/plane";

export interface SlabOptions {
  supercell?: number | [number, number, number];
  slabShift?: number;
}

function findInPlaneVectors(
  h: number,
  k: number,
  l: number,
): [number, number, number, number, number, number] {
  if (h !== 0) {
    return [k, -h, 0, l, 0, -h];
  } else if (k !== 0) {
    return [1, 0, 0, 0, l, -k];
  } else {
    return [1, 0, 0, 0, 1, 0];
  }
}

/**
 * Create a slab from a structure by cutting along a Miller plane.
 *
 * The algorithm works by first replicating the structure via a supercell,
 * finding two in-plane lattice vectors that span the (hkl) surface, then
 * building a new cell where the a and b axes lie in the surface plane
 * and the c axis is perpendicular to it.  Atoms within the requested
 * slab thickness are retained, and the remaining c-height becomes vacuum.
 */
export function makeSlab(
  structure: Structure,
  hkl: [number, number, number],
  slabThickness: number,
  vacuumThickness: number,
  options?: SlabOptions,
): Structure {
  const [h, k, l] = hkl;
  const scSize = options?.supercell ?? 2;
  const slabShift = options?.slabShift ?? 0;

  const sc = supercell(structure, scSize);

  const plane = planeFromMillerIndex(sc, h, k, l);
  const n = plane.normal;

  const basis = sc.lattice.basis.data;

  const [u1, v1, w1, u2, v2, w2] = findInPlaneVectors(h, k, l);

  const newA = [
    u1 * basis[0] + v1 * basis[3] + w1 * basis[6],
    u1 * basis[1] + v1 * basis[4] + w1 * basis[7],
    u1 * basis[2] + v1 * basis[5] + w1 * basis[8],
  ];
  const newB = [
    u2 * basis[0] + v2 * basis[3] + w2 * basis[6],
    u2 * basis[1] + v2 * basis[4] + w2 * basis[7],
    u2 * basis[2] + v2 * basis[5] + w2 * basis[8],
  ];

  const totalHeight = slabThickness + vacuumThickness;
  const newC = [n[0] * totalHeight, n[1] * totalHeight, n[2] * totalHeight];

  const newLattice = createLattice([
    newA[0], newA[1], newA[2],
    newB[0], newB[1], newB[2],
    newC[0], newC[1], newC[2],
  ]);

  const newInv = inverse(newLattice);
  const invData = newInv.data;

  const sites: Site[] = [];

  const zFracLow = slabShift;
  const zFracHigh = slabShift + slabThickness / totalHeight;

  for (const site of sc.sites) {
    const cartPos = cartesian(sc.lattice, site);

    const newFracX = invData[0] * cartPos[0] + invData[3] * cartPos[1] + invData[6] * cartPos[2];
    const newFracY = invData[1] * cartPos[0] + invData[4] * cartPos[1] + invData[7] * cartPos[2];
    const newFracZ = invData[2] * cartPos[0] + invData[5] * cartPos[1] + invData[8] * cartPos[2];

    let zWrapped = newFracZ % 1;
    if (zWrapped < 0) zWrapped += 1;

    if (zWrapped >= zFracLow && zWrapped < zFracHigh) {
      sites.push({
        species: site.species,
        frac: new Float64Array([newFracX, newFracY, zWrapped]),
        properties: site.properties,
      });
    }
  }

  return {
    lattice: newLattice,
    sites,
  };
}
