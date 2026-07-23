/**
 * PSML (PSeudopotential Markup Language) pseudopotential parser and serializer.
 *
 * PSML is an XML-based format for norm-conserving pseudopotentials,
 * created by the ESL (Electronic Structure Library) initiative.
 * Units: Hartree (energy), Bohr (length) — mandatory per schema.
 *
 * Reference: https://siesta-project.github.io/psml-docs/
 * Schema: http://esl.cecam.org/PSML/ns/1.2
 */

import { XMLParser, XMLBuilder } from "fast-xml-parser";

import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
  PseudopotentialWfc,
  Provenance,
} from "../../pseudopotential/pseudopotential";

import {
  parseFortranNumber,
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
} from "./xml-helpers";

import { guessElement, elementToZ } from "./elements";

const PSML_NS = "http://esl.cecam.org/PSML/ns/1.2";
const PSML_NS_11 = "http://esl.cecam.org/PSML/ns/1.1";

function localName(name: string): string {
  // Strip namespace URI if present
  const idx = name.indexOf(":");
  return idx >= 0 ? name.substring(idx + 1) : name;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => {
    const ln = localName(name);
    return (
      ln === "provenance" ||
      ln === "slps" ||
      ln === "proj" ||
      ln === "pswf" ||
      ln === "shell" ||
      ln === "functional"
    );
  },
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressBooleanAttributes: false,
});

/**
 * Parse a PSML pseudopotential file.
 */
export function fromPSML(text: string): Pseudopotential {
  const parsed = parser.parse(text) as XmlNode;

  // Find root element (may have namespace prefix)
  const root = parsed["psml"] ?? parsed[`${PSML_NS}:psml`] ?? parsed;

  // Provenance
  const provenanceData = root["provenance"];
  let provenance: Provenance | undefined;
  if (provenanceData) {
    const provArr = toArray(provenanceData);
    if (provArr.length > 0) {
      const first = provArr[0];
      provenance = {
        creator: attr(first, "creator"),
        date: attr(first, "date"),
      };
    }
  }

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
  let r = new Float64Array(0);
  if (gridNode) {
    const gridData = gridNode["grid-data"];
    if (gridData) r = parseFloat64Array(textOf(gridData)) as Float64Array<ArrayBuffer>;
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

  // Local potential
  const localNode = root["local-potential"];
  let localVloc = new Float64Array(r.length);
  if (localNode) {
    const dataNode = localNode["radfunc"]?.["data"];
    if (dataNode) localVloc = parseFloat64Array(textOf(dataNode)) as Float64Array<ArrayBuffer>;
  }

  // Semilocal potentials
  const slNode = root["semilocal-potentials"];
  const semilocalPotentials: Pseudopotential["semilocal"] = [];
  const slSet = toArray(slNode);
  if (slSet.length > 0) {
    const slpsNodes = toArray(slSet[0]["slps"]);
    for (const slps of slpsNodes) {
      const l = lFromLetter(attr(slps, "l"));
      const dataNode = slps["radfunc"]?.["data"];
      const vnl = dataNode ? parseFloat64Array(textOf(dataNode)) : new Float64Array(r.length);
      semilocalPotentials.push({ l, vnl });
    }
  }

  // Nonlocal projectors
  const nlNode = root["nonlocal-projectors"];
  const betas: BetaProjector[] = [];
  const nlSet = toArray(nlNode);
  if (nlSet.length > 0) {
    const projNodes = toArray(nlSet[0]["proj"]);
    for (const proj of projNodes) {
      const l = lFromLetter(attr(proj, "l"));
      const ekb = attrNum(proj, "ekb");
      const dataNode = proj["radfunc"]?.["data"];
      const betaData = dataNode ? parseFloat64Array(textOf(dataNode)) : new Float64Array(r.length);
      betas.push({
        angularMomentum: l,
        ultrasoftCutoffRadius: 0,
        label: `${l}${String.fromCharCode(115 + l)}`,
        beta: betaData,
      });
    }
  }

  // Build D_ij from ekb values (diagonal)
  const dij: Array<[number, number, number]> = [];
  const nlSetForEkb = toArray(nlNode);
  if (nlSetForEkb.length > 0) {
    const projNodes = toArray(nlSetForEkb[0]["proj"]);
    let idx = 1;
    for (const proj of projNodes) {
      const ekb = attrNum(proj, "ekb");
      dij.push([idx, idx, ekb]);
      idx++;
    }
  }

  // Pseudo wavefunctions
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
        label: `${n}${String.fromCharCode(115 + l)}`,
        n,
        chi,
      });
    }
  }

  // Valence charge (store as rhoatom)
  const vcNode = root["valence-charge"];
  let rhoatom = new Float64Array(r.length);
  if (vcNode) {
    const dataNode = vcNode["radfunc"]?.["data"];
    if (dataNode) rhoatom = parseFloat64Array(textOf(dataNode)) as Float64Array<ArrayBuffer>;
  }

  // Core charge (NLCC)
  const ccNode = root["pseudocore-charge"];
  let nlcc: Float64Array | undefined;
  if (ccNode) {
    const dataNode = ccNode["radfunc"]?.["data"];
    if (dataNode) nlcc = parseFloat64Array(textOf(dataNode));
  }

  return {
    format: "PSML",
    version: "2.0.1",
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
 * Serialize a Pseudopotential to PSML format.
 */
export function toPSML(pp: Pseudopotential): string {
  const r = pp.mesh.r;
  const npts = r.length;

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  xml += `<psml version="1.2" energy_unit="hartree" length_unit="bohr" uuid="matsci-parse">\n`;

  // Provenance
  if (pp.provenance) {
    const provCreator = pp.provenance.creator ?? "matsci-parse";
    const provDate = pp.provenance.date ?? new Date().toISOString().split("T")[0];
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

  // Local potential
  xml += `  <local-potential>\n`;
  xml += `    <radfunc>\n`;
  xml += `      <data npts="${npts}">\n`;
  xml += `        ${formatDataArray(pp.local.vloc)}\n`;
  xml += `      </data>\n`;
  xml += `    </radfunc>\n`;
  xml += `  </local-potential>\n`;

  // Semilocal potentials
  if (pp.semilocal && pp.semilocal.length > 0) {
    xml += `  <semilocal-potentials set="scalar_relativistic">\n`;
    for (const sl of pp.semilocal) {
      xml += `    <slps l="${lToLetter(sl.l)}" n="${sl.l + 1}" rc="0">\n`;
      xml += `      <radfunc>\n`;
      xml += `        <data npts="${npts}">${formatDataArray(sl.vnl)}</data>\n`;
      xml += `      </radfunc>\n`;
      xml += `    </slps>\n`;
    }
    xml += `  </semilocal-potentials>\n`;
  }

  // Nonlocal projectors
  if (pp.nonlocal.betas.length > 0) {
    xml += `  <nonlocal-projectors set="scalar_relativistic">\n`;
    let idx = 1;
    for (const beta of pp.nonlocal.betas) {
      const ekbEntry = pp.nonlocal.dij.find(([nb]) => nb === idx);
      const ekb = ekbEntry ? ekbEntry[2] : 1.0;
      xml += `    <proj l="${lToLetter(beta.angularMomentum)}" seq="${idx}" ekb="${formatFortranNumber(ekb).trim()}" type="kb">\n`;
      xml += `      <radfunc>\n`;
      xml += `        <data npts="${npts}">${formatDataArray(beta.beta)}</data>\n`;
      xml += `      </radfunc>\n`;
      xml += `    </proj>\n`;
      idx++;
    }
    xml += `  </nonlocal-projectors>\n`;
  }

  // Pseudo wavefunctions
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
  return String.fromCharCode(115 + l); // 115 = 's'
}


