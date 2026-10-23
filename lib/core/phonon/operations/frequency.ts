import type { PhononBands } from "../phonon";
import { FrequencyUnitSystem, type FrequencyUnits } from "../../units/frequency";

/** Factor from cm⁻¹ to `unit`, resolved once; throws on an unknown unit. */
function factorFromCm(unit: FrequencyUnits | string): number {
  const f = FrequencyUnitSystem.convert(1, "cm-1", unit);
  if (!Number.isFinite(f)) throw new Error(`Unknown frequency unit "${unit}"`);
  return f;
}

/**
 * All frequencies converted from cm⁻¹ to `unit`, same [nqpts × nmodes]
 * layout. Imaginary (negative) modes keep their sign. Returns a new array;
 * `bands` is not modified.
 */
export function convertFrequencies(
  bands: PhononBands,
  unit: FrequencyUnits | string,
): Float64Array {
  const f = factorFromCm(unit);
  return bands.frequencies.map((v) => v * f);
}

/**
 * Lowest and highest frequency over all q-points and modes (cm⁻¹ unless
 * `unit` is given). `min` is negative when imaginary modes are present.
 * Throws on bands with no frequencies.
 */
export function frequencyRange(
  bands: PhononBands,
  opts: { unit?: FrequencyUnits } = {},
): { min: number; max: number } {
  const { frequencies } = bands;
  if (frequencies.length === 0) throw new Error("Bands have no frequencies");
  let min = Infinity;
  let max = -Infinity;
  for (const v of frequencies) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const f = factorFromCm(opts.unit ?? "cm-1");
  return { min: min * f, max: max * f };
}
