/**
 * UPF v1 pseudopotential parser and serializer.
 *
 * UPF v1 is the legacy Quantum ESPRESSO format with `<SECTION>`/`</SECTION>`
 * delimiters (not XML attributes). Two header dialects exist:
 * - free-format Fortran reads (e.g. fhi2upf output, optional version number
 *   preamble line),
 * - labeled Vanderbilt `uspp`-converter lines (`V  Element`,
 *   `US  Ultrasoft pseudopotential`, …), which carry no preamble.
 * Units: Rydberg (energy), Bohr (length) — same as UPF v2.
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  AugmentationData,
  QijlFunction,
  BetaProjector,
  PseudopotentialWfc,
} from "../../pseudopotential/pseudopotential";

import { CANONICAL_UNITS } from "../../pseudopotential/pseudopotential";

import {
  parseFortranNumber,
  parseFloat64Array,
  formatFortranNumber,
  formatDataArray,
  parseIntSafe,
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
 * Parse PP_QIJ augmentation (Vanderbilt v1 dialect).
 *
 * Layout: an `nqf` count line, an optional PP_RINNER subsection of
 * `(index, value)` pairs, then per-(i, j, l) groups of a header line, a
 * Q_int norm line and numeric data lines, each followed by its own
 * PP_QFCOEF coefficient block. Q_int norms map to `q`, per-group
 * coefficients concatenate into `qfcoeff`, all in document order.
 */
function parseV1Augmentation(nonlocalSection: string | null): AugmentationData | undefined {
  if (!nonlocalSection) return undefined;
  const qijSection = extractSection(nonlocalSection, "PP_QIJ");
  if (!qijSection) return undefined;

  const groupRe = /^\s*(\d+)\s+(\d+)\s+(\d+)\b/;
  const numericRe = /^[\s\d.+\-EeDd]+$/;

  // PP_RINNER subsection holds (index, value) pairs.
  let rinner: Float64Array | undefined;
  const rinnerSection = extractSection(qijSection, "PP_RINNER");
  if (rinnerSection) {
    const vals: number[] = [];
    for (const line of lines(rinnerSection)) {
      const parts = line.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const v = parseFortranNumber(parts[1]);
        if (!Number.isNaN(v)) vals.push(v);
      }
    }
    if (vals.length > 0) rinner = new Float64Array(vals);
  }

  // Per-group PP_QFCOEF blocks, in document order.
  const qfcoeffParts: number[] = [];
  const qfRe = /<PP_QFCOEF>([\s\S]*?)<\/PP_QFCOEF>/g;
  let qfMatch: RegExpExecArray | null;
  while ((qfMatch = qfRe.exec(qijSection)) !== null) {
    for (const tok of qfMatch[1].trim().split(/\s+/).filter(Boolean)) {
      const v = parseFortranNumber(tok);
      if (!Number.isNaN(v)) qfcoeffParts.push(v);
    }
  }

  // Strip subsections so the group scan only sees headers, norms and data.
  const scrubbed = qijSection
    .replace(/<PP_RINNER>[\s\S]*?<\/PP_RINNER>/, "")
    .replace(/<PP_QFCOEF>[\s\S]*?<\/PP_QFCOEF>/g, "");
  const scan = lines(scrubbed);

  let nqf = 0;
  let k = 0;
  if (scan.length > 0 && !groupRe.test(scan[0])) {
    nqf = parseIntSafe(scan[0].trim().split(/\s+/)[0]);
    k = 1;
  }

  const qijl: QijlFunction[] = [];
  const q: number[] = [];
  while (k < scan.length) {
    const m = scan[k].match(groupRe);
    if (!m) {
      k++;
      continue;
    }
    const i = parseInt(m[1], 10);
    const j = parseInt(m[2], 10);
    const l = parseInt(m[3], 10);
    k++;
    // Q_int norm line: first token is the norm.
    if (k < scan.length) {
      const qv = parseFortranNumber(scan[k].trim().split(/\s+/)[0]);
      if (Number.isFinite(qv)) {
        q.push(qv);
        k++;
      }
    }
    // Numeric-only data lines.
    const data: number[] = [];
    while (k < scan.length && numericRe.test(scan[k])) {
      for (const tok of scan[k].trim().split(/\s+/).filter(Boolean)) {
        const v = parseFortranNumber(tok);
        if (!Number.isNaN(v)) data.push(v);
      }
      k++;
    }
    qijl.push({ i, j, l, qijl: new Float64Array(data) });
  }

  return {
    nqf,
    q: q.length > 0 ? new Float64Array(q) : undefined,
    qfcoeff: qfcoeffParts.length > 0 ? new Float64Array(qfcoeffParts) : undefined,
    rinner,
    qijl: qijl.length > 0 ? qijl : undefined,
  };
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
  // Detect UPF v1: either a version-number preamble line, or (Vanderbilt
  // dialect) a PP_HEADER section without a UPF v2 root element.
  const firstLine = text.trim().split("\n")[0].trim();
  const versionMatch = firstLine.match(/^(\d+)/);
  const looksV1 =
    !!versionMatch || (text.includes("<PP_HEADER>") && !text.includes("<UPF"));
  if (!looksV1) {
    throw new Error("Not a UPF v1 file: no version preamble and no PP_HEADER section");
  }

  // Extract header section
  const headerSection = extractSection(text, "PP_HEADER");
  if (!headerSection) throw new Error("Missing PP_HEADER section");

  const headerLines = lines(headerSection);

  // Parse header fields. Vanderbilt-dialect labeled lines take precedence
  // (and are skipped for the legacy heuristics below); anything else falls
  // back to free-format Fortran-read heuristics.
  let element = "X";
  let pseudoType: PseudopotentialHeader["pseudoType"] = "NC";
  let functional = "";
  let zValence = 0;
  let totalPsenergy = 0;
  let wfcCutoff = 0;
  let rhoCutoff = 0;
  let lMax = 0;
  let meshSize = 0;
  let numberOfWfc = 0;
  let numberOfProj = 0;
  let coreCorrection = false;

  /** Split a labeled line into [value, label]; null when no known label. */
  const labeledValue = (trimmed: string, label: RegExp): string | null => {
    const m = trimmed.match(label);
    return m ? m[1].trim() : null;
  };

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Vanderbilt labeled dialect (checked first; matched lines skip the
    // legacy heuristics so e.g. "T ..." cannot overwrite the element).
    const elementLabel = labeledValue(trimmed, /^['"]?([A-Za-z]{1,2})['"]?\s+Element\s*$/);
    if (elementLabel) {
      element = elementLabel.replace(/['"]/g, "");
      continue;
    }
    const typeLabel = labeledValue(trimmed, /^(\S+)\s+(?:Ultrasoft|Norm-conserving|PAW)\b.*$/i);
    if (typeLabel) {
      const t = typeLabel.toUpperCase();
      pseudoType = t === "US" ? "US" : t === "PAW" ? "PAW" : "NC";
      // A "Norm-conserving" line without a code prefix still means NC.
      if (/norm/i.test(trimmed) && t !== "US" && t !== "PAW") pseudoType = "NC";
      continue;
    }
    const nlccLabel = labeledValue(trimmed, /^(.*?)\s+Nonlinear Core Correction\s*$/i);
    if (nlccLabel !== null) {
      const v = nlccLabel.replace(/\./g, "").trim().toUpperCase();
      coreCorrection = v === "T" || v === "TRUE";
      continue;
    }
    const xcLabel = labeledValue(trimmed, /^(.*?)\s+Exchange-Correlation functional\s*$/i);
    if (xcLabel !== null) {
      functional = xcLabel.replace(/\s+/g, " ");
      continue;
    }
    const zLabel = labeledValue(trimmed, /^(.*?)\s+Z valence\s*$/i);
    if (zLabel !== null) {
      const v = parseFloat(zLabel.split(/\s+/)[0]);
      if (!Number.isNaN(v)) zValence = v;
      continue;
    }
    const etotLabel = labeledValue(trimmed, /^(.*?)\s+Total energy\s*$/i);
    if (etotLabel !== null) {
      const v = parseFloat(etotLabel.split(/\s+/)[0]);
      if (!Number.isNaN(v)) totalPsenergy = v;
      continue;
    }
    const ecutLabel = labeledValue(trimmed, /^(.*?)\s+Suggested cutoff[^\n]*$/i);
    if (ecutLabel !== null) {
      const nums = ecutLabel
        .split(/\s+/)
        .map(Number)
        .filter((v) => Number.isFinite(v));
      if (nums.length >= 1) wfcCutoff = nums[0];
      if (nums.length >= 2) rhoCutoff = nums[1];
      continue;
    }
    const lmaxLabel = labeledValue(trimmed, /^(.*?)\s+Max angular momentum[^\n]*$/i);
    if (lmaxLabel !== null) {
      const v = parseInt(lmaxLabel.split(/\s+/)[0], 10);
      if (!Number.isNaN(v)) lMax = v;
      continue;
    }
    const nwfcLabel = trimmed.match(/^(\d+)\s+(\d+)\s+Number of Wavefunctions/i);
    if (nwfcLabel) {
      numberOfWfc = parseInt(nwfcLabel[1], 10);
      numberOfProj = parseInt(nwfcLabel[2], 10);
      continue;
    }
    if (/Version Number\s*$/.test(trimmed)) continue;
    if (/Number of points in mesh\s*$/.test(trimmed)) {
      const v = parseInt(trimmed.split(/\s+/)[0], 10);
      if (!Number.isNaN(v)) meshSize = v;
      continue;
    }
    // Wavefunction table rows ("3S  0  2.00"): counts come from the line
    // above; skip so legacy heuristics never see them.
    if (/^\S+\s+\d+\s+[\d.]+\s*$/.test(trimmed)) continue;
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
    // Core correction: Fortran boolean or a standalone T token (a bare
    // substring test would false-positive on labels like "Total energy").
    if (trimmed.includes(".true.") || /(?:^|\s)T(?:\s|$)/.test(trimmed)) {
      coreCorrection = true;
    }
  }

  // Parse PP_MESH section
  const meshSection = extractSection(text, "PP_MESH");
  let r: Float64Array = new Float64Array(0);
  let rab: Float64Array = new Float64Array(0);

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
          const rawLabel =
            metaParts.length >= 3 ? metaParts[2].replace(/['"]/g, "") : `l=${l}`;
          // Vanderbilt blocks label every projector "Beta"; qualify with the
          // projector index so labels stay distinct.
          const label =
            rawLabel === "Beta" ? `Beta ${metaParts[0]}` : rawLabel;

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

  // Parse PP_QIJ augmentation (Vanderbilt v1 dialect, child of PP_NONLOCAL).
  const augmentation = parseV1Augmentation(nonlocalSection);
  const nonlocal: PseudopotentialNonlocal = {
    betas,
    dij,
    nqf: augmentation?.nqf,
    augmentation,
  };

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

  // Parse PP_NLCC section (optional)
  const nlccSection = extractSection(text, "PP_NLCC");
  const nlcc = nlccSection ? parseFloat64Array(nlccSection) : undefined;

  // Parse PP_RHOATOM section
  const rhoatomSection = extractSection(text, "PP_RHOATOM");
  const rhoatom = rhoatomSection ? parseFloat64Array(rhoatomSection) : new Float64Array(meshSize);

  return {
    format: "UPF1",
    version: "1.0.0",
    units: { ...CANONICAL_UNITS },
    provenance: { sourceFormat: "UPF1" },
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
      totalPsenergy,
      wfcCutoff,
      rhoCutoff,
      lMax,
      lMaxRho: lMax,
      lLocal: 0,
      meshSize,
      numberOfWfc,
      numberOfProj,
    },
    mesh,
    nlcc,
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
