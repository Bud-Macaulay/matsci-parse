import { VolumetricData } from "../volumetric";

/** Deep-clone a VolumetricData instance. */
/** @param vol - Volume to clone. */
/** @returns A new VolumetricData with a copied buffer and metadata. */
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
