/**
 * UPF v1 pseudopotential parser and serializer.
 *
 * UPF v1 is the legacy Quantum ESPRESSO format with fixed-width headers
 * and `<SECTION>`/`</SECTION>` delimiters (not XML attributes).
 * Units: Rydberg (energy), Bohr (length) — same as UPF v2.
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
  PseudopotentialWfc,
} from "../../pseudopotential/pseudopotential";

import {
  parseFortranNumber,
  parseFloat64Array,
  formatFortranNumber,
  formatDataArray,
} from "./fortran-helpers";

function extractSection(text: string, tag: string): string | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const end = text.indexOf(close, start);
  if (end === -1) return null;
  return text.substring(start + open.length, end);
}

function extractSubSection(text: string, tag: string): string | null {
  return extractSection(text, tag);
}

function lines(text: string): string[] {
  return text.split("\n").filter((l) => l.trim().length > 0);
}

/**
 * Parse a UPF v1 pseudopotential string.
 *
 * UPF v1 format:
 * - First line: version number (0 or 1)
 * - Header: element, type, functional, z_valence, etc.
 * - `<PP_MESH>`: radial grid
 * - `<PP_LOCAL>`: local potential
 * - `<PP_NONLOCAL>`: projectors and D_ij
 * - `<PP_PSWFC>`: pseudo wavefunctions
 * - `<PP_RHOATOM>`: atomic charge density
 */
export function fromUPFv1(text: string): Pseudopotential {
  // Detect UPF v1: first non-empty line should be a number
  const firstLine = text.trim().split("\n")[0].trim();
  const versionMatch = firstLine.match(/^(\d+)/);
  if (!versionMatch) {
    throw new Error("Not a UPF v1 file: first line is not a version number");
  }

  // Extract header section
  const headerSection = extractSection(text, "PP_HEADER");
  if (!headerSection) throw new Error("Missing PP_HEADER section");

  const headerLines = lines(headerSection);

  // Parse header fields (UPF v1 uses free-format Fortran reads)
  // Line format varies; we parse what we can find
  let element = "X";
  let pseudoType: PseudopotentialHeader["pseudoType"] = "NC";
  let functional = "";
  let zValence = 0;
  let lMax = 0;
  let meshSize = 0;
  let numberOfWfc = 0;
  let numberOfProj = 0;
  let coreCorrection = false;

  for (const line of headerLines) {
    const trimmed = line.trim();
    // Try to extract element from first meaningful line
    // Handle quoted element names like 'H' or unquoted like H
    const elemMatch = trimmed.match(/^['"]?([A-Z][a-z]?)['"]?(?:\s|$)/);
    if (elemMatch) {
      element = elemMatch[1];
    }
    // Look for pseudo type indicators
    if (trimmed.includes("'NC'") || trimmed.includes('"NC"') || trimmed.includes("NC")) {
      pseudoType = "NC";
    }
    if (trimmed.includes("'US'") || trimmed.includes('"US"') || trimmed.includes("US")) {
      pseudoType = "US";
    }
    if (trimmed.includes("'PAW'") || trimmed.includes('"PAW"') || trimmed.includes("PAW")) {
      pseudoType = "PAW";
    }
    // Look for functional (quoted string like 'SLA-PW-PBE-PBE')
    const funcMatch = trimmed.match(/^['"]([^'"]+)['"]/);
    if (funcMatch && (funcMatch[1].includes("SLA") || funcMatch[1].includes("PBE") || funcMatch[1].includes("LDA"))) {
      functional = funcMatch[1];
    }
    // Look for z_valence
    const zMatch = trimmed.match(/(\d+\.?\d*)\s*(?:zp|z_valence|z_p)/i);
    if (zMatch) zValence = parseFloat(zMatch[1]);
    // Look for lmax
    const lmaxMatch = trimmed.match(/lmax\s*=\s*(\d+)/i);
    if (lmaxMatch) lMax = parseInt(lmaxMatch[1]);
    // Look for mesh size
    const meshMatch = trimmed.match(/mesh\s*=\s*(\d+)/i);
    if (meshMatch) meshSize = parseInt(meshMatch[1]);
    // Look for number of wavefunctions and projectors
    const nwfcMatch = trimmed.match(/(\d+)\s+(\d+)\s+(?:nwfc|nbeta)/i);
    if (nwfcMatch) {
      numberOfWfc = parseInt(nwfcMatch[1]);
      numberOfProj = parseInt(nwfcMatch[2]);
    }
    // Core correction
    if (trimmed.includes(".true.") || trimmed.includes("T")) {
      coreCorrection = true;
    }
  }

  // Parse PP_MESH section
  const meshSection = extractSection(text, "PP_MESH");
  let r = new Float64Array(0);
  let rab = new Float64Array(0);

  if (meshSection) {
    const rSection = extractSubSection(meshSection, "PP_R");
    const rabSection = extractSubSection(meshSection, "PP_RAB");
    if (rSection) r = parseFloat64Array(rSection);
    if (rabSection) rab = parseFloat64Array(rabSection);
  }

  if (r.length === 0) throw new Error("Empty or missing PP_R section");
  meshSize = r.length;

  const mesh: PseudopotentialMesh = {
    gridType: "logarithmic",
    rmax: r[r.length - 1],
    r,
    rab,
  };

  // Parse PP_LOCAL section
  const localSection = extractSection(text, "PP_LOCAL");
  if (!localSection) throw new Error("Missing PP_LOCAL section");
  const local: PseudopotentialLocal = { vloc: parseFloat64Array(localSection) };

  // Parse PP_NONLOCAL section
  const nonlocalSection = extractSection(text, "PP_NONLOCAL");
  const betas: BetaProjector[] = [];
  const dij: Array<[number, number, number]> = [];

  if (nonlocalSection) {
    // Parse beta projectors
    const betaMatches = nonlocalSection.match(/<PP_BETA[^>]*>([\s\S]*?)<\/PP_BETA>/g);
    if (betaMatches) {
      for (const betaBlock of betaMatches) {
        const inner = betaBlock.replace(/<\/?PP_BETA[^>]*>/g, "");
        const innerLines = lines(inner);
        if (innerLines.length >= 2) {
          // First line: nbeta, lll, label
          const metaParts = innerLines[0].trim().split(/\s+/);
          const l = metaParts.length >= 2 ? parseInt(metaParts[1]) : 0;
          const label = metaParts.length >= 3 ? metaParts[2].replace(/['"]/g, "") : `l=${l}`;

          // Second line: kkbeta (cutoff index)
          const cutoffLine = innerLines[1].trim().split(/\s+/);
          const cutoffIndex = cutoffLine.length >= 1 ? parseInt(cutoffLine[0]) : 0;

          // Remaining lines: projector data
          const dataText = innerLines.slice(1).join("\n");
          const betaData = parseFloat64Array(dataText.replace(/^\s*\d+\s+/gm, ""));

          betas.push({
            angularMomentum: l,
            cutoffRadiusIndex: cutoffIndex,
            ultrasoftCutoffRadius: 0,
            label,
            beta: betaData,
          });
        }
      }
    }

    // Parse D_ij
    const dijSection = extractSection(nonlocalSection, "PP_DIJ");
    if (dijSection) {
      const dijLines = lines(dijSection);
      for (const line of dijLines) {
        const parts = line.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const nb = parseInt(parts[0]);
          const mb = parseInt(parts[1]);
          const val = parseFortranNumber(parts[2]);
          if (!isNaN(nb) && !isNaN(mb) && !isNaN(val)) {
            dij.push([nb, mb, val]);
          }
        }
      }
    }
  }

  const nonlocal: PseudopotentialNonlocal = { betas, dij };

  // Parse PP_PSWFC section
  const pswfcSection = extractSection(text, "PP_PSWFC");
  const pswfc: PseudopotentialWfc[] = [];

  if (pswfcSection) {
    const pswfcLines = lines(pswfcSection);
    let i = 0;
    while (i < pswfcLines.length) {
      const line = pswfcLines[i].trim();
      // Wavefunction header: label l oc
      const wfcMatch = line.match(/['"]?(\w+)['"]?\s+(\d+)\s+([\d.]+)/);
      if (wfcMatch) {
        const label = wfcMatch[1];
        const l = parseInt(wfcMatch[2]);
        const occupation = parseFloat(wfcMatch[3]);
        i++;
        // Collect data lines until next header or end
        const dataLines: string[] = [];
        while (i < pswfcLines.length && !pswfcLines[i].trim().match(/['"]?\w+['"]?\s+\d+\s+[\d.]+/)) {
          dataLines.push(pswfcLines[i]);
          i++;
        }
        const chi = parseFloat64Array(dataLines.join("\n"));
        pswfc.push({ l, occupation, label, chi });
      } else {
        i++;
      }
    }
  }

  // Parse PP_RHOATOM section
  const rhoatomSection = extractSection(text, "PP_RHOATOM");
  const rhoatom = rhoatomSection ? parseFloat64Array(rhoatomSection) : new Float64Array(meshSize);

  return {
    format: "UPF1",
    version: "1.0.0",
    header: {
      element,
      pseudoType,
      relativistic: "scalar",
      isUltrasoft: pseudoType === "US",
      isPaw: pseudoType === "PAW",
      isCoulomb: false,
      hasSo: false,
      hasWfc: pswfc.length > 0,
      hasGipaw: false,
      pawAsGipaw: false,
      coreCorrection,
      functional,
      zValence,
      totalPsenergy: 0,
      wfcCutoff: 0,
      rhoCutoff: 0,
      lMax,
      lMaxRho: lMax,
      lLocal: 0,
      meshSize,
      numberOfWfc,
      numberOfProj,
    },
    mesh,
    local,
    nonlocal,
    pswfc,
    rhoatom,
  };
}

/**
 * Serialize a Pseudopotential to UPF v1 format.
 *
 * NOTE: UPF v1 is a legacy format. This serializer produces valid UPF v1
 * but UPF v2 is preferred for new files.
 */
export function toUPFv1(pp: Pseudopotential): string {
  const lines: string[] = [];

  // Version line
  lines.push("     0");
  lines.push("<PP_HEADER>");
  lines.push(`  '${pp.header.element}'`);
  lines.push(`  '${pp.header.pseudoType}'`);
  lines.push(`  ${pp.header.coreCorrection ? ".true." : ".false."}          nlcc`);
  lines.push(`  '${pp.header.functional}'          dft`);
  lines.push(`  ${pp.header.zValence.toFixed(8)}          zp`);
  lines.push(`  ${pp.header.totalPsenergy.toFixed(8)}          etotps`);
  lines.push(`  ${pp.header.wfcCutoff.toFixed(2)}   ${pp.header.rhoCutoff.toFixed(2)}          ecutwfc,ecutrho`);
  lines.push(`     ${pp.header.lMax}   'lmax'`);
  lines.push(`     ${pp.mesh.r.length}   'mesh'`);
  lines.push(`     ${pp.pswfc.length}   ${pp.nonlocal.betas.length}   'nwfc nbeta'`);

  // Wavefunction labels
  for (const wfc of pp.pswfc) {
    lines.push(`  '${wfc.label ?? "wfc"}'  ${wfc.l}  ${wfc.occupation.toFixed(4)}`);
  }

  lines.push("</PP_HEADER>");

  lines.push("<PP_MESH>");
  lines.push("<PP_R>");
  lines.push(formatDataArray(pp.mesh.r));
  lines.push("</PP_R>");
  lines.push("<PP_RAB>");
  lines.push(formatDataArray(pp.mesh.rab));
  lines.push("</PP_RAB>");
  lines.push("</PP_MESH>");

  if (pp.nlcc) {
    lines.push("<PP_NLCC>");
    lines.push(formatDataArray(pp.nlcc));
    lines.push("</PP_NLCC>");
  }

  lines.push("<PP_LOCAL>");
  lines.push(formatDataArray(pp.local.vloc));
  lines.push("</PP_LOCAL>");

  lines.push("<PP_NONLOCAL>");
  for (let i = 0; i < pp.nonlocal.betas.length; i++) {
    const beta = pp.nonlocal.betas[i];
    lines.push(`<PP_BETA>`);
    lines.push(`    ${i + 1}    ${beta.angularMomentum}  '${beta.label}'`);
    lines.push(`    ${pp.mesh.r.length}`);
    lines.push(formatDataArray(beta.beta));
    lines.push(`</PP_BETA>`);
  }
  lines.push("<PP_DIJ>");
  for (const [nb, mb, val] of pp.nonlocal.dij) {
    lines.push(`  ${nb}  ${mb}  ${formatFortranNumber(val)}`);
  }
  lines.push("</PP_DIJ>");
  lines.push("</PP_NONLOCAL>");

  if (pp.pswfc.length > 0) {
    lines.push("<PP_PSWFC>");
    for (const wfc of pp.pswfc) {
      lines.push(`  '${wfc.label ?? "wfc"}'  ${wfc.l}  ${wfc.occupation.toFixed(8)}`);
      lines.push(formatDataArray(wfc.chi));
    }
    lines.push("</PP_PSWFC>");
  }

  lines.push("<PP_RHOATOM>");
  lines.push(formatDataArray(pp.rhoatom));
  lines.push("</PP_RHOATOM>");

  return lines.join("\n");
}
