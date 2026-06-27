import { Matrix } from "../matrix";
import { identity } from "../matrix";

export interface VolumetricData {
  readonly data: Float64Array;
  readonly shape: [number, number, number];
  readonly channels: number;
  readonly basis?: Matrix;
  readonly origin: [number, number, number];
  readonly field?: string;
  readonly metadata?: Record<string, unknown>;
}

type ReduceAxis = "all" | "channels";

export interface ReduceOptions {
  axis?: ReduceAxis;
}

export function createVolumetricData(params: {
  shape: [number, number, number];
  channels?: number;

  /**
   * Flat voxel-major buffer.
   *
   * Layout:
   * [v000c0, v000c1, ..., v001c0, v001c1, ...]
   */
  data?: Float64Array | Iterable<number>;

  basis?: Matrix;
  origin?: [number, number, number];

  field?: string;
  metadata?: Record<string, unknown>;
}): VolumetricData {
  const {
    shape,
    channels = 1,
    data,
    basis,
    origin = [0, 0, 0],
    field,
    metadata,
  } = params;

  const [D, H, W] = shape;
  const size = D * H * W * channels;

  const buffer =
    data instanceof Float64Array
      ? data
      : data
        ? Float64Array.from(data)
        : new Float64Array(size);

  if (buffer.length !== size) {
    throw new Error(
      `VolumetricData mismatch: expected ${size}, got ${buffer.length}`,
    );
  }

  return {
    data: buffer,
    shape,
    channels,
    basis: basis ?? identity(3),
    origin,
    field,
    metadata,
  };
}

export function index(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  c: number,
) {
  const [D, H, W] = vol.shape;
  const { channels } = vol;

  return ((z * H + y) * W + x) * channels + c;
}
