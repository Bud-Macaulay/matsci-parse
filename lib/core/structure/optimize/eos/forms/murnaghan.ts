import type { EosModel } from "./index";

/**
 * Murnaghan equation of state (Murnaghan, PNAS 30, 244 (1944)): a bulk
 * modulus linear in pressure, B(P) = B₀ + B₀′P.
 *
 *   E(V) = E₀ + B₀V/B₀′·[(V₀/V)^B₀′/(B₀′ − 1) + 1] − B₀V₀/(B₀′ − 1)
 *   P(V) = (B₀/B₀′)·[(V₀/V)^B₀′ − 1]
 *
 * Same as ASE's "murnaghan" and pymatgen's "murnaghan". Singular at
 * B₀′ = 1. Units: V in Å³, E in eV, P and B₀ in eV/Å³.
 */
export const murnaghan: EosModel = {
  name: "murnaghan",
  energy(volume, { e0, v0, b0, b1 }) {
    return (
      e0 +
      ((b0 * volume) / b1) * ((v0 / volume) ** b1 / (b1 - 1) + 1) -
      (v0 * b0) / (b1 - 1)
    );
  },
  pressure(volume, { v0, b0, b1 }) {
    return (b0 / b1) * ((v0 / volume) ** b1 - 1);
  },
};
