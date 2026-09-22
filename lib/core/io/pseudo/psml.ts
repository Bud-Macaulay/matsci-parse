/**
 * PSML (PSeudopotential Markup Language) pseudopotential adapter.
 *
 * Converts between PSML text and the first-class Pseudopotential object
 * (canonical units Ry / Bohr).
 *
 * PSML is an XML-based format for norm-conserving pseudopotentials,
 * created by the ESL (Electronic Structure Library) initiative.
 * Native units: Hartree (energy), Bohr (length) — mandatory per schema.
 * Energies are converted to Ry on parse (×2) and back on serialize (×0.5).
 *
 * Loss notes: PSML stores only the diagonal KB energies (ekb); off-diagonal
 * D_ij couplings have no representation. PAW/US/augmentation/spin-orbit
 * data cannot round-trip; use `canWritePSML()` to check first.
 *
 * Reference: https://siesta-project.github.io/psml-docs/
 * Schema: http://esl.cecam.org/PSML/ns/1.2
 */

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialNonlocal,
  BetaProjector,
  PseudopotentialWfc,
  Provenance,
} from "../../pseudopotential/pseudopotential";

import { CANONICAL_UNITS } from "../../pseudopotential/pseudopotential";
import {
  RY_TO_HA,
  haToRy,
  haArrayToRy,
} from "../../pseudopotential/units";

import {
  parseFloat64Array,
  formatFortranNumber,
  formatDataArray,
} from "./fortran-helpers";

import {
  type XmlNode,
  attr,
  attrNum,
  attrInt,
  textOf,
  toArray,
  parseXml,
} from "./xml-helpers";

import { guessElement, elementToZ } from "./elements";

export interface PSMLConversionCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Report whether a first-class pseudopotential can be written as PSML.
 * PSML supports norm-conserving data only.
 */
export function canWritePSML(pp: Pseudopotential): PSMLConversionCheck {
  const reasons: string[] = [];
  if (pp.header.isUltrasoft || pp.header.isPaw || pp.header.pseudoType !== "NC") {
    reasons.push(`pseudoType ${pp.header.pseudoType} is not norm-conserving`);
  }
  if (pp.nonlocal.augmentation) {
    reasons.push("augmentation data has no PSML representation");
  }
  if (pp.header.hasSo || pp.spinOrbit) {
    reasons.push("spin-orbit data has no PSML representation");
  }
  if (pp.paw || pp.fullWfc || pp.gipaw) {
    reasons.push("PAW/GIPAW data has no PSML representation");
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Parse a PSML pseudopotential file into a first-class Pseudopotential.
 */
export function fromPSML(text: string): Pseudopotential {
  const parsed = parseXml(text);

  // Find root element (may have namespace prefix)
  const root = parsed["psml"] ?? parsed[`${"http://esl.cecam.org/PSML/ns/1.2"}:psml`] ?? parsed;

  // Provenance
  const provenanceData = root["provenance"];
  let creator: string | undefined;
  let date: string | undefined;
  if (provenanceData) {
    const provArr = toArray(provenanceData);
    if (provArr.length > 0) {
      const first = provArr[0];
      creator = attr(first, "creator") || undefined;
      date = attr(first, "date") || undefined;
    }
  }
  const provenance: Provenance = { sourceFormat: "PSML", creator, date };

  // Pseudo-atom spec
  const spec = root["pseudo-atom-spec"] ?? {};
  const element = attr(spec, "atomic-label") || guessElement(attrInt(spec, "atomic-number"));
  const zValence = attrNum(spec, "z-pseudo");
  const relativity = attr(spec, "relativity") || "scalar";
  const coreCorrections = attr(spec, "core-corrections") === "yes";

  // XC functional from libxc-info
  const xcInfo = spec["exchange-correlation"]?.["libxc-info"];
  let functional = "";
  if (xcInfo) {
    const funchs = toArray(xcInfo["functional"]);
    functional = funchs.map((f: XmlNode) => attr(f, "name")).join("+");
  }

  // Grid
  const gridNode = root["grid"];
  let r: Float64Array = new Float64Array(0);
  if (gridNode) {
    const gridData = gridNode["grid-data"];
    if (gridData) r = parseFloat64Array(textOf(gridData));
  }
  if (r.length === 0) throw new Error("Missing or empty grid in PSML file");

  // Compute rab from grid
  const rab = new Float64Array(r.length);
  for (let i = 1; i < r.length; i++) {
    rab[i] = r[i] - r[i - 1];
  }
  if (r.length > 1) rab[0] = rab[1];

  const mesh: PseudopotentialMesh = {
    gridType: "custom",
    rmax: r[r.length - 1],
    r,
    rab,
  };

  // Local potential (Hartree → Ry)
  const localNode = root["local-potential"];
  let localVloc: Float64Array = new Float64Array(r.length);
  if (localNode) {
    const dataNode = localNode["radfunc"]?.["data"];
    if (dataNode) localVloc = haArrayToRy(parseFloat64Array(textOf(dataNode)));
  }

  // Semilocal potentials (Hartree → Ry)
  const slNode = root["semilocal-potentials"];
  const semilocalPotentials: Pseudopotential["semilocal"] = [];
  const slSet = toArray(slNode);
  if (slSet.length > 0) {
    const slpsNodes = toArray(slSet[0]["slps"]);
    for (const slps of slpsNodes) {
      const l = lFromLetter(attr(slps, "l"));
      const dataNode = slps["radfunc"]?.["data"];
      const vnl = dataNode
        ? haArrayToRy(parseFloat64Array(textOf(dataNode)))
        : new Float64Array(r.length);
      semilocalPotentials.push({ l, vnl });
    }
  }

  // Nonlocal projectors (Hartree → Ry)
  const nlNode = root["nonlocal-projectors"];
  const betas: BetaProjector[] = [];
  const nlSet = toArray(nlNode);
  const ekbByIdx = new Map<number, number>();
  if (nlSet.length > 0) {
    const projNodes = toArray(nlSet[0]["proj"]);
    let idx = 1;
    for (const proj of projNodes) {
      const l = lFromLetter(attr(proj, "l"));
      const ekb = attrNum(proj, "ekb");
      ekbByIdx.set(idx, ekb);
      const dataNode = proj["radfunc"]?.["data"];
      const betaData = dataNode
        ? haArrayToRy(parseFloat64Array(textOf(dataNode)))
        : new Float64Array(r.length);
      betas.push({
        angularMomentum: l,
        ultrasoftCutoffRadius: 0,
        label: `${l}${lToLetter(l)}`,
        beta: betaData,
      });
      idx++;
    }
  }

  // Build D_ij from ekb values (diagonal; PSML stores no off-diagonal data)
  const dij: Array<[number, number, number]> = [];
  for (const [idx, ekb] of ekbByIdx) {
    dij.push([idx, idx, haToRy(ekb)]);
  }

  // Pseudo wavefunctions (dimensionless radial functions — no conversion)
  const pswfcNodes = toArray(root["pseudo-wave-functions"]);
  const pswfc: PseudopotentialWfc[] = [];
  if (pswfcNodes.length > 0) {
    const pswfNodes = toArray(pswfcNodes[0]["pswf"]);
    for (const pswf of pswfNodes) {
      const l = lFromLetter(attr(pswf, "l"));
      const n = attrInt(pswf, "n");
      const dataNode = pswf["radfunc"]?.["data"];
      const chi = dataNode ? parseFloat64Array(textOf(dataNode)) : new Float64Array(r.length);
      pswfc.push({
        l,
        occupation: 0,
        label: `${n}${lToLetter(l)}`,
        n,
        chi,
      });
    }
  }

  // Valence charge (density — no conversion; store as rhoatom)
  const vcNode = root["valence-charge"];
  let rhoatom: Float64Array = new Float64Array(r.length);
  if (vcNode) {
    const dataNode = vcNode["radfunc"]?.["data"];
    if (dataNode) rhoatom = parseFloat64Array(textOf(dataNode));
  }

  // Core charge (NLCC, density — no conversion)
  const ccNode = root["pseudocore-charge"];
  let nlcc: Float64Array | undefined;
  if (ccNode) {
    const dataNode = ccNode["radfunc"]?.["data"];
    if (dataNode) nlcc = parseFloat64Array(textOf(dataNode));
  }

  return {
    format: "PSML",
    units: { ...CANONICAL_UNITS },
    provenance,
    header: {
      element,
      pseudoType: "NC",
      relativistic: relativity as PseudopotentialHeader["relativistic"],
      isUltrasoft: false,
      isPaw: false,
      isCoulomb: false,
      hasSo: false,
      hasWfc: pswfc.length > 0,
      hasGipaw: false,
      pawAsGipaw: false,
      coreCorrection: coreCorrections,
      functional,
      zValence,
      totalPsenergy: 0,
      wfcCutoff: 0,
      rhoCutoff: 0,
      lMax: semilocalPotentials.length > 0
        ? Math.max(...semilocalPotentials.map((s) => s.l))
        : betas.length > 0
          ? Math.max(...betas.map((b) => b.angularMomentum))
          : 0,
      lMaxRho: 0,
      lLocal: 0,
      meshSize: r.length,
      numberOfWfc: pswfc.length,
      numberOfProj: betas.length,
    },
    mesh,
    local: { vloc: localVloc },
    semilocal: semilocalPotentials.length > 0 ? semilocalPotentials : undefined,
    nonlocal: { betas, dij },
    pswfc,
    rhoatom,
    nlcc,
  };
}

/**
 * Serialize a first-class Pseudopotential to PSML format.
 * Energies are written in Hartree (mandatory per the PSML schema).
 */
export function toPSML(pp: Pseudopotential): string {
  const r = pp.mesh.r;
  const npts = r.length;

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  xml += `<psml version="1.2" energy_unit="hartree" length_unit="bohr" uuid="matsci-parse">\n`;

  // Provenance: provenance fields take precedence; fall back to the UPF
  // header equivalents so generator stamps survive a hub conversion.
  {
    const provCreator =
      pp.provenance.creator ?? pp.header.generated ?? pp.header.author ?? "matsci-parse";
    const provDate =
      pp.provenance.date ?? pp.header.date ?? new Date().toISOString().split("T")[0];
    xml += `  <provenance creator="${provCreator}" date="${provDate}">\n`;
    xml += `    <annotation type="generated-by" value="matsci-parse pseudopotential library" />\n`;
    xml += `  </provenance>\n`;
  }

  // Pseudo-atom spec
  xml += `  <pseudo-atom-spec atomic-label="${pp.header.element}" atomic-number="${elementToZ(pp.header.element)}" z-pseudo="${pp.header.zValence}" relativity="${pp.header.relativistic}" core-corrections="${pp.header.coreCorrection ? "yes" : "no"}">\n`;
  if (pp.header.functional) {
    xml += `    <exchange-correlation>\n`;
    xml += `      <libxc-info number-of-functionals="0">\n`;
    xml += `        <functional name="${pp.header.functional}" />\n`;
    xml += `      </libxc-info>\n`;
    xml += `    </exchange-correlation>\n`;
  }
  xml += `  </pseudo-atom-spec>\n`;

  // Grid
  xml += `  <grid npts="${npts}">\n`;
  xml += `    <grid-data>\n`;
  xml += `      ${Array.from(r).map((v) => formatFortranNumber(v).trim()).join("  ")}\n`;
  xml += `    </grid-data>\n`;
  xml += `  </grid>\n`;

  const ha = (v: number): string => formatFortranNumber(v * RY_TO_HA).trim();

  // Local potential (Ry → Ha)
  xml += `  <local-potential>\n`;
  xml += `    <radfunc>\n`;
  xml += `      <data npts="${npts}">\n`;
  xml += `        ${Array.from(pp.local.vloc).map(ha).join("  ")}\n`;
  xml += `      </data>\n`;
  xml += `    </radfunc>\n`;
  xml += `  </local-potential>\n`;

  // Semilocal potentials (Ry → Ha)
  if (pp.semilocal && pp.semilocal.length > 0) {
    xml += `  <semilocal-potentials set="scalar_relativistic">\n`;
    for (const sl of pp.semilocal) {
      xml += `    <slps l="${lToLetter(sl.l)}" n="${sl.l + 1}" rc="0">\n`;
      xml += `      <radfunc>\n`;
      xml += `        <data npts="${npts}">${Array.from(sl.vnl).map(ha).join("  ")}</data>\n`;
      xml += `      </radfunc>\n`;
      xml += `    </slps>\n`;
    }
    xml += `  </semilocal-potentials>\n`;
  }

  // Nonlocal projectors (Ry → Ha); ekb from diagonal D_ij entries.
  const nonlocal: PseudopotentialNonlocal = pp.nonlocal;
  if (nonlocal.betas.length > 0) {
    xml += `  <nonlocal-projectors set="scalar_relativistic">\n`;
    let idx = 1;
    for (const beta of nonlocal.betas) {
      const ekbEntry = nonlocal.dij.find(([nb, mb]) => nb === idx && mb === idx);
      const ekb = ekbEntry ? ekbEntry[2] * RY_TO_HA : 1.0;
      xml += `    <proj l="${lToLetter(beta.angularMomentum)}" seq="${idx}" ekb="${formatFortranNumber(ekb).trim()}" type="kb">\n`;
      xml += `      <radfunc>\n`;
      xml += `        <data npts="${npts}">${Array.from(beta.beta).map(ha).join("  ")}</data>\n`;
      xml += `      </radfunc>\n`;
      xml += `    </proj>\n`;
      idx++;
    }
    xml += `  </nonlocal-projectors>\n`;
  }

  // Pseudo wavefunctions (dimensionless — no conversion)
  if (pp.pswfc.length > 0) {
    xml += `  <pseudo-wave-functions set="pseudo">\n`;
    for (const wfc of pp.pswfc) {
      xml += `    <pswf l="${lToLetter(wfc.l)}" n="${wfc.n ?? wfc.l + 1}">\n`;
      xml += `      <radfunc>\n`;
      xml += `        <data npts="${npts}">${formatDataArray(wfc.chi)}</data>\n`;
      xml += `      </radfunc>\n`;
      xml += `    </pswf>\n`;
    }
    xml += `  </pseudo-wave-functions>\n`;
  }

  // Valence charge
  if (pp.rhoatom.length > 0) {
    xml += `  <valence-charge total-charge="${pp.header.zValence}">\n`;
    xml += `    <radfunc>\n`;
    xml += `      <data npts="${npts}">${formatDataArray(pp.rhoatom)}</data>\n`;
    xml += `    </radfunc>\n`;
    xml += `  </valence-charge>\n`;
  }

  // Core charge (NLCC)
  if (pp.nlcc && pp.nlcc.length > 0) {
    xml += `  <pseudocore-charge>\n`;
    xml += `    <radfunc>\n`;
    xml += `      <data npts="${pp.nlcc.length}">${formatDataArray(pp.nlcc)}</data>\n`;
    xml += `    </radfunc>\n`;
    xml += `  </pseudocore-charge>\n`;
  }

  xml += `</psml>\n`;
  return xml;
}

function lFromLetter(letter: string): number {
  const map: Record<string, number> = { s: 0, p: 1, d: 2, f: 3, g: 4 };
  return map[letter.toLowerCase()] ?? 0;
}

function lToLetter(l: number): string {
  return "spdfg"[l] ?? String(l);
}
