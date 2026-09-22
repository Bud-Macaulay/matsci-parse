/**
 * Unit conversion helpers for pseudopotentials.
 *
 * Canonical in-memory units: Rydberg (energy) / Bohr (length) — the
 * UPF-native system. Hartree-based formats (PSP8, FHI/CPI, PSML, GTH) convert
 * on parse and back on serialize. Both factors are exact powers of two, so
 * same-format round-trips stay bit-exact.
 */

import type { Pseudopotential } from "./pseudopotential";

import { EnergyUnitSystem } from "../units";

/**
 * Hartree → Rydberg factor, derived from the built-in EnergyUnitSystem so
 * there is a single source of truth for conversion factors.
 *
 * This resolves to exactly 2 (27.2114/13.6057 in floating point), which is
 * what keeps same-format round-trips bit-exact. The factor is resolved ONCE
 * here and hot loops multiply by it directly — never call
 * EnergyUnitSystem.convert per value: it performs alias lookups plus two
 * roundings per call, so (v*27.2114)/13.6057 differs from v*2 by 1 ulp for
 * some doubles (e.g. -4.8696255250391e-8) and costs a call per element.
 * See the "pseudo units" benchmarks for the measured gap.
 */
export const HARTREE_TO_RYDBERG: number = EnergyUnitSystem.convert(
  1,
  "Hartree",
  "Rydberg",
);

/** Rydberg → Hartree factor, derived from the built-in EnergyUnitSystem (exactly 0.5). */
export const RYDBERG_TO_HARTREE: number = EnergyUnitSystem.convert(
  1,
  "Rydberg",
  "Hartree",
);

/** Alias used in adapters: energies stored in Hartree files → canonical Ry. */
export const HA_TO_RY = HARTREE_TO_RYDBERG;

/** Alias used in adapters: canonical Ry → Hartree for file output. */
export const RY_TO_HA = RYDBERG_TO_HARTREE;

/** Scale a single energy value (Hartree → Ry). */
export function haToRy(value: number): number {
  return value * HA_TO_RY;
}

/** Scale a single energy value (Ry → Hartree). */
export function ryToHa(value: number): number {
  return value * RY_TO_HA;
}

/** Scale every entry of an energy array (Hartree → Ry), returning a new array. */
export function haArrayToRy(values: Float64Array): Float64Array {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i] * HA_TO_RY;
  return out;
}

/** Scale every entry of an energy array (Ry → Hartree), returning a new array. */
export function ryArrayToHa(values: Float64Array): Float64Array {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i] * RY_TO_HA;
  return out;
}

/**
 * Energy-carrying fields converted when crossing the Hartree boundary.
 *
 * Converted (energies, in Ry canonically):
 * header.totalPsenergy / wfcCutoff / rhoCutoff, local.vloc, semilocal vnl,
 * D_ij values, wfc pseudoEnergy, paw.coreEnergy, paw.aeVloc,
 * gth.cexpPpl / hprj / kprj.
 *
 * NOT converted (lengths, densities, dimensionless shapes):
 * mesh r/rab/rmax/dx/xmin/zmesh, cutoff radii, rhoatom, nlcc, occupations,
 * chi/aewfc wavefunctions and beta projectors (L²-normalized shapes, plus
 * their Gaussian tails reach denormal magnitudes that no scaling round-trips
 * bit-exactly), gth rLoc/rPs/nElec.
 */

/**
 * Scale all energy-carrying fields of a Hartree-sourced pseudopotential to
 * canonical Ry. Mutates in place and returns the same object.
 */
export function scaleHaToRy(pp: Pseudopotential): Pseudopotential {
  const h = pp.header;
  h.totalPsenergy = haToRy(h.totalPsenergy);
  h.wfcCutoff = haToRy(h.wfcCutoff);
  h.rhoCutoff = haToRy(h.rhoCutoff);
  pp.local.vloc = haArrayToRy(pp.local.vloc);
  if (pp.semilocal) {
    for (const sl of pp.semilocal) sl.vnl = haArrayToRy(sl.vnl);
  }
  for (const entry of pp.nonlocal.dij) entry[2] = haToRy(entry[2]);
  for (const wfc of pp.pswfc) {
    if (wfc.pseudoEnergy != null) wfc.pseudoEnergy = haToRy(wfc.pseudoEnergy);
  }
  if (pp.paw) {
    pp.paw.coreEnergy = haToRy(pp.paw.coreEnergy);
    pp.paw.aeVloc = haArrayToRy(pp.paw.aeVloc);
  }
  if (pp.gth) {
    pp.gth.cexpPpl = pp.gth.cexpPpl.map(haToRy);
    pp.gth.hprj = pp.gth.hprj.map((m) => m.map((row) => row.map(haToRy)));
    if (pp.gth.kprj) {
      pp.gth.kprj = pp.gth.kprj.map((m) => m.map((row) => row.map(haToRy)));
    }
  }
  return pp;
}

/**
 * Scale all energy-carrying fields of a canonical (Ry) pseudopotential back
 * to Hartree for Hartree-based file output. Mutates in place.
 */
export function scaleRyToHa(pp: Pseudopotential): Pseudopotential {
  const h = pp.header;
  h.totalPsenergy = ryToHa(h.totalPsenergy);
  h.wfcCutoff = ryToHa(h.wfcCutoff);
  h.rhoCutoff = ryToHa(h.rhoCutoff);
  pp.local.vloc = ryArrayToHa(pp.local.vloc);
  if (pp.semilocal) {
    for (const sl of pp.semilocal) sl.vnl = ryArrayToHa(sl.vnl);
  }
  for (const entry of pp.nonlocal.dij) entry[2] = ryToHa(entry[2]);
  for (const wfc of pp.pswfc) {
    if (wfc.pseudoEnergy != null) wfc.pseudoEnergy = ryToHa(wfc.pseudoEnergy);
  }
  if (pp.paw) {
    pp.paw.coreEnergy = ryToHa(pp.paw.coreEnergy);
    pp.paw.aeVloc = ryArrayToHa(pp.paw.aeVloc);
  }
  if (pp.gth) {
    pp.gth.cexpPpl = pp.gth.cexpPpl.map(ryToHa);
    pp.gth.hprj = pp.gth.hprj.map((m) => m.map((row) => row.map(ryToHa)));
    if (pp.gth.kprj) {
      pp.gth.kprj = pp.gth.kprj.map((m) => m.map((row) => row.map(ryToHa)));
    }
  }
  return pp;
}
