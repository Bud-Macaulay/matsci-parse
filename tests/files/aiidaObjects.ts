export const aiidaObjects = [
  {
    name: "simple NaCl",
    data: {
      cell: [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
      ],
      kinds: [
        { name: "Na", symbols: ["Na"], mass: 22.99 },
        { name: "Cl", symbols: ["Cl"], mass: 35.45 },
      ],
      sites: [
        { kind_name: "Na", position: [0, 0, 0] },
        { kind_name: "Cl", position: [0.5, 0.5, 0.5] },
      ],
      pbc1: true,
      pbc2: true,
      pbc3: true,
    },
  },

  {
    name: "permuted kinds order",
    data: {
      cell: [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
      ],
      kinds: [
        { name: "Cl", symbols: ["Cl"], mass: 35.45 },
        { name: "Na", symbols: ["Na"], mass: 22.99 },
      ],
      sites: [
        { kind_name: "Cl", position: [0.5, 0.5, 0.5] },
        { kind_name: "Na", position: [0, 0, 0] },
      ],
      pbc1: true,
      pbc2: true,
      pbc3: true,
    },
  },

  {
    name: "empty structure",
    data: {
      cell: [
        [2.0, 0.0, 0.0],
        [0.0, 2.0, 0.0],
        [0.0, 0.0, 2.0],
      ],
      kinds: [{ name: "Si", symbols: ["Si"], mass: 28.085 }],
      sites: [],
      pbc1: true,
      pbc2: true,
      pbc3: true,
    },
  },

  {
    name: "multi-site repetition",
    data: {
      cell: [
        [3.0, 0.0, 0.0],
        [0.0, 3.0, 0.0],
        [0.0, 0.0, 3.0],
      ],
      kinds: [
        { name: "Fe", symbols: ["Fe"], mass: 55.845 },
        { name: "O", symbols: ["O"], mass: 15.999 },
      ],
      sites: [
        { kind_name: "Fe", position: [0, 0, 0] },
        { kind_name: "Fe", position: [1, 1, 1] },
        { kind_name: "O", position: [0.5, 0.5, 0.5] },
      ],
      pbc1: true,
      pbc2: true,
      pbc3: true,
    },
  },
];
