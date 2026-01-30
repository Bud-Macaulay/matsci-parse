import { CrystalStructure } from "../../lib/io/crystal";

export const rockSalt = new CrystalStructure({
  lattice: [
    [5.64, 0, 0],
    [0, 5.64, 0],
    [0, 0, 5.64],
  ],
  species: ["Na", "Cl"],
  sites: [
    { speciesIndex: 0, cart: [0, 0, 0] },
    { speciesIndex: 1, cart: [2.82, 2.82, 2.82] },
    { speciesIndex: 0, cart: [0, 2.82, 2.82] },
    { speciesIndex: 1, cart: [2.82, 0, 0] },
  ],
});

export const diamond = new CrystalStructure({
  lattice: [
    [3.57, 0, 0],
    [0, 3.57, 0],
    [0, 0, 3.57],
  ],
  species: ["C"],
  sites: [
    { speciesIndex: 0, cart: [0, 0, 0] },
    { speciesIndex: 0, cart: [1.785, 1.785, 1.785] },
  ],
});

export const singleAtom = new CrystalStructure({
  lattice: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  species: ["He"],
  sites: [{ speciesIndex: 0, cart: [0, 0, 0] }],
});
