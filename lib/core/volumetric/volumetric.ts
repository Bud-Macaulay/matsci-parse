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

export function createVolumetricData(params: {
  shape: [number, number, number];
  channels?: number;

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
