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
  spatialUnits: "angstrom" = "angstrom";

  private _min?: number;
  private _max?: number;
  private _mean?: number;
  private _invalid = true;

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

  invalidate() {
    this._invalid = true;
  }

  map(
    fn: (v: number, i: number, j: number, k: number, c: number) => number,
  ): void {
    const [nx, ny, nz] = this.shape;
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          for (let c = 0; c < this.components; c++) {
            const idx = this.index(i, j, k, c);
            this.values[idx] = fn(this.values[idx], i, j, k, c);
          }
        }
      }
    }
    this.invalidate();
  }

  min(): number {
    if (this._invalid || this._min === undefined) {
      this.computeStats();
    }
    return this._min!;
  }

  max(): number {
    if (this._invalid || this._max === undefined) {
      this.computeStats();
    }
    return this._max!;
  }

  mean(): number {
    if (this._invalid || this._mean === undefined) {
      this.computeStats();
    }
    return this._mean!;
  }

  index(i: number, j: number, k: number, c = 0): number {
    const [nx, ny] = this.shape;
    return (i + nx * (j + ny * k)) * this.components + c;
  }

  get(i: number, j: number, k: number, c = 0): number {
    return this.values[this.index(i, j, k, c)];
  }

  set(i: number, j: number, k: number, c: number, value: number) {
    this.values[this.index(i, j, k, c)] = value;
    this.invalidate();
  }

  normalize(): void {
    const min = this.min();
    const max = this.max();
    this.map((v) => (v - min) / (max - min));
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

  voxelVolume(): number {
    const [a, b, c] = this.basis;
    return Math.abs(
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0]),
    );
  }

  integral(): number {
    return this.mean() * this.values.length * this.voxelVolume();
  }

  private computeStats() {
    const n = this.values.length;
    let min = Infinity,
      max = -Infinity,
      sum = 0;

    for (let i = 0; i < n; i++) {
      const v = this.values[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }

    this._min = min;
    this._max = max;
    this._mean = sum / n;
    this._invalid = false;
  }
}
