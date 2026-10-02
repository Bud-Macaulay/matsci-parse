/**
 * Chemical categories keyed by element symbol.
 *
 * Standalone and dependency-free: importing this module pulls in neither
 * the core table nor any other field. Values mirror mc-periodic-table's src/data (the source of truth).
 */

/** Chemical category of an element. */
export type ElementCategory =
  "actinide"
  | "alkali metal"
  | "alkaline earth metal"
  | "diatomic nonmetal"
  | "lanthanide"
  | "metalloid"
  | "noble gas"
  | "polyatomic nonmetal"
  | "post-transition metal"
  | "transition metal"
  | "unknown, predicted to be noble gas"
  | "unknown, probably metalloid"
  | "unknown, probably post-transition metal"
  | "unknown, probably transition metal";

/** Chemical category by element symbol. */
export const elementCategories: Readonly<Record<string, ElementCategory>> = {
  H: "diatomic nonmetal",
  He: "noble gas",
  Li: "alkali metal",
  Be: "alkaline earth metal",
  B: "metalloid",
  C: "polyatomic nonmetal",
  N: "diatomic nonmetal",
  O: "diatomic nonmetal",
  F: "diatomic nonmetal",
  Ne: "noble gas",
  Na: "alkali metal",
  Mg: "alkaline earth metal",
  Al: "post-transition metal",
  Si: "metalloid",
  P: "polyatomic nonmetal",
  S: "polyatomic nonmetal",
  Cl: "diatomic nonmetal",
  Ar: "noble gas",
  K: "alkali metal",
  Ca: "alkaline earth metal",
  Sc: "transition metal",
  Ti: "transition metal",
  V: "transition metal",
  Cr: "transition metal",
  Mn: "transition metal",
  Fe: "transition metal",
  Co: "transition metal",
  Ni: "transition metal",
  Cu: "transition metal",
  Zn: "transition metal",
  Ga: "post-transition metal",
  Ge: "metalloid",
  As: "metalloid",
  Se: "polyatomic nonmetal",
  Br: "diatomic nonmetal",
  Kr: "noble gas",
  Rb: "alkali metal",
  Sr: "alkaline earth metal",
  Y: "transition metal",
  Zr: "transition metal",
  Nb: "transition metal",
  Mo: "transition metal",
  Tc: "transition metal",
  Ru: "transition metal",
  Rh: "transition metal",
  Pd: "transition metal",
  Ag: "transition metal",
  Cd: "transition metal",
  In: "post-transition metal",
  Sn: "post-transition metal",
  Sb: "metalloid",
  Te: "metalloid",
  I: "diatomic nonmetal",
  Xe: "noble gas",
  Cs: "alkali metal",
  Ba: "alkaline earth metal",
  La: "lanthanide",
  Ce: "lanthanide",
  Pr: "lanthanide",
  Nd: "lanthanide",
  Pm: "lanthanide",
  Sm: "lanthanide",
  Eu: "lanthanide",
  Gd: "lanthanide",
  Tb: "lanthanide",
  Dy: "lanthanide",
  Ho: "lanthanide",
  Er: "lanthanide",
  Tm: "lanthanide",
  Yb: "lanthanide",
  Lu: "lanthanide",
  Hf: "transition metal",
  Ta: "transition metal",
  W: "transition metal",
  Re: "transition metal",
  Os: "transition metal",
  Ir: "transition metal",
  Pt: "transition metal",
  Au: "transition metal",
  Hg: "transition metal",
  Tl: "post-transition metal",
  Pb: "post-transition metal",
  Bi: "post-transition metal",
  Po: "post-transition metal",
  At: "metalloid",
  Rn: "noble gas",
  Fr: "alkali metal",
  Ra: "alkaline earth metal",
  Ac: "actinide",
  Th: "actinide",
  Pa: "actinide",
  U: "actinide",
  Np: "actinide",
  Pu: "actinide",
  Am: "actinide",
  Cm: "actinide",
  Bk: "actinide",
  Cf: "actinide",
  Es: "actinide",
  Fm: "actinide",
  Md: "actinide",
  No: "actinide",
  Lr: "actinide",
  Rf: "transition metal",
  Db: "transition metal",
  Sg: "transition metal",
  Bh: "transition metal",
  Hs: "transition metal",
  Mt: "unknown, probably transition metal",
  Ds: "unknown, probably transition metal",
  Rg: "unknown, probably transition metal",
  Cn: "transition metal",
  Nh: "unknown, probably transition metal",
  Fl: "post-transition metal",
  Mc: "unknown, probably post-transition metal",
  Lv: "unknown, probably post-transition metal",
  Ts: "unknown, probably metalloid",
  Og: "unknown, predicted to be noble gas",
};

/** Look up an element's chemical category.
 * @param symbol - Element symbol (e.g. "Fe").
 * @returns The category, or undefined if unknown. */
export function getElementCategory(symbol: string): ElementCategory | undefined {
  return elementCategories[symbol];
}
