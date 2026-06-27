import { VolumetricData } from "../volumetric";

export function clone(vol: VolumetricData): VolumetricData {
  return {
    data: vol.data.slice(),
    shape: vol.shape,
    channels: vol.channels,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata ? { ...vol.metadata } : undefined,
  };
}
