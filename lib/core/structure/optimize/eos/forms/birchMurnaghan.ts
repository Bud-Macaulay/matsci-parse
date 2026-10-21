import type { EosModel } from "./index";

/**
 * Third-order Birch–Murnaghan equation of state (Birch, Phys. Rev. 71, 809
 * (1947)), with x = (V₀/V)^(2/3) − 1:
 *
 *   E(V) = E₀ + (9/16)·B₀V₀·[2x² + (B₀′ − 4)·x³]
 *   P(V) = (3/2)·B₀·[(V₀/V)^(7/3) − (V₀/V)^(5/3)]·[1 + (3/4)(B₀′ − 4)·x]
 *
 * Identical to ASE's "birchmurnaghan" (and "birch") and pymatgen's
 * "birch_murnaghan". Units: V in Å³, E in eV, P and B₀ in eV/Å³.
 */
export const birchMurnaghan: EosModel = {
  name: "birchMurnaghan",
  energy(volume, { e0, v0, b0, b1 }) {
    const x = (v0 / volume) ** (2 / 3) - 1;
    return e0 + (9 / 16) * b0 * v0 * x * x * (2 + (b1 - 4) * x);
  },
  pressure(volume, { v0, b0, b1 }) {
    const r = v0 / volume;
    const x = r ** (2 / 3) - 1;
    return 1.5 * b0 * (r ** (7 / 3) - r ** (5 / 3)) * (1 + 0.75 * (b1 - 4) * x);
  },
};
