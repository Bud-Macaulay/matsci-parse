import { bench, describe } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { inverse } from "@/core/lattice/inverse";
import { metricTensor } from "@/core/lattice/metricTensor";
import { volume } from "@/core/lattice/volume";
import { lengths } from "@/core/lattice/lengths";
import { angles } from "@/core/lattice/angles";

const lattices = [
  createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  createLattice([2.969072, -0.000523, -0.000907, -0.987305, 2.80011, 0.000907, -0.987305, -1.402326, 2.423654]),
  createLattice([5.43, 0, 0, 0, 5.43, 0, 0, 0, 5.43]),
];

describe("lattice ops on 3x3 basis", () => {
  for (let i = 0; i < lattices.length; i++) {
    const lat = lattices[i];

    inverse(lat);
    metricTensor(lat);
    volume(lat);
    lengths(lat);
    angles(lat);

    bench(`lattice[${i}] inverse`, () => { inverse(lat); });
    bench(`lattice[${i}] metricTensor`, () => { metricTensor(lat); });
    bench(`lattice[${i}] volume`, () => { volume(lat); });
    bench(`lattice[${i}] lengths`, () => { lengths(lat); });
    bench(`lattice[${i}] angles`, () => { angles(lat); });
  }
});
