/**
 * Most common oxidation state per element, used only as an editable default
 * for point charges (e.g. Ewald ranking). Elements without a single dominant
 * state are omitted and default to 0.
 */
export const COMMON_OXIDATION_STATES = {
  H: 1,
  Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1,
  Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2,
  B: 3, Al: 3, Ga: 3, In: 3, Tl: 1,
  C: 4, Si: 4, Ge: 4, Sn: 4, Pb: 2,
  N: -3, P: 5, As: 5, Sb: 3, Bi: 3,
  O: -2, S: -2, Se: -2, Te: -2,
  F: -1, Cl: -1, Br: -1, I: -1,
  Sc: 3, Y: 3, La: 3, Ce: 3, Pr: 3, Nd: 3, Sm: 3, Eu: 3, Gd: 3, Tb: 3,
  Dy: 3, Ho: 3, Er: 3, Tm: 3, Yb: 3, Lu: 3,
  Ti: 4, Zr: 4, Hf: 4,
  V: 5, Nb: 5, Ta: 5,
  Cr: 3, Mo: 6, W: 6,
  Mn: 2, Fe: 3, Co: 2, Ni: 2, Cu: 2, Zn: 2,
  Ru: 3, Rh: 3, Pd: 2, Ag: 1, Cd: 2,
  Ir: 4, Pt: 2, Au: 3, Hg: 2,
  Th: 4, U: 4,
};

export function defaultCharge(symbol) {
  return COMMON_OXIDATION_STATES[symbol] ?? 0;
}
