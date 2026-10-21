import type { EosModel } from "./index";

/**
 * Vinet (Rose–Vinet universal) equation of state (Vinet et al., J. Phys. C
 * 19, L467 (1986)), with η = (V/V₀)^(1/3):
 *
 *   E(V) = E₀ + 2B₀V₀/(B₀′ − 1)²·{2 − [5 + 3B₀′(η − 1) − 3η]·exp(−(3/2)(B₀′ − 1)(η − 1))}
 *   P(V) = 3B₀·(1 − η)/η²·exp((3/2)(B₀′ − 1)(1 − η))
 *
 * Same as ASE's "vinet" and pymatgen's "vinet". Singular at B₀′ = 1.
 * Units: V in Å³, E in eV, P and B₀ in eV/Å³.
 */
export const vinet: EosModel = {
  name: "vinet",
  energy(volume, { e0, v0, b0, b1 }) {
    const eta = Math.cbrt(volume / v0);
    return (
      e0 +
      ((2 * b0 * v0) / (b1 - 1) ** 2) *
        (2 -
          (5 + 3 * b1 * (eta - 1) - 3 * eta) *
            Math.exp(-1.5 * (b1 - 1) * (eta - 1)))
    );
  },
  pressure(volume, { v0, b0, b1 }) {
    const eta = Math.cbrt(volume / v0);
    return (
      ((3 * b0 * (1 - eta)) / (eta * eta)) *
      Math.exp(1.5 * (b1 - 1) * (1 - eta))
    );
  },
};
