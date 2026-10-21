import type { EosModel } from "./index";

/**
 * Poirier–Tarantola (logarithmic) equation of state (Poirier & Tarantola,
 * Phys. Earth Planet. Inter. 109, 1 (1998)), with s = −ln(V/V₀):
 *
 *   E(V) = E₀ + B₀V₀·s²/6·[3 + (B₀′ − 2)·s]
 *   P(V) = B₀·(V₀/V)·[s + (B₀′ − 2)·s²/2]
 *
 * Same as ASE's "pouriertarantola" and pymatgen's "pourier_tarantola".
 * Units: V in Å³, E in eV, P and B₀ in eV/Å³.
 */
export const poirierTarantola: EosModel = {
  name: "poirierTarantola",
  energy(volume, { e0, v0, b0, b1 }) {
    const s = -Math.log(volume / v0);
    return e0 + ((b0 * v0 * s * s) / 6) * (3 + (b1 - 2) * s);
  },
  pressure(volume, { v0, b0, b1 }) {
    const s = -Math.log(volume / v0);
    return b0 * (v0 / volume) * (s + 0.5 * (b1 - 2) * s * s);
  },
};
