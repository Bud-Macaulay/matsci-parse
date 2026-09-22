import type {
  BetaProjector,
  Pseudopotential,
  PseudopotentialWfc,
} from "../pseudopotential";

/** One angular-momentum channel of a pseudopotential. */
export interface LChannel {
  /** Angular momentum. */
  l: number;
  /** KB projectors in this channel. */
  betas: BetaProjector[];
  /** Semilocal potential value for this channel, if present. */
  semilocalVnl?: Float64Array;
  /** Pseudo-wavefunctions in this channel. */
  wfcs: PseudopotentialWfc[];
  /** True when this channel is the local channel. */
  isLocal: boolean;
}

/**
 * Group projectors, semilocal potentials and wavefunctions by l.
 *
 * @param pp - The pseudopotential to inspect.
 * @returns Channels sorted by angular momentum.
 */
export function listChannels(pp: Pseudopotential): LChannel[] {
  const byL = new Map<number, LChannel>();
  const get = (l: number): LChannel => {
    let ch = byL.get(l);
    if (!ch) {
      ch = {
        l,
        betas: [],
        wfcs: [],
        isLocal: l === pp.header.lLocal,
      };
      byL.set(l, ch);
    }
    return ch;
  };
  for (const beta of pp.nonlocal.betas) get(beta.angularMomentum).betas.push(beta);
  if (pp.semilocal) {
    for (const sl of pp.semilocal) get(sl.l).semilocalVnl = sl.vnl;
  }
  for (const wfc of pp.pswfc) get(wfc.l).wfcs.push(wfc);
  // Surface the local channel when it carries an l label (lLocal < 0 means
  // "no explicit local channel", as in some NC files).
  if (pp.header.lLocal >= 0) get(pp.header.lLocal);
  return [...byL.values()].sort((a, b) => a.l - b.l);
}
