/** X-ray wavelengths in angstroms for common anode/filter combinations. */
export const WAVELENGTHS: Readonly<Record<string, number>> = {
  CuKa: 1.54184,
  CuKa2: 1.54439,
  CuKa1: 1.54056,
  CuKb1: 1.39222,
  MoKa: 0.71073,
  MoKa2: 0.71359,
  MoKa1: 0.7093,
  MoKb1: 0.63229,
  CrKa: 2.291,
  CrKa2: 2.29361,
  CrKa1: 2.2897,
  CrKb1: 2.08487,
  FeKa: 1.93735,
  FeKa2: 1.93998,
  FeKa1: 1.93604,
  FeKb1: 1.75661,
  CoKa: 1.79026,
  CoKa2: 1.79285,
  CoKa1: 1.78896,
  CoKb1: 1.63079,
  AgKa: 0.560885,
  AgKa2: 0.563813,
  AgKa1: 0.559421,
  AgKb1: 0.497082,
};

/** Resolve an XRD wavelength option to angstroms. */
export function resolveWavelength(wavelength: string | number): number {
  if (typeof wavelength === "number") {
    return wavelength;
  }

  const value = WAVELENGTHS[wavelength];

  if (value === undefined) {
    throw new Error(
      `Unknown XRD wavelength "${wavelength}". Expected one of ${Object.keys(WAVELENGTHS).join(", ")} or a number in angstroms.`,
    );
  }

  return value;
}
