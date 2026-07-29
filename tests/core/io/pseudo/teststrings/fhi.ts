import { loadFhi } from "../../../../helpers/external";

/** Real Hydrogen .fhi file (LDA, Troullier-Martins, l=0 local, 387 mesh pts). */
export const realHFhi = loadFhi(1, "H");

/** Real Carbon .fhi file (LDA, Troullier-Martins, l=0 local, 461 mesh pts). */
export const realCFhi = loadFhi(6, "C");

/** Real Nitrogen .fhi file (LDA, Troullier-Martins, l=0 local, 467 mesh pts). */
export const realNFhi = loadFhi(7, "N");

/** Real Oxygen .fhi file (LDA, Troullier-Martins, l=0 local, 473 mesh pts). */
export const realOFhi = loadFhi(8, "O");

/** Real Lithium .fhi file (LDA, Troullier-Martins, l=0 local, with NLCC). */
export const realLiFhi = loadFhi(3, "Li");
