import {
  cross,
  dot,
  scale,
  multiplyMatrixVector,
  cellParamsToLattice,
  latticeToCellParams,
  fractionalToCartesian,
  cartesianToFractional,
  normalizeLattice,
  getReciprocalLattice,
  applyLatticeTransformation,
  makeSupercell,
} from "../../lib/math/matrix";

import { CrystalStructure } from "../../lib/io/crystal";
import { Site } from "../../lib/io/common";

describe("basic math utilities", () => {
  test("dot product", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  test("cross product", () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  test("scale vector", () => {
    expect(scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
  });

  test("multiply matrix vector", () => {
    const m = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    expect(multiplyMatrixVector(m, [1, 1, 1])).toEqual([6, 15, 24]);
  });
});

describe("lattice conversions", () => {
  test("cellParams <-> lattice roundtrip (orthogonal)", () => {
    const params = {
      a: 2,
      b: 2,
      c: 2,
      alpha: 90,
      beta: 90,
      gamma: 90,
    };

    const lattice = cellParamsToLattice(params);
    const back = latticeToCellParams(lattice);

    expect(back.a).toBeCloseTo(2);
    expect(back.b).toBeCloseTo(2);
    expect(back.c).toBeCloseTo(2);

    expect(back.alpha).toBeCloseTo(90);
    expect(back.beta).toBeCloseTo(90);
    expect(back.gamma).toBeCloseTo(90);
  });

  test("normalize lattice from flat array", () => {
    const flat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const norm = normalizeLattice(flat);
    expect(norm).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe("fractional/cartesian conversions", () => {
  const lattice = [
    [1, 0, 0],
    [0, 2, 0],
    [0, 0, 3],
  ];

  test("fractional -> cartesian", () => {
    const f = [1, 1, 1];
    expect(fractionalToCartesian(f, lattice)).toEqual([1, 2, 3]);
  });

  test("cartesian -> fractional roundtrip", () => {
    const c = [1, 2, 3];
    const f = cartesianToFractional(c, lattice);
    const back = fractionalToCartesian(f, lattice);

    expect(back[0]).toBeCloseTo(1);
    expect(back[1]).toBeCloseTo(2);
    expect(back[2]).toBeCloseTo(3);
  });
});

describe("reciprocal lattice", () => {
  test("orthogonal lattice reciprocal", () => {
    const lattice = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const rec = getReciprocalLattice(lattice, 1);

    expect(rec[0][0]).toBeCloseTo(1);
    expect(rec[1][1]).toBeCloseTo(1);
    expect(rec[2][2]).toBeCloseTo(1);
  });

  test("reciprocal lattice with 2π scaling", () => {
    const lattice = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const rec = getReciprocalLattice(lattice, 2 * Math.PI);
    expect(rec[0][0]).toBeCloseTo(2 * Math.PI);
  });
});

describe("lattice transformations", () => {
  const structure = new CrystalStructure({
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    species: ["A"],
    sites: [new Site(0, [0, 0, 0], {})],
  });

  test("isotropic scaling", () => {
    const scaled = applyLatticeTransformation(structure, 2);

    expect(scaled.lattice[0]).toEqual([2, 0, 0]);
    expect(scaled.sites[0].cart).toEqual([0, 0, 0]);
  });

  test("anisotropic scaling vector", () => {
    const scaled = applyLatticeTransformation(structure, [1, 2, 3]);

    expect(scaled.lattice[1]).toEqual([0, 2, 0]);
  });

  test("matrix transformation", () => {
    const transform = [
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const scaled = applyLatticeTransformation(structure, transform);
    expect(scaled.lattice[0]).toEqual([2, 0, 0]);
  });
});

describe("supercell generation", () => {
  test("basic 2x1x1 supercell", () => {
    const structure = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["A"],
      sites: [new Site(0, [0, 0, 0], {})],
    });

    const supercell = makeSupercell(structure, [2, 1, 1]);

    expect(supercell.sites.length).toBe(2);
    expect(supercell.lattice[0][0]).toBe(2);
  });

  test("invalid supercell dims throw", () => {
    const structure = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: [],
      sites: [],
    });

    expect(() => makeSupercell(structure, [0, 1, 1] as any)).toThrow();
  });
});

describe("invertMatrix error cases", () => {
  test("throws on singular matrix", () => {
    const singularLattice = [
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0], // collinear → zero determinant
    ];

    expect(() => cartesianToFractional([1, 1, 1], singularLattice)).toThrow(
      "Matrix is singular and cannot be inverted",
    );
  });
});

describe("reciprocal lattice errors", () => {
  test("throws on zero volume lattice", () => {
    const degenerate = [
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0], // all collinear → volume = 0
    ];

    expect(() => getReciprocalLattice(degenerate)).toThrow(
      "Invalid lattice: zero volume",
    );
  });
});

describe("applyLatticeTransformation errors", () => {
  const base = new CrystalStructure({
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    species: [],
    sites: [],
  });

  test("throws on invalid scale type", () => {
    expect(() => applyLatticeTransformation(base, "bad" as any)).toThrow(
      "Scale must be a number, a 3-element array, or a 3x3 matrix",
    );
  });

  test("throws on malformed array", () => {
    expect(() => applyLatticeTransformation(base, [1, 2] as any)).toThrow(
      "Scale must be a number, a 3-element array, or a 3x3 matrix",
    );
  });
});
