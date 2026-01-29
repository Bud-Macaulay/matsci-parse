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

export const fccCu = new CrystalStructure({
  lattice: [
    [3.61, 0, 0],
    [0, 3.61, 0],
    [0, 0, 3.61],
  ],
  species: ["Cu"],
  sites: [
    { speciesIndex: 0, cart: [0, 0, 0] },
    { speciesIndex: 0, cart: [1.805, 1.805, 0] },
    { speciesIndex: 0, cart: [1.805, 0, 1.805] },
    { speciesIndex: 0, cart: [0, 1.805, 1.805] },
  ],
});

export const bccFe = new CrystalStructure({
  lattice: [
    [2.87, 0, 0],
    [0, 2.87, 0],
    [0, 0, 2.87],
  ],
  species: ["Fe"],
  sites: [
    { speciesIndex: 0, cart: [0, 0, 0] },
    { speciesIndex: 0, cart: [1.435, 1.435, 1.435] },
  ],
});

export const hcpMg = new CrystalStructure({
  lattice: [
    [3.21, 0, 0],
    [-1.605, 2.78, 0],
    [0, 0, 5.21],
  ],
  species: ["Mg"],
  sites: [
    { speciesIndex: 0, cart: [0, 0, 0] },
    { speciesIndex: 0, cart: [1.605, 0.9267, 2.605] },
  ],
});
