/**
 * GTH/HGH (Goedecker-Teter-Hutter / Hartwigsen-Goedecker-Hutter) adapter.
 *
 * Converts between GTH text and the first-class Pseudopotential object
 * (canonical units Ry / Bohr).
 *
 * GTH/HGH pseudopotentials are analytical, defined by Gaussian functions
 * rather than tabulated on a radial grid. The IR keeps BOTH: the analytical
 * parameters in `gth` (with `provenance.analytical = true`) and an evaluated
 * tabulation on a logarithmic grid for grid-based consumers.
 *
 * Native units: Hartree (energy), Bohr (length) — analytical parameters are
 * converted to Ry on parse (×2) and back on serialize (×0.5). Length-like
 * parameters (rLoc, rPs) are unit-free here (Bohr in both systems).
 *
 * Loss notes: k-matrix (SOC) is parsed when present (inline channel-line
 * remainder, or trailing block after the last channel) and round-trips;
 * entries without analytical GTH parameters cannot be written (`toGTH`
 * throws — use `canWriteGTH()` to check first).
 *
 * Reference:
 * - GTH: Goedecker, Teter, Hutter, PRB 54, 1703 (1996)
 * - HGH: Hartwigsen, Goedecker, Teter, Hutter, PRB 58, 3641 (1998)
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
  GthData,
  PseudopotentialFormat,
} from "../../pseudopotential/pseudopotential";

import { CANONICAL_UNITS } from "../../pseudopotential/pseudopotential";
import {
  RY_TO_HA,
  haToRy,
} from "../../pseudopotential/units";

import { makeRadialGrid } from "../../pseudopotential/operations";

import {
  parseFortranNumber,
  formatFortranNumber,
} from "./fortran-helpers";

export interface GTHConversionCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Report whether a first-class pseudopotential can be written as GTH.
 * Tabulated-only data cannot be inverted to analytical GTH form.
 */
export function canWriteGTH(pp: Pseudopotential): GTHConversionCheck {
  const reasons: string[] = [];
  if (!pp.gth) {
    reasons.push(
      "no GTH analytical parameters (tabulated-only data cannot be inverted to GTH form)",
    );
  }
  return { ok: reasons.length === 0, reasons };
}

export interface GthParsedEntry {
  element: string;
  potentialName: string;
  aliases: string[];
  nElec: number[];
  rLoc: number;
  nexpPpl: number;
  cexpPpl: number[];
  nprj: number;
  channels: Array<{
    r: number;
    nprjPpnl: number;
    hprj: number[][];
  }>;
  hasKprj: boolean;
  kprj?: number[][][];
}

/** True for comment / blank / entry-boundary lines vs numeric data lines. */
function isBoundaryLine(line: string | undefined): boolean {
  if (line === undefined) return true;
  const t = line.trim();
  return t === "" || t.startsWith("#") || !/^[-+.\d]/.test(t);
}

/**
 * Expand upper-triangle values (row-major: h11, h12, ..., h1n, h22, ...)
 * into a full symmetric n×n matrix, matching GthData's [channel][i][j].
 */
function upperToSymmetric(flat: number[], n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) m.push(new Array(n).fill(0));
  let pos = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = flat[pos++] ?? 0;
      m[i][j] = v;
      m[j][i] = v;
    }
  }
  return m;
}

/**
 * Parse a monolithic GTH_POTENTIALS file into individual element entries.
 */
export function parseGTHFile(text: string): GthParsedEntry[] {
  const entries: GthParsedEntry[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip comment lines and blank lines
    if (line.startsWith("#") || line === "") {
      i++;
      continue;
    }

    // This should be an element header line
    const headerParts = line.split(/\s+/);
    if (headerParts.length < 2) {
      i++;
      continue;
    }

    const element = headerParts[0];
    const potentialName = headerParts[1] ?? "";
    const aliases = headerParts.slice(2);
    i++;

    // Skip comment lines between entries
    while (i < lines.length && (lines[i].trim().startsWith("#") || lines[i].trim() === "")) {
      i++;
    }

    if (i >= lines.length) break;

    // Valence electron configuration
    const nElec = lines[i++].trim().split(/\s+/).map(Number);

    // Local part
    const localParts = lines[i++].trim().split(/\s+/);
    const rLoc = parseFortranNumber(localParts[0]);
    const nexpPpl = parseInt(localParts[1]);
    const cexpPpl: number[] = [];
    for (let k = 0; k < nexpPpl; k++) {
      cexpPpl.push(parseFortranNumber(localParts[2 + k]));
    }

    // Number of non-local projector channels
    const nprj = parseInt(lines[i++].trim());

    // Non-local projector channels
    const channels: GthParsedEntry["channels"] = [];
    let hasKprj = false;
    const kprjArrays: number[][][] = [];

    for (let l = 0; l < nprj && i < lines.length; l++) {
      const channelParts = lines[i++].trim().split(/\s+/);
      const r = parseFortranNumber(channelParts[0]);
      const nprjPpnl = parseInt(channelParts[1]);

      // Upper-triangle size of the h-matrix for this channel.
      const hNeeded = (nprjPpnl * (nprjPpnl + 1)) / 2;

      // Read h-matrix: inline tokens first, then one value per following line.
      const hFlat: number[] = [];
      let inlineIdx = 2;
      while (hFlat.length < hNeeded) {
        if (inlineIdx < channelParts.length) {
          hFlat.push(parseFortranNumber(channelParts[inlineIdx++]));
        } else if (i < lines.length) {
          hFlat.push(parseFortranNumber(lines[i++].trim().split(/\s+/)[0]));
        } else {
          hFlat.push(0);
        }
      }
      const hprj: number[][] = upperToSymmetric(hFlat, nprjPpnl);

      channels.push({ r, nprjPpnl, hprj });

      // k-matrix (SOC): inline remainder on the channel line, if present.
      const inlineRemainder = channelParts.slice(inlineIdx).map(parseFortranNumber);
      if (
        !hasKprj &&
        inlineRemainder.length >= hNeeded &&
        inlineRemainder.every(Number.isFinite)
      ) {
        hasKprj = true;
        const kFlat = inlineRemainder.slice(0, hNeeded);
        const kmat = upperToSymmetric(kFlat, nprjPpnl);
        while (kprjArrays.length < l) kprjArrays.push([]);
        kprjArrays.push(kmat);
      } else if (!hasKprj && l === nprj - 1 && hNeeded > 0) {
        // Trailing multi-line k block: only valid on the LAST channel, where
        // the lines after it must be an entry boundary (not next-channel data).
        const kFlat: number[] = [];
        let j = i;
        while (kFlat.length < hNeeded && j < lines.length && !isBoundaryLine(lines[j])) {
          kFlat.push(parseFortranNumber(lines[j].trim().split(/\s+/)[0]));
          j++;
        }
        if (kFlat.length === hNeeded && isBoundaryLine(lines[j])) {
          hasKprj = true;
          i = j;
          const kmat = upperToSymmetric(kFlat, nprjPpnl);
          while (kprjArrays.length < l) kprjArrays.push([]);
          kprjArrays.push(kmat);
        }
      }
    }

    entries.push({
      element,
      potentialName,
      aliases,
      nElec,
      rLoc,
      nexpPpl,
      cexpPpl,
      nprj,
      channels,
      hasKprj,
      kprj: hasKprj ? kprjArrays : undefined,
    });
  }

  return entries;
}

/**
 * Evaluate the GTH local potential on a radial grid.
 *
 * V_local(r) = -Zval/r * erf(r / (sqrt(2) * r_loc))
 *            + exp(-r²/(2r_loc²)) * (c0 + c1*(r/r_loc)² + c2*(r/r_loc)⁴ + c3*(r/r_loc)⁶)
 *
 * Units follow the units of cexpPpl (converted to Ry before calling).
 */
function evalGthLocal(r: Float64Array, zVal: number, rLoc: number, cexpPpl: number[]): Float64Array {
  const vloc = new Float64Array(r.length);
  const c = [0, 0, 0, 0];
  for (let k = 0; k < cexpPpl.length && k < 4; k++) {
    c[k] = cexpPpl[k];
  }

  for (let i = 0; i < r.length; i++) {
    const ri = r[i];
    if (ri < 1e-15) {
      // At r=0, use L'Hopital: V_local(0) = -2*Zval/(sqrt(2*pi)*rLoc) + c[0]
      vloc[i] = -2 * zVal / (Math.sqrt(2 * Math.PI) * rLoc) + c[0];
      continue;
    }

    const t = ri / rLoc;
    const t2 = t * t;
    const erfArg = ri / (Math.sqrt(2) * rLoc);
    const erfVal = erf(erfArg);
    const gauss = Math.exp(-t2 / 2);

    const coulomb = (-zVal / ri) * erfVal;
    const gaussian = gauss * (c[0] + c[1] * t2 + c[2] * t2 * t2 + c[3] * t2 * t2 * t2);

    vloc[i] = coulomb + gaussian;
  }

  return vloc;
}

/**
 * Evaluate a GTH projector on a radial grid.
 *
 * |r_{l,i}> = N * r^(l+2i-1) * exp(-r²/(2r_l²))
 */
function evalGthProjector(
  r: Float64Array,
  l: number,
  i: number,
  rL: number,
): Float64Array {
  const beta = new Float64Array(r.length);
  const exponent = l + 2 * (i + 1) - 1;

  // Normalization constant
  const norm = Math.sqrt(2) * Math.pow(2 / (rL * rL), exponent + 0.5) /
    Math.sqrt(gamma(exponent + 0.5));

  for (let k = 0; k < r.length; k++) {
    const ri = r[k];
    if (ri < 1e-15) {
      beta[k] = exponent === 0 ? norm : 0;
    } else {
      beta[k] = norm * Math.pow(ri, exponent) * Math.exp(-ri * ri / (2 * rL * rL));
    }
  }

  return beta;
}

/**
 * Parse a single GTH/HGH entry and convert to a first-class Pseudopotential.
 */
export function fromGTH(text: string): Pseudopotential {
  const entries = parseGTHFile(text);
  if (entries.length === 0) {
    throw new Error("No GTH entries found in file");
  }
  return fromGthEntry(entries[0]);
}

/**
 * Parse a single GTH entry into a first-class Pseudopotential.
 *
 * Analytical parameters are converted to Ry and stored in `gth` alongside
 * an evaluated tabulation on a logarithmic grid.
 */
export function fromGthEntry(entry: GthParsedEntry): Pseudopotential {
  const zVal = entry.nElec.reduce((a, b) => a + b, 0);
  const lMax = entry.channels.length > 0 ? entry.channels.length - 1 : 0;

  const format: PseudopotentialFormat = /HGH/i.test(entry.potentialName)
    ? "HGH"
    : "GTH";

  // Build a logarithmic radial grid
  const npts = 500;
  const rmax = 20.0; // Bohr, sufficient for most pseudopotentials
  const { r, rab } = makeRadialGrid({ npts, rmax, type: "log" });

  // Convert analytical energies Hartree → Ry.
  const cexpPplRy = entry.cexpPpl.map(haToRy);
  const hprjRy = entry.channels.map((ch) =>
    ch.hprj.map((row) => row.map(haToRy)),
  );
  const kprjRy = entry.kprj?.map((m) => m.map((row) => row.map(haToRy)));

  // Evaluate local potential (Ry)
  const localVloc = evalGthLocal(r, zVal, entry.rLoc, cexpPplRy);

  // Evaluate projectors (normalization is unit-free)
  const betas: BetaProjector[] = [];
  const dij: Array<[number, number, number]> = [];
  let projIdx = 1;

  for (let l = 0; l < entry.channels.length; l++) {
    const ch = entry.channels[l];
    for (let p = 0; p < ch.nprjPpnl; p++) {
      const betaData = evalGthProjector(r, l, p, ch.r);
      betas.push({
        index: projIdx + p,
        angularMomentum: l,
        ultrasoftCutoffRadius: 0,
        label: `${l}${"spdf"[l] ?? l}${p + 1}`,
        beta: betaData,
      });
    }
    // D_ij is the full h-block: for GTH the h-matrix couples the
    // projectors of a channel directly.
    for (let p = 0; p < ch.nprjPpnl; p++) {
      for (let q = 0; q < ch.nprjPpnl; q++) {
        dij.push([projIdx + p, projIdx + q, hprjRy[l]?.[p]?.[q] ?? (p === q ? 1.0 : 0)]);
      }
    }
    projIdx += ch.nprjPpnl;
  }

  const mesh: PseudopotentialMesh = {
    gridType: "logarithmic",
    rmax,
    r,
    rab,
  };

  // GTH analytical data (energies in Ry)
  const gthData: GthData = {
    nElec: entry.nElec,
    rLoc: entry.rLoc,
    cexpPpl: cexpPplRy,
    rPs: entry.channels.map((ch) => ch.r),
    hprj: hprjRy,
    kprj: kprjRy,
  };

  const header: PseudopotentialHeader = {
    element: entry.element,
    pseudoType: "NC",
    relativistic: "scalar",
    isUltrasoft: false,
    isPaw: false,
    isCoulomb: false,
    hasSo: entry.hasKprj,
    hasWfc: false,
    hasGipaw: false,
    pawAsGipaw: false,
    coreCorrection: false,
    functional: entry.potentialName,
    zValence: zVal,
    totalPsenergy: 0,
    wfcCutoff: 0,
    rhoCutoff: 0,
    lMax,
    lMaxRho: lMax,
    lLocal: 0,
    meshSize: npts,
    numberOfWfc: 0,
    numberOfProj: betas.length,
  };

  return {
    format,
    units: { ...CANONICAL_UNITS },
    provenance: {
      sourceFormat: format,
      analytical: true,
      notes:
        entry.aliases.length > 0 ? `aliases: ${entry.aliases.join(", ")}` : undefined,
    },
    header,
    mesh,
    local: { vloc: localVloc } satisfies PseudopotentialLocal,
    nonlocal: { betas, dij } satisfies PseudopotentialNonlocal,
    pswfc: [],
    rhoatom: new Float64Array(npts),
    gth: gthData,
  };
}

/**
 * Serialize a first-class Pseudopotential to GTH format (single element entry).
 * Analytical parameters are written back in Hartree (native GTH units);
 * the k-matrix is written inline on the channel line when present.
 */
export function toGTH(pp: Pseudopotential): string {
  const check = canWriteGTH(pp);
  if (!pp.gth) {
    throw new Error(check.reasons[0]);
  }

  const lines: string[] = [];
  const gth = pp.gth;

  lines.push(`# ${pp.header.element}  ${pp.header.functional}`);
  lines.push(`# Element symbol  Name of the potential  Alias names`);
  lines.push(`# n_elec(s)  n_elec(p)  n_elec(d)  ...`);
  lines.push(`# r_loc   nexp_ppl        cexp_ppl(1) ... cexp_ppl(nexp_ppl)`);
  lines.push(`# nprj`);
  lines.push(`${pp.header.element} ${pp.header.functional}`);

  // Valence electron configuration
  let nElec: number[];
  if (gth.nElec && gth.nElec.length > 0) {
    nElec = [...gth.nElec];
  } else {
    // Estimate from betas
    nElec = new Array(pp.header.lMax + 1).fill(0);
    for (const beta of pp.nonlocal.betas) {
      nElec[beta.angularMomentum] = Math.max(nElec[beta.angularMomentum], 1);
    }
    if (nElec[0] === 0) nElec[0] = Math.round(pp.header.zValence);
  }
  lines.push(nElec.join("  "));

  // Local part (Ry → Ha)
  const cHa = gth.cexpPpl.map((c) => c * RY_TO_HA);
  lines.push(`${formatFortranNumber(gth.rLoc)}  ${cHa.length}  ${cHa.map((c) => formatFortranNumber(c)).join("  ")}`);

  // Non-local part (Ry → Ha)
  lines.push(`${gth.rPs.length}`);
  for (let l = 0; l < gth.hprj.length; l++) {
    const h = gth.hprj[l];
    const nprj = h.length;
    const k = gth.kprj?.[l];
    if (k) {
      // k-matrix inline on the channel line so the parser recovers it.
      const hVals: string[] = [];
      for (let i = 0; i < nprj; i++) {
        for (let j = i; j < nprj; j++) {
          hVals.push(formatFortranNumber((h[i]?.[j] ?? 0) * RY_TO_HA));
        }
      }
      const kVals: string[] = [];
      for (let i = 0; i < nprj; i++) {
        for (let j = i; j < nprj; j++) {
          kVals.push(formatFortranNumber((k[i]?.[j] ?? 0) * RY_TO_HA));
        }
      }
      lines.push(
        `${formatFortranNumber(gth.rPs[l])}  ${nprj}  ${hVals.join("  ")}  ${kVals.join("  ")}`,
      );
    } else {
      lines.push(`${formatFortranNumber(gth.rPs[l])}  ${nprj}`);
      // h-matrix upper triangle
      for (let i = 0; i < nprj; i++) {
        for (let j = i; j < nprj; j++) {
          const val = (h[i]?.[j] ?? 0) * RY_TO_HA;
          lines.push(formatFortranNumber(val));
        }
      }
    }
  }

  return lines.join("\n");
}

// Simple error function approximation (Abramowitz & Stegun)
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

// Gamma function approximation (Stirling + Lanczos for small arguments)
function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
