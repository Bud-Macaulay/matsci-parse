import type { CartesianCoords, GridShape } from "./common";

export interface VolumetricGrid {
  origin: CartesianCoords;
  spacing: CartesianCoords;
  shape: GridShape;
  values: Float32Array;
  units: string;
}

export interface ScalarField extends VolumetricGrid {
  values: Float32Array;
}

export interface VectorField extends Omit<VolumetricGrid, "values"> {
  values: Float32Array; // nx * ny * nz * 3
}

export interface MultiChannelField extends Omit<VolumetricGrid, "values"> {
  channels: string[];
  values: Float32Array;
}

export class VolumetricData {
  origin: CartesianCoords;
  basis: [CartesianCoords, CartesianCoords, CartesianCoords];
  shape: GridShape;
  values: Float32Array;
  units?: string;
  components: number;

  constructor(opts: {
    origin: CartesianCoords;
    basis: [CartesianCoords, CartesianCoords, CartesianCoords];
    shape: GridShape;
    values: Float32Array;
    components?: number;
    units?: string;
  }) {
    const { origin, basis, shape, values, components = 1, units } = opts;
    const [nx, ny, nz] = shape;

    if (values.length !== nx * ny * nz * components) {
      throw new Error(
        `Invalid values length: expected ${nx * ny * nz * components}, got ${values.length}`,
      );
    }

    this.origin = origin;
    this.basis = basis;
    this.shape = shape;
    this.values = values;
    this.components = components;
    this.units = units;
  }

  index(i: number, j: number, k: number, c = 0): number {
    const [nx, ny] = this.shape;
    return (i + nx * (j + ny * k)) * this.components + c;
  }

  get(i: number, j: number, k: number, c = 0): number {
    return this.values[this.index(i, j, k, c)];
  }

  /** Convert grid index → Cartesian position */
  position(i: number, j: number, k: number): CartesianCoords {
    const [a, b, c] = this.basis;
    return [
      this.origin[0] + i * a[0] + j * b[0] + k * c[0],
      this.origin[1] + i * a[1] + j * b[1] + k * c[1],
      this.origin[2] + i * a[2] + j * b[2] + k * c[2],
    ];
  }
}
