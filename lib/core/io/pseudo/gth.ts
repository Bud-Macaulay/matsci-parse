/**
 * GTH/HGH (Goedecker-Teter-Hutter / Hartwigsen-Goedecker-Hutter) parser.
 *
 * GTH/HGH pseudopotentials are analytical, defined by Gaussian functions
 * rather than tabulated on a radial grid. At parse time, we evaluate the
 * analytical expressions on a logarithmic grid for the IR.
 *
 * Units: Hartree (energy), Bohr (length).
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
} from "../../pseudopotential/pseudopotential";

function parseFortranNumber(s: string): number {
  return Number.parseFloat(s.replace(/[dD]/g, "e"));
}

function formatFortranNumber(n: number, width = 20): string {
  const s = n.toExponential(15);
  const d = s.replace(/e/, "D").replace(/e\+/, "D+").replace(/e-/, "D-");
  return d.padStart(width);
}

function formatDataArray(arr: Float64Array, columns = 4): string {
  const lines: string[] = [];
  for (let i = 0; i < arr.length; i += columns) {
    const row: string[] = [];
    for (let j = 0; j < columns && i + j < arr.length; j++) {
      row.push(formatFortranNumber(arr[i + j]));
    }
    lines.push(row.join(" "));
  }
  return lines.join("\n");
}

interface GthParsedEntry {
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

      // Read h-matrix upper triangle.
      // CP2K format puts values on the same line after r and nprjPpnl;
      // the hand-crafted format puts them on separate lines.
      const hprj: number[][] = [];
      let inlineIdx = 2;
      for (let ii = 0; ii < nprjPpnl; ii++) {
        hprj.push([]);
        for (let jj = ii; jj < nprjPpnl; jj++) {
          if (inlineIdx < channelParts.length) {
            hprj[ii].push(parseFortranNumber(channelParts[inlineIdx++]));
          } else if (i < lines.length) {
            hprj[ii].push(parseFortranNumber(lines[i++].trim().split(/\s+/)[0]));
          } else {
            hprj[ii].push(0);
          }
        }
      }

      channels.push({ r, nprjPpnl, hprj });

      // Check for k-matrix (SOC) — follows h-matrix if present
      // In GTH_SOC_POTENTIALS, the k-matrix has the same structure
      // For now, we don't parse it from the standard GTH_POTENTIALS
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
 * Parse a single GTH/HGH entry and convert to Pseudopotential IR.
 */
export function fromGTH(text: string): Pseudopotential {
  const entries = parseGTHFile(text);
  if (entries.length === 0) {
    throw new Error("No GTH entries found in file");
  }
  return fromGthEntry(entries[0]);
}

/**
 * Parse a single GTH entry into a Pseudopotential.
 */
export function fromGthEntry(entry: GthParsedEntry): Pseudopotential {
  const zVal = entry.nElec.reduce((a, b) => a + b, 0);
  const lMax = entry.channels.length > 0 ? entry.channels.length - 1 : 0;

  // Build a logarithmic radial grid
  const npts = 500;
  const rmax = 20.0; // Bohr, sufficient for most pseudopotentials
  const r = new Float64Array(npts);
  const rab = new Float64Array(npts);
  const dx = Math.log(rmax) / (npts - 1);
  for (let i = 0; i < npts; i++) {
    r[i] = Math.exp(dx * i);
    rab[i] = r[i] * dx;
  }
  if (npts > 1) {
    r[0] = r[1] * 0.01; // Avoid r=0 for erf evaluation
    rab[0] = r[0] * dx;
  }

  // Evaluate local potential
  const localVloc = evalGthLocal(r, zVal, entry.rLoc, entry.cexpPpl);

  // Evaluate projectors
  const betas: BetaProjector[] = [];
  const dij: Array<[number, number, number]> = [];
  let projIdx = 1;

  for (let l = 0; l < entry.channels.length; l++) {
    const ch = entry.channels[l];
    for (let p = 0; p < ch.nprjPpnl; p++) {
      const betaData = evalGthProjector(r, l, p, ch.r);
      betas.push({
        angularMomentum: l,
        ultrasoftCutoffRadius: 0,
        label: `${l}${String.fromCharCode(115 + l)}${p + 1}`,
        beta: betaData,
      });

      // D_ij from h-matrix (diagonal for single projectors)
      const hij = ch.hprj[p]?.[p] ?? 1.0;
      dij.push([projIdx, projIdx, hij]);
      projIdx++;
    }
  }

  // GTH analytical data
  const gthData: GthData = {
    nElec: entry.nElec,
    rLoc: entry.rLoc,
    cexpPpl: entry.cexpPpl,
    rPs: entry.channels.map((ch) => ch.r),
    hprj: entry.channels.map((ch) => ch.hprj),
    kprj: entry.kprj,
  };

  return {
    format: "GTH",
    version: "2.0.1",
    header: {
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
    },
    mesh: {
      gridType: "logarithmic",
      rmax: rmax,
      r,
      rab,
    },
    local: { vloc: localVloc },
    nonlocal: { betas, dij },
    pswfc: [],
    rhoatom: new Float64Array(npts),
    gth: gthData,
  };
}

/**
 * Serialize a Pseudopotential to GTH format (single element entry).
 */
export function toGTH(pp: Pseudopotential): string {
  if (!pp.gth) {
    throw new Error("Pseudopotential does not have GTH analytical parameters");
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

  // Local part
  lines.push(`${formatFortranNumber(gth.rLoc)}  ${gth.cexpPpl.length}  ${gth.cexpPpl.map((c) => formatFortranNumber(c)).join("  ")}`);

  // Non-local part
  lines.push(`${gth.rPs.length}`);
  for (let l = 0; l < gth.hprj.length; l++) {
    const h = gth.hprj[l];
    const nprj = h.length;
    lines.push(`${formatFortranNumber(gth.rPs[l])}  ${nprj}`);
    // h-matrix upper triangle
    for (let i = 0; i < nprj; i++) {
      for (let j = i; j < nprj; j++) {
        const val = h[i]?.[j] ?? 0;
        lines.push(formatFortranNumber(val));
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
