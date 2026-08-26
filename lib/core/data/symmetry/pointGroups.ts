/**
 * Point group data: mapping, character tables, symmetry operations, and
 * optical activity labels for all 27 non-cubic crystallographic point groups.
 *
 * Rotation matrices are generated at runtime from axis/angle specs via
 * quaternion rotation (matching the Python/ASE Quaternion implementation).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Vec3 = [number, number, number];
export type Matrix3x3 = [Vec3, Vec3, Vec3];
/** Complex number as [real, imaginary]. */
export type Complex = [number, number];

// Symmetry operation specs — declarative, not pre-computed
interface IdentityOp {
  type: "I";
}
interface InversionOp {
  type: "-I";
}
interface RotationOp {
  type: "R";
  axis: Vec3;
  angle: number;
}
interface RotoreflectionOp {
  type: "S";
  axis: Vec3;
  angle: number;
}
export type OpSpec = IdentityOp | InversionOp | RotationOp | RotoreflectionOp;

export interface PointGroupEntry {
  classes: Record<number, OpSpec[]>;
  characterTable: Record<string, (number | Complex)[]>;
  raman: string[];
  infrared: string[];
  hmSymbol: string;
  backscattering: string[][];
}

// ---------------------------------------------------------------------------
// Matrix generation from OpSpec
// ---------------------------------------------------------------------------

const TOL = 2 * Number.EPSILON;

export function identity(): Matrix3x3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

export function inversion(): Matrix3x3 {
  return [
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ];
}

/**
 * Rotation matrix from axis and angle via quaternion.
 * Equivalent to ASE's Quaternion.rotation_matrix().
 */
export function rotationMatrix(axis: Vec3, angle: number): Matrix3x3 {
  const [ax, ay, az] = axis;
  const norm = Math.sqrt(ax * ax + ay * ay + az * az);
  const half = angle / 2;
  const s = Math.sin(half) / norm;
  const c = Math.cos(half);
  // Quaternion [w, x, y, z]
  const qw = c;
  const qx = s * ax;
  const qy = s * ay;
  const qz = s * az;

  const raw: number[][] = [
    [
      1 - 2 * (qy * qy + qz * qz),
      2 * (qx * qy - qw * qz),
      2 * (qx * qz + qw * qy),
    ],
    [
      2 * (qx * qy + qw * qz),
      1 - 2 * (qx * qx + qz * qz),
      2 * (qy * qz - qw * qx),
    ],
    [
      2 * (qx * qz - qw * qy),
      2 * (qy * qz + qw * qx),
      1 - 2 * (qx * qx + qy * qy),
    ],
  ];

  // Zero out near-zero entries (matches Python's tolerance logic)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(raw[i][j]) < TOL) raw[i][j] = 0;
    }
  }

  return raw as Matrix3x3;
}

/**
 * Rotoreflection: rotation by angle + π, then negate (inversion).
 * Equivalent to Python's `rotoreflection(axis, angle) = -rotation(axis, angle + π)`.
 */
export function rotoreflectionMatrix(axis: Vec3, angle: number): Matrix3x3 {
  const m = rotationMatrix(axis, angle + Math.PI);
  return [
    [-m[0][0], -m[0][1], -m[0][2]],
    [-m[1][0], -m[1][1], -m[1][2]],
    [-m[2][0], -m[2][1], -m[2][2]],
  ];
}

/** Resolve an OpSpec to its concrete 3×3 matrix. */
export function resolveOp(op: OpSpec): Matrix3x3 {
  switch (op.type) {
    case "I":
      return identity();
    case "-I":
      return inversion();
    case "R":
      return rotationMatrix(op.axis, op.angle);
    case "S":
      return rotoreflectionMatrix(op.axis, op.angle);
  }
}

/** Resolve all operations in a class to their matrices. */
export function resolveClass(ops: OpSpec[]): Matrix3x3[] {
  return ops.map(resolveOp);
}

// ---------------------------------------------------------------------------
// Common shorthand specs
// ---------------------------------------------------------------------------

const I: IdentityOp = { type: "I" };
const NI: InversionOp = { type: "-I" };

const rz = (angle: number): RotationOp => ({
  type: "R",
  axis: [0, 0, 1],
  angle,
});
const rx = (angle: number): RotationOp => ({
  type: "R",
  axis: [1, 0, 0],
  angle,
});
const ry = (angle: number): RotationOp => ({
  type: "R",
  axis: [0, 1, 0],
  angle,
});
const rAxis = (axis: Vec3, angle: number): RotationOp => ({
  type: "R",
  axis,
  angle,
});

const sx = (angle: number): RotoreflectionOp => ({
  type: "S",
  axis: [1, 0, 0],
  angle,
});
const sy = (angle: number): RotoreflectionOp => ({
  type: "S",
  axis: [0, 1, 0],
  angle,
});
const sz = (angle: number): RotoreflectionOp => ({
  type: "S",
  axis: [0, 0, 1],
  angle,
});
const sAxis = (axis: Vec3, angle: number): RotoreflectionOp => ({
  type: "S",
  axis,
  angle,
});

// Frequently used irrational-containing axes
const SQRT3 = Math.sqrt(3);
const AX_N1_SQ3_0: Vec3 = [-1, SQRT3, 0];
const AX_N1_NSQ3_0: Vec3 = [-1, -SQRT3, 0];
const AX_SQ3_1_0: Vec3 = [SQRT3, 1, 0];
const AX_SQ3_N1_0: Vec3 = [SQRT3, -1, 0];
const AX_1_1_0: Vec3 = [1, 1, 0];
const AX_1_N1_0: Vec3 = [1, -1, 0];

// Common angles
const PI = Math.PI;
const PI2 = PI / 2;
const PI3 = PI / 3;
const PI6 = PI / 6;
const TPI3 = (2 * PI) / 3;
const NTPI3 = -(2 * PI) / 3;
const NPI3 = -PI / 3;

// ---------------------------------------------------------------------------
// Complex number constants (character table phase factors)
// ---------------------------------------------------------------------------

// w = exp(2πi/3), w2 = exp(-2πi/3)
const W: Complex = [-0.5, SQRT3 / 2];
const W2: Complex = [-0.5, -SQRT3 / 2];
const _1j: Complex = [0, 1];
const _1nj: Complex = [0, -1];

// ---------------------------------------------------------------------------
// International number ↔ HM/Schoenflies mapping
// ---------------------------------------------------------------------------

export interface PGMapping {
  internationalNumber: number;
  hmSymbol: string;
  schoenflies: string;
}

export const pointgroupMapping: PGMapping[] = [
  { internationalNumber: 0, hmSymbol: "", schoenflies: "" }, // placeholder for 1-indexing
  { internationalNumber: 1, hmSymbol: "1", schoenflies: "C1" },
  { internationalNumber: 2, hmSymbol: "-1", schoenflies: "Ci" },
  { internationalNumber: 3, hmSymbol: "2", schoenflies: "C2" },
  { internationalNumber: 4, hmSymbol: "m", schoenflies: "Cs" },
  { internationalNumber: 5, hmSymbol: "2/m", schoenflies: "C2h" },
  { internationalNumber: 6, hmSymbol: "222", schoenflies: "D2" },
  { internationalNumber: 7, hmSymbol: "mm2", schoenflies: "C2v" },
  { internationalNumber: 8, hmSymbol: "mmm", schoenflies: "D2h" },
  { internationalNumber: 9, hmSymbol: "4", schoenflies: "C4" },
  { internationalNumber: 10, hmSymbol: "-4", schoenflies: "S4" },
  { internationalNumber: 11, hmSymbol: "4/m", schoenflies: "C4h" },
  { internationalNumber: 12, hmSymbol: "422", schoenflies: "D4" },
  { internationalNumber: 13, hmSymbol: "4mm", schoenflies: "C4v" },
  { internationalNumber: 14, hmSymbol: "-42m", schoenflies: "D2d" },
  { internationalNumber: 15, hmSymbol: "4/mmm", schoenflies: "D4h" },
  { internationalNumber: 16, hmSymbol: "3", schoenflies: "C3" },
  { internationalNumber: 17, hmSymbol: "-3", schoenflies: "C3i" },
  { internationalNumber: 18, hmSymbol: "32", schoenflies: "D3" },
  { internationalNumber: 19, hmSymbol: "3m", schoenflies: "C3v" },
  { internationalNumber: 20, hmSymbol: "-3m", schoenflies: "D3d" },
  { internationalNumber: 21, hmSymbol: "6", schoenflies: "C6" },
  { internationalNumber: 22, hmSymbol: "-6", schoenflies: "C3h" },
  { internationalNumber: 23, hmSymbol: "6/m", schoenflies: "C6h" },
  { internationalNumber: 24, hmSymbol: "622", schoenflies: "D6" },
  { internationalNumber: 25, hmSymbol: "6mm", schoenflies: "C6v" },
  { internationalNumber: 26, hmSymbol: "-6m2", schoenflies: "D3h" },
  { internationalNumber: 27, hmSymbol: "6/mmm", schoenflies: "D6h" },
  // Cubic (kept for completeness, not used in layer analysis)
  { internationalNumber: 28, hmSymbol: "23", schoenflies: "T" },
  { internationalNumber: 29, hmSymbol: "m-3", schoenflies: "Th" },
  { internationalNumber: 30, hmSymbol: "432", schoenflies: "O" },
  { internationalNumber: 31, hmSymbol: "-43m", schoenflies: "Td" },
  { internationalNumber: 32, hmSymbol: "m-3m", schoenflies: "Oh" },
];

// ---------------------------------------------------------------------------
// Point group dictionary — all 27 non-cubic groups
// ---------------------------------------------------------------------------

export const pointgroupDict: Record<string, PointGroupEntry> = {
  // =======================================================================
  // TRICLINIC
  // =======================================================================

  C1: {
    classes: { 0: [I] },
    characterTable: { A: [1] },
    raman: ["A"],
    infrared: ["A"],
    hmSymbol: "1",
    backscattering: [["A"], ["A"], ["A"]],
  },

  Ci: {
    classes: { 0: [I], 1: [NI] },
    characterTable: { Ag: [1, 1], Au: [1, -1] },
    raman: ["Ag"],
    infrared: ["Au"],
    hmSymbol: "-1",
    backscattering: [["Ag"], ["Ag"], ["Ag"]],
  },

  // =======================================================================
  // MONOCLINIC
  // =======================================================================

  C2: {
    classes: { 0: [I], 1: [rz(PI)] },
    characterTable: { A: [1, 1], B: [1, -1] },
    raman: ["A", "B"],
    infrared: ["A", "B"],
    hmSymbol: "2",
    backscattering: [["A", "B"], ["A", "B"], ["A"]],
  },

  Cs: {
    classes: { 0: [I], 1: [sz(0)] },
    characterTable: { "A'": [1, 1], "A''": [1, -1] },
    raman: ["A'", "A''"],
    infrared: ["A'", "A''"],
    hmSymbol: "m",
    backscattering: [["A'", "A''"], ["A'", "A''"], ["A'"]],
  },

  C2h: {
    classes: { 0: [I], 1: [rz(PI)], 2: [NI], 3: [sz(0)] },
    characterTable: {
      Ag: [1, 1, 1, 1],
      Bg: [1, -1, 1, -1],
      Au: [1, 1, -1, -1],
      Bu: [1, -1, -1, 1],
    },
    raman: ["Ag", "Bg"],
    infrared: ["Au", "Bu"],
    hmSymbol: "2/m",
    backscattering: [["Ag", "Bg"], ["Ag", "Bg"], ["Ag"]],
  },

  // =======================================================================
  // ORTHORHOMBIC
  // =======================================================================

  D2: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [ry(PI)],
      3: [rx(PI)],
    },
    characterTable: {
      A: [1, 1, 1, 1],
      B1: [1, 1, -1, -1],
      B2: [1, -1, 1, -1],
      B3: [1, -1, -1, 1],
    },
    raman: ["A", "B1", "B2", "B3"],
    infrared: ["B1", "B2", "B3"],
    hmSymbol: "222",
    backscattering: [
      ["A", "B3"],
      ["A", "B2"],
      ["A", "B1"],
    ],
  },

  C2v: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [sy(0)],
      3: [sx(0)],
    },
    characterTable: {
      A1: [1, 1, 1, 1],
      A2: [1, 1, -1, -1],
      B1: [1, -1, 1, -1],
      B2: [1, -1, -1, 1],
    },
    raman: ["A1", "A2", "B1", "B2"],
    infrared: ["A1", "B1", "B2"],
    hmSymbol: "mm2",
    backscattering: [
      ["A1", "B2"],
      ["A1", "B1"],
      ["A1", "A2"],
    ],
  },

  D2h: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [ry(PI)],
      3: [rx(PI)],
      4: [NI],
      5: [sz(0)],
      6: [sy(0)],
      7: [sx(0)],
    },
    characterTable: {
      Ag: [1, 1, 1, 1, 1, 1, 1, 1],
      B1g: [1, 1, -1, -1, 1, 1, -1, -1],
      B2g: [1, -1, 1, -1, 1, -1, 1, -1],
      B3g: [1, -1, -1, 1, 1, -1, -1, 1],
      Au: [1, 1, 1, 1, -1, -1, -1, -1],
      B1u: [1, 1, -1, -1, -1, -1, 1, 1],
      B2u: [1, -1, 1, -1, -1, 1, -1, 1],
      B3u: [1, -1, -1, 1, -1, 1, 1, -1],
    },
    raman: ["Ag", "B1g", "B2g", "B3g"],
    infrared: ["B1u", "B2u", "B3u"],
    hmSymbol: "mmm",
    backscattering: [
      ["Ag", "B3g"],
      ["Ag", "B2g"],
      ["Ag", "B1g"],
    ],
  },

  // =======================================================================
  // TETRAGONAL
  // =======================================================================

  C4: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(PI2)],
      3: [rz(-PI2)],
    },
    characterTable: {
      A: [1, 1, 1, 1],
      B: [1, 1, -1, -1],
      "1E": [1, -1, _1nj, _1j],
      "2E": [1, -1, _1j, _1nj],
    },
    raman: ["A", "B", "1E", "2E"],
    infrared: ["A", "1E", "2E"],
    hmSymbol: "4",
    backscattering: [
      ["A", "1E", "2E", "B"],
      ["A", "1E", "2E", "B"],
      ["A", "B"],
    ],
  },

  S4: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [sz(PI2)],
      3: [sz(-PI2)],
    },
    characterTable: {
      A: [1, 1, 1, 1],
      B: [1, 1, -1, -1],
      "1E": [1, -1, _1nj, _1j],
      "2E": [1, -1, _1j, _1nj],
    },
    raman: ["A", "B", "1E", "2E"],
    infrared: ["B", "1E", "2E"],
    hmSymbol: "-4",
    backscattering: [
      ["A", "1E", "2E", "B"],
      ["A", "1E", "2E", "B"],
      ["A", "B"],
    ],
  },

  C4h: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(PI2)],
      3: [rz(-PI2)],
      4: [NI],
      5: [sz(0)],
      6: [sz(-PI2)],
      7: [sz(PI2)],
    },
    characterTable: {
      Ag: [1, 1, 1, 1, 1, 1, 1, 1],
      Bg: [1, 1, -1, -1, 1, 1, -1, -1],
      "1Eg": [1, -1, _1nj, _1j, 1, -1, _1nj, _1j],
      "2Eg": [1, -1, _1j, _1nj, 1, -1, _1j, _1nj],
      Au: [1, 1, 1, 1, -1, -1, -1, -1],
      Bu: [1, 1, -1, -1, -1, -1, 1, 1],
      "1Eu": [1, -1, _1nj, _1j, -1, 1, _1j, _1nj],
      "2Eu": [1, -1, _1j, _1nj, -1, 1, _1nj, _1j],
    },
    raman: ["Ag", "Bg", "1Eg", "2Eg"],
    infrared: ["Au", "1Eu", "2Eu"],
    hmSymbol: "4/m",
    backscattering: [
      ["Ag", "1Eg", "2Eg", "Bg"],
      ["Ag", "1Eg", "2Eg", "Bg"],
      ["Ag", "Bg"],
    ],
  },

  D4: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(PI2), rz(-PI2)],
      3: [rx(PI), ry(PI)],
      4: [rAxis(AX_1_1_0, PI), rAxis(AX_1_N1_0, PI)],
    },
    characterTable: {
      A1: [1, 1, 1, 1, 1],
      A2: [1, 1, 1, -1, -1],
      B1: [1, 1, -1, 1, -1],
      B2: [1, 1, -1, -1, 1],
      E: [2, -2, 0, 0, 0],
    },
    raman: ["A1", "B1", "B2", "E"],
    infrared: ["A2", "E"],
    hmSymbol: "422",
    backscattering: [
      ["A1", "E", "B1"],
      ["A1", "E", "B1"],
      ["A1", "B1", "B2"],
    ],
  },

  C4v: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(PI2), rz(-PI2)],
      3: [sx(0), sy(0)],
      4: [sAxis(AX_1_1_0, 0), sAxis(AX_1_N1_0, 0)],
    },
    characterTable: {
      A1: [1, 1, 1, 1, 1],
      A2: [1, 1, 1, -1, -1],
      B1: [1, 1, -1, 1, -1],
      B2: [1, 1, -1, -1, 1],
      E: [2, -2, 0, 0, 0],
    },
    raman: ["A1", "B1", "B2", "E"],
    infrared: ["A1", "E"],
    hmSymbol: "4mm",
    backscattering: [
      ["A1", "E", "B1"],
      ["A1", "E", "B1"],
      ["A1", "B1", "B2"],
    ],
  },

  D2d: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [sz(PI2), sz(-PI2)],
      3: [rx(PI), ry(PI)],
      4: [sAxis(AX_1_1_0, 0), sAxis(AX_1_N1_0, 0)],
    },
    characterTable: {
      A1: [1, 1, 1, 1, 1],
      A2: [1, 1, 1, -1, -1],
      B1: [1, 1, -1, 1, -1],
      B2: [1, 1, -1, -1, 1],
      E: [2, -2, 0, 0, 0],
    },
    raman: ["A1", "B1", "B2", "E"],
    infrared: ["B2", "E"],
    hmSymbol: "-42m",
    backscattering: [
      ["A1", "E", "B1"],
      ["A1", "E", "B1"],
      ["A1", "B1", "B2"],
    ],
  },

  D4h: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(PI2), rz(-PI2)],
      3: [rx(PI), ry(PI)],
      4: [rAxis(AX_1_1_0, PI), rAxis(AX_1_N1_0, PI)],
      5: [NI],
      6: [sz(0)],
      7: [sz(PI2), sz(-PI2)],
      8: [sx(0), sy(0)],
      9: [sAxis(AX_1_1_0, 0), sAxis(AX_1_N1_0, 0)],
    },
    characterTable: {
      A1g: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      A2g: [1, 1, 1, -1, -1, 1, 1, 1, -1, -1],
      B1g: [1, 1, -1, 1, -1, 1, 1, -1, 1, -1],
      B2g: [1, 1, -1, -1, 1, 1, 1, -1, -1, 1],
      Eg: [2, -2, 0, 0, 0, 2, -2, 0, 0, 0],
      A1u: [1, 1, 1, 1, 1, -1, -1, -1, -1, -1],
      A2u: [1, 1, 1, -1, -1, -1, -1, -1, 1, 1],
      B1u: [1, 1, -1, 1, -1, -1, -1, 1, -1, 1],
      B2u: [1, 1, -1, -1, 1, -1, -1, 1, 1, -1],
      Eu: [2, -2, 0, 0, 0, -2, 2, 0, 0, 0],
    },
    raman: ["A1g", "B1g", "B2g", "Eg"],
    infrared: ["A2u", "Eu"],
    hmSymbol: "4/mmm",
    backscattering: [
      ["A1g", "Eg", "B1g"],
      ["A1g", "Eg", "B1g"],
      ["A1g", "B1g", "B2g"],
    ],
  },

  // =======================================================================
  // TRIGONAL
  // =======================================================================

  C3: {
    classes: {
      0: [I],
      1: [rz(TPI3)],
      2: [rz(NTPI3)],
    },
    characterTable: {
      A: [1, 1, 1],
      "1E": [1, W2, W],
      "2E": [1, W, W2],
    },
    raman: ["A", "1E", "2E"],
    infrared: ["A", "1E", "2E"],
    hmSymbol: "3",
    backscattering: [
      ["A", "1E", "2E"],
      ["A", "1E", "2E"],
      ["A", "1E", "2E"],
    ],
  },

  C3i: {
    classes: {
      0: [I],
      1: [rz(TPI3)],
      2: [rz(NTPI3)],
      3: [NI],
      4: [sz(NPI3)],
      5: [sz(PI3)],
    },
    characterTable: {
      Ag: [1, 1, 1, 1, 1, 1],
      "1Eg": [1, W2, W, 1, W2, W],
      "2Eg": [1, W, W2, 1, W, W2],
      Au: [1, 1, 1, -1, -1, -1],
      "1Eu": [1, W2, W, -1, [-W2[0], -W2[1]], [-W[0], -W[1]]],
      "2Eu": [1, W, W2, -1, [-W[0], -W[1]], [-W2[0], -W2[1]]],
    },
    raman: ["Ag", "1Eg", "2Eg"],
    infrared: ["Au", "1Eu", "2Eu"],
    hmSymbol: "-3",
    backscattering: [
      ["Ag", "1Eg", "2Eg"],
      ["Ag", "1Eg", "2Eg"],
      ["Ag", "1Eg", "2Eg"],
    ],
  },

  D3: {
    classes: {
      0: [I],
      1: [rz(TPI3), rz(NTPI3)],
      2: [rx(PI), rAxis(AX_N1_SQ3_0, PI), rAxis(AX_N1_NSQ3_0, PI)],
    },
    characterTable: {
      A1: [1, 1, 1],
      A2: [1, 1, -1],
      E: [2, -1, 0],
    },
    raman: ["A1", "E"],
    infrared: ["A2", "E"],
    hmSymbol: "32",
    backscattering: [
      ["A1", "E"],
      ["A1", "E"],
      ["A1", "E"],
    ],
  },

  C3v: {
    classes: {
      0: [I],
      1: [rz(TPI3), rz(NTPI3)],
      2: [sx(0), sAxis(AX_N1_SQ3_0, 0), sAxis(AX_N1_NSQ3_0, 0)],
    },
    characterTable: {
      A1: [1, 1, 1],
      A2: [1, 1, -1],
      E: [2, -1, 0],
    },
    raman: ["A1", "E"],
    infrared: ["A1", "E"],
    hmSymbol: "3m",
    backscattering: [
      ["A1", "E"],
      ["A1", "E"],
      ["A1", "E"],
    ],
  },

  D3d: {
    classes: {
      0: [I],
      1: [rz(TPI3), rz(NTPI3)],
      2: [rx(PI), rAxis(AX_N1_SQ3_0, PI), rAxis(AX_N1_NSQ3_0, PI)],
      3: [NI],
      4: [sz(NPI3), sz(PI3)],
      5: [sx(0), sAxis(AX_N1_SQ3_0, 0), sAxis(AX_N1_NSQ3_0, 0)],
    },
    characterTable: {
      A1g: [1, 1, 1, 1, 1, 1],
      A2g: [1, 1, -1, 1, 1, -1],
      Eg: [2, -1, 0, 2, -1, 0],
      A1u: [1, 1, 1, -1, -1, -1],
      A2u: [1, 1, -1, -1, -1, 1],
      Eu: [2, -1, 0, -2, 1, 0],
    },
    raman: ["A1g", "Eg"],
    infrared: ["A2u", "Eu"],
    hmSymbol: "-3m",
    backscattering: [
      ["A1g", "Eg"],
      ["A1g", "Eg"],
      ["A1g", "Eg"],
    ],
  },

  // =======================================================================
  // HEXAGONAL
  // =======================================================================

  C6: {
    classes: {
      0: [I],
      1: [rz(PI3)],
      2: [rz(TPI3)],
      3: [rz(PI)],
      4: [rz(NTPI3)],
      5: [rz(-PI3)],
    },
    characterTable: {
      A: [1, 1, 1, 1, 1, 1],
      B: [1, -1, 1, -1, 1, -1],
      "1E2": [1, W, W2, 1, W, W2],
      "2E2": [1, W2, W, 1, W2, W],
      "1E1": [1, [-W[0], -W[1]], W2, -1, W, [-W2[0], -W2[1]]],
      "2E1": [1, [-W2[0], -W2[1]], W, -1, W2, [-W[0], -W[1]]],
    },
    raman: ["A", "1E2", "2E2", "1E1", "2E1"],
    infrared: ["A", "1E1", "2E1"],
    hmSymbol: "6",
    backscattering: [
      ["A", "1E1", "2E1", "1E2", "2E2"],
      ["A", "1E1", "2E1", "1E2", "2E2"],
      ["A", "1E2", "2E2"],
    ],
  },

  C3h: {
    classes: {
      0: [I],
      1: [rz(TPI3)],
      2: [rz(NTPI3)],
      3: [sz(0)],
      4: [sz(NTPI3)],
      5: [sz(TPI3)],
    },
    characterTable: {
      "A'": [1, 1, 1, 1, 1, 1],
      "A''": [1, 1, 1, -1, -1, -1],
      "2E'": [1, W, W2, 1, W, W2],
      "1E'": [1, W2, W, 1, W2, W],
      "2E''": [1, W, W2, -1, [-W[0], -W[1]], [-W2[0], -W2[1]]],
      "1E''": [1, W2, W, -1, [-W2[0], -W2[1]], [-W[0], -W[1]]],
    },
    raman: ["A'", "1E'", "2E'", "1E''", "2E''"],
    infrared: ["A''", "1E'", "2E'"],
    hmSymbol: "-6",
    backscattering: [
      ["A'", "1E''", "2E''", "1E'", "2E'"],
      ["A'", "1E''", "2E''", "1E'", "2E'"],
      ["A'", "1E'", "2E'"],
    ],
  },

  C6h: {
    classes: {
      0: [I],
      1: [rz(PI3)],
      2: [rz(TPI3)],
      3: [rz(PI)],
      4: [rz(NTPI3)],
      5: [rz(-PI3)],
      6: [NI],
      7: [sz(NTPI3)],
      8: [sz(-PI3)],
      9: [sz(0)],
      10: [sz(PI3)],
      11: [sz(TPI3)],
    },
    characterTable: {
      Ag: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      Bg: [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1],
      "1E2g": [1, W, W2, 1, W, W2, 1, W, W2, 1, W, W2],
      "2E2g": [1, W2, W, 1, W2, W, 1, W2, W, 1, W2, W],
      "1E1g": [
        1,
        [-W[0], -W[1]],
        W2,
        -1,
        W,
        [-W2[0], -W2[1]],
        1,
        [-W[0], -W[1]],
        W2,
        -1,
        W,
        [-W2[0], -W2[1]],
      ],
      "2E1g": [
        1,
        [-W2[0], -W2[1]],
        W,
        -1,
        W2,
        [-W[0], -W[1]],
        1,
        [-W2[0], -W2[1]],
        W,
        -1,
        W2,
        [-W[0], -W[1]],
      ],
      Au: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1],
      Bu: [1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1, 1],
      "1E2u": [
        1,
        W,
        W2,
        1,
        W,
        W2,
        -1,
        [-W[0], -W[1]],
        [-W2[0], -W2[1]],
        -1,
        [-W[0], -W[1]],
        [-W2[0], -W2[1]],
      ],
      "2E2u": [
        1,
        W2,
        W,
        1,
        W2,
        W,
        -1,
        [-W2[0], -W2[1]],
        [-W[0], -W[1]],
        -1,
        [-W2[0], -W2[1]],
        [-W[0], -W[1]],
      ],
      "1E1u": [
        1,
        [-W[0], -W[1]],
        W2,
        -1,
        W,
        [-W2[0], -W2[1]],
        -1,
        W,
        [-W2[0], -W2[1]],
        1,
        [-W[0], -W[1]],
        W2,
      ],
      "2E1u": [
        1,
        [-W2[0], -W2[1]],
        W,
        -1,
        W2,
        [-W[0], -W[1]],
        -1,
        W2,
        [-W[0], -W[1]],
        1,
        [-W2[0], -W2[1]],
        W,
      ],
    },
    raman: ["Ag", "1E2g", "2E2g", "1E1g", "2E1g"],
    infrared: ["Au", "1E1u", "2E1u"],
    hmSymbol: "6/m",
    backscattering: [
      ["Ag", "1E1g", "2E1g", "1E2g", "2E2g"],
      ["Ag", "1E1g", "2E1g", "1E2g", "2E2g"],
      ["Ag", "1E2g", "2E2g"],
    ],
  },

  D6: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(TPI3), rz(NTPI3)],
      3: [rz(PI3), rz(-PI3)],
      4: [rx(PI), rAxis(AX_N1_SQ3_0, PI), rAxis(AX_N1_NSQ3_0, PI)],
      5: [ry(PI), rAxis(AX_SQ3_1_0, PI), rAxis(AX_SQ3_N1_0, PI)],
    },
    characterTable: {
      A1: [1, 1, 1, 1, 1, 1],
      A2: [1, 1, 1, 1, -1, -1],
      B1: [1, -1, 1, -1, 1, -1],
      B2: [1, -1, 1, -1, -1, 1],
      E2: [2, 2, -1, -1, 0, 0],
      E1: [2, -2, -1, 1, 0, 0],
    },
    raman: ["A1", "E1", "E2"],
    infrared: ["A2", "E1"],
    hmSymbol: "622",
    backscattering: [
      ["A1", "E1", "E2"],
      ["A1", "E1", "E2"],
      ["A1", "E2"],
    ],
  },

  C6v: {
    classes: {
      0: [I],
      1: [rz(PI)],
      2: [rz(TPI3), rz(NTPI3)],
      3: [rz(PI3), rz(-PI3)],
      4: [sx(0), sAxis(AX_N1_SQ3_0, 0), sAxis(AX_N1_NSQ3_0, 0)],
      5: [sy(0), sAxis(AX_SQ3_1_0, 0), sAxis(AX_SQ3_N1_0, 0)],
    },
    characterTable: {
      A1: [1, 1, 1, 1, 1, 1],
      A2: [1, 1, 1, 1, -1, -1],
      B1: [1, -1, 1, -1, 1, -1],
      B2: [1, -1, 1, -1, -1, 1],
      E2: [2, 2, -1, -1, 0, 0],
      E1: [2, -2, -1, 1, 0, 0],
    },
    raman: ["A1", "E1", "E2"],
    infrared: ["A1", "E1"],
    hmSymbol: "6mm",
    backscattering: [
      ["A1", "E1", "E2"],
      ["A1", "E1", "E2"],
      ["A1", "E2"],
    ],
  },

  D3h: {
    classes: {
      0: [I],
      1: [sz(0)],
      2: [rz(TPI3), rz(NTPI3)],
      3: [sz(TPI3), sz(NTPI3)],
      4: [rx(PI), rAxis(AX_N1_SQ3_0, PI), rAxis(AX_N1_NSQ3_0, PI)],
      5: [sy(0), sAxis(AX_SQ3_1_0, 0), sAxis(AX_SQ3_N1_0, 0)],
    },
    characterTable: {
      "A1'": [1, 1, 1, 1, 1, 1],
      "A2'": [1, 1, 1, 1, -1, -1],
      "A1''": [1, -1, 1, -1, 1, -1],
      "A2''": [1, -1, 1, -1, -1, 1],
      "E'": [2, 2, -1, -1, 0, 0],
      "E''": [2, -2, -1, 1, 0, 0],
    },
    raman: ["A1'", "E'", "E''"],
    infrared: ["A2''", "E'"],
    hmSymbol: "-6m2",
    backscattering: [
      ["A1'", "E'", "E''"],
      ["A1'", "E'", "E''"],
      ["A1'", "E'"],
    ],
  },

  D6h: {
    classes: {
      0: [I],
      1: [rz(PI3), rz(-PI3)],
      2: [rz(TPI3), rz(NTPI3)],
      3: [rz(PI)],
      4: [rx(PI), rAxis(AX_N1_SQ3_0, PI), rAxis(AX_N1_NSQ3_0, PI)],
      5: [ry(PI), rAxis(AX_SQ3_1_0, PI), rAxis(AX_SQ3_N1_0, PI)],
      6: [NI],
      7: [sz(TPI3), sz(NTPI3)],
      8: [sz(PI3), sz(-PI3)],
      9: [sz(0)],
      10: [sx(0), sAxis(AX_N1_SQ3_0, 0), sAxis(AX_N1_NSQ3_0, 0)],
      11: [sy(0), sAxis(AX_SQ3_1_0, 0), sAxis(AX_SQ3_N1_0, 0)],
    },
    characterTable: {
      A1g: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      A2g: [1, 1, 1, 1, -1, -1, 1, 1, 1, 1, -1, -1],
      B1g: [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1],
      B2g: [1, -1, 1, -1, -1, 1, 1, -1, 1, -1, -1, 1],
      E2g: [2, -1, -1, 2, 0, 0, 2, -1, -1, 2, 0, 0],
      E1g: [2, 1, -1, -2, 0, 0, 2, 1, -1, -2, 0, 0],
      A1u: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1],
      A2u: [1, 1, 1, 1, -1, -1, -1, -1, -1, -1, 1, 1],
      B1u: [1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1, 1],
      B2u: [1, -1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1],
      E2u: [2, -1, -1, 2, 0, 0, -2, 1, 1, -2, 0, 0],
      E1u: [2, 1, -1, -2, 0, 0, -2, -1, 1, 2, 0, 0],
    },
    raman: ["A1g", "E1g", "E2g"],
    infrared: ["A2u", "E1u"],
    hmSymbol: "6/mmm",
    backscattering: [
      ["A1g", "E1g", "E2g"],
      ["A1g", "E1g", "E2g"],
      ["A1g", "E2g"],
    ],
  },
};
