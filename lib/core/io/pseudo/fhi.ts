/**
 * FHI98PP (.cpi / .fhi) pseudopotential parser and serializer.
 *
 * The FHI format stores norm-conserving pseudopotentials in semilocal form
 * on a logarithmic radial grid. Units: Hartree (energy), Bohr (length).
 *
 * Grid formula: r(i) = (exp(dx * i) - 1) / Z_eff
 * Stored data: V_l(r) = r * [V_nl(r) + Z_ion/r] (semilocal with Coulomb tail)
 *
 * References:
 * - Fuchs & Scheffler, Comput. Phys. Commun. 119, 67 (1999)
 * - ABINIT format 6: .fhi = ABINIT header + .cpi content
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
} from "../../pseudopotential/pseudopotential";

import {
  parseFortranNumber,
  parseFloat64Array,
  formatFortranNumber,
  formatDataArray,
  parseIntSafe,
} from "./fortran-helpers";

import { guessElement } from "./elements";

/**
 * Parse an FHI98PP pseudopotential file — auto-detects format.
 *
 * - `.fhi` format (ABINIT format 6): 7 ABINIT header lines + .cpi content
 * - `.cpi` format: starts directly with valence data
 *
 * Detection: if the first non-empty line starts with a digit → `.cpi`;
 * otherwise → `.fhi`.
 */
export function fromFHI(text: string): Pseudopotential {
  const allLines = text.split("\n");
  const firstNonEmpty = allLines.find((l) => l.trim().length > 0);
  if (!firstNonEmpty) throw new Error("FHI file too short to parse");

  // .fhi format (ABINIT format 6) starts with a text description.
  // .cpi format starts with a number (Z_val).
  if (/^\s*\d/.test(firstNonEmpty)) {
    return parseCpi(text);
  }
  return parseFhiHeader(text);
}

/**
 * Parse a raw .cpi body (without ABINIT header).
 *
 * Format:
 * Line 1: Z_val n_components
 * Lines 2+: legacy zero-header (variable length, scanned for the mesh line)
 * Then: index r(i) V_0(i) V_1(i) ... V_{lmax}(i) [f_core f_core' f_core'']
 */
function parseCpi(text: string): Pseudopotential {
  const allLines = text.split("\n").filter((l) => l.trim().length > 0);
  if (allLines.length < 4) {
    throw new Error("FHI file too short to parse");
  }

  // Line 1: Z_val, n_components
  const line1 = allLines[0].trim().split(/\s+/);
  const zValence = parseFortranNumber(line1[0]);
  const nComponents = parseIntSafe(line1[1]);
  const lMax = nComponents - 1;

  // Lines 2+: legacy header (variable number of zero lines).
  // Scan for the mesh line: first token is a positive integer (mesh_max),
  // second token is a floating-point number (dx).
  let meshLineIdx = 1;
  for (; meshLineIdx < allLines.length; meshLineIdx++) {
    const parts = allLines[meshLineIdx].trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const firstInt = parseIntSafe(parts[0]);
      if (firstInt > 0) break;
    }
  }
  const meshParts = allLines[meshLineIdx].trim().split(/\s+/).filter(Boolean);
  const meshMax = parseIntSafe(meshParts[0]);
  const dx = parseFortranNumber(meshParts[1]);

  // Parse data block (lines after mesh line)
  // Columns: index, r(i), V_0(i), V_1(i), ... [, f_core, f_core', f_core'']
  const rValues: number[] = [];
  const semilocal: Float64Array[] = [];
  for (let l = 0; l <= lMax; l++) {
    semilocal.push(new Float64Array(meshMax));
  }
  let hasNlcc = false;
  const nlccData: number[] = [];

  for (let i = meshLineIdx + 1; i < allLines.length && rValues.length < meshMax; i++) {
    const parts = allLines[i].trim().split(/\s+/).filter(Boolean);
    if (parts.length < 3) continue;

    const idx = parseIntSafe(parts[0]);
    const r = parseFortranNumber(parts[1]);

    // Semilocal potentials
    for (let l = 0; l <= lMax && l + 2 < parts.length; l++) {
      semilocal[l][rValues.length] = parseFortranNumber(parts[l + 2]);
    }

    // NLCC data (columns after semilocal potentials)
    const nlccStart = nComponents + 2;
    if (parts.length > nlccStart) {
      hasNlcc = true;
      nlccData.push(parseFortranNumber(parts[nlccStart]));
    }

    rValues.push(r);
  }

  // Build mesh
  const r = new Float64Array(rValues);
  const rmax = r[r.length - 1];

  // Compute rab (dr/di) from grid
  const rab = new Float64Array(r.length);
  for (let i = 1; i < r.length; i++) {
    rab[i] = r[i] - r[i - 1];
  }
  if (r.length > 1) rab[0] = rab[1];

  const mesh: PseudopotentialMesh = {
    gridType: "logarithmic",
    dx,
    rmax,
    r,
    rab,
  };

  // Convert semilocal to local potential (l=0 channel is typically the local part)
  // For FHI format, V_0 is the l=0 semilocal potential which includes the local part
  const local: PseudopotentialLocal = {
    vloc: semilocal.length > 0 ? semilocal[0] : new Float64Array(r.length),
  };

  // Store semilocal potentials
  const semilocalPotentials = semilocal.map((vnl, l) => ({
    l,
    vnl,
  }));

  // No KB projectors from FHI format — store as semilocal
  const nonlocal: PseudopotentialNonlocal = {
    betas: [],
    dij: [],
  };

  // Build rhoatom (approximate from semilocal if available)
  const rhoatom = new Float64Array(r.length);

  return {
    format: "CPI",
    version: "2.0.1",
    header: {
      element: "",
      pseudoType: "NC",
      relativistic: "scalar",
      isUltrasoft: false,
      isPaw: false,
      isCoulomb: false,
      hasSo: false,
      hasWfc: false,
      hasGipaw: false,
      pawAsGipaw: false,
      coreCorrection: hasNlcc,
      functional: "",
      zValence,
      totalPsenergy: 0,
      wfcCutoff: 0,
      rhoCutoff: 0,
      lMax,
      lMaxRho: lMax,
      lLocal: 0,
      meshSize: r.length,
      numberOfWfc: 0,
      numberOfProj: 0,
    },
    mesh,
    local,
    semilocal: semilocalPotentials,
    nonlocal,
    pswfc: [],
    rhoatom,
    nlcc: hasNlcc ? new Float64Array(nlccData) : undefined,
  };
}

/**
 * Parse an FHI .fhi file (ABINIT format 6).
 * Skips the 7 ABINIT header lines, then parses the .cpi body.
 */
function parseFhiHeader(text: string): Pseudopotential {
  // Skip 7 ABINIT header lines, then parse as .cpi
  const allLines = text.split("\n");
  const cpiContent = allLines.slice(7).join("\n");
  const pp = parseCpi(cpiContent);

  // Extract metadata from ABINIT header
  if (allLines.length >= 3) {
    const line2 = allLines[1].trim().split(/\s+/);
    if (line2.length >= 1) {
      const zatom = parseFloat(line2[0]);
      if (zatom > 0) pp.header.element = guessElement(zatom);
    }
    if (line2.length >= 2) {
      pp.header.zValence = parseFloat(line2[1]);
    }

    const line3 = allLines[2].trim().split(/\s+/);
    if (line3.length >= 3) {
      // pspcod should be 6 for FHI
      const pspxc = parseIntSafe(line3[1]);
      pp.header.xcCode = pspxc;
    }
  }

  return pp;
}

/**
 * Serialize a Pseudopotential to FHI .cpi format.
 */
export function toFHI(pp: Pseudopotential): string {
  const lines: string[] = [];

  const nComponents = pp.header.lMax + 1;
  const r = pp.mesh.r;

  // Line 1: Z_val, n_components
  lines.push(`${formatFortranNumber(pp.header.zValence, 20)}  ${nComponents}`);

  // Lines 2-10: legacy header (zeros)
  for (let i = 0; i < 9; i++) {
    lines.push("  0.0000    0.0000    0.0000   0.0000");
  }

  // Line 11: mesh_max, dx
  const dx = pp.mesh.dx ?? 0.01;
  lines.push(`${r.length.toString().padStart(6)}  ${formatFortranNumber(dx, 20)}`);

  // Data block
  for (let i = 0; i < r.length; i++) {
    const parts: string[] = [
      (i + 1).toString().padStart(5),
      formatFortranNumber(r[i], 20),
    ];

    // Semilocal potentials or local potential
    if (pp.semilocal && pp.semilocal.length > 0) {
      for (let l = 0; l <= pp.header.lMax; l++) {
        const sl = pp.semilocal.find((s) => s.l === l);
        parts.push(formatFortranNumber(sl ? sl.vnl[i] : 0, 20));
      }
    } else {
      // Use local potential for all channels
      for (let l = 0; l <= pp.header.lMax; l++) {
        parts.push(formatFortranNumber(pp.local.vloc[i], 20));
      }
    }

    // NLCC data
    if (pp.nlcc && i < pp.nlcc.length) {
      parts.push(formatFortranNumber(pp.nlcc[i], 20));
    }

    lines.push(parts.join(" "));
  }

  return lines.join("\n");
}


