import type {
  Pseudopotential,
  PseudopotentialHeader,
  PseudopotentialMesh,
  PseudopotentialLocal,
  PseudopotentialNonlocal,
  BetaProjector,
  PseudopotentialWfc,
  FullWfc,
  AugmentationData,
  PawData,
  GipawData,
  SpinOrbitData,
  RelativisticWfc,
  RelativisticBeta,
  QijlFunction,
  PseudopotentialType,
  RelativisticType,
  UPFVersion,
} from "../../pseudopotential/pseudopotential";

import { CANONICAL_UNITS } from "../../pseudopotential/pseudopotential";

import {
  parseFortranNumber,
  parseFortranBool,
  parseFloat64Array,
  parseIntSafe,
  formatFortranNumber,
  formatFortranBool,
  escapeXmlAttr,
  formatDataArray,
} from "./fortran-helpers";

import {
  type XmlNode,
  attr,
  attrNum,
  attrInt,
  attrBool,
  textOf,
  toArray,
  entries,
  parseXml,
} from "./xml-helpers";

function parseData(text: string): Float64Array {
  return parseFloat64Array(text);
}

/** Parse optional radial data: undefined when the element has no text. */
function parseOptionalData(text: string): Float64Array | undefined {
  return text.trim() ? parseData(text) : undefined;
}

// ── Section parsers ────────────────────────────────────────────────

function parseHeader(node: XmlNode): PseudopotentialHeader {
  return {
    generated: attr(node, "generated") || undefined,
    author: attr(node, "author") || undefined,
    date: attr(node, "date") || undefined,
    comment: attr(node, "comment") || undefined,
    element: attr(node, "element").trim(),
    pseudoType: (attr(node, "pseudo_type") as PseudopotentialType) || "NC",
    relativistic: (attr(node, "relativistic") as RelativisticType) || "scalar",
    isUltrasoft: attrBool(node, "is_ultrasoft"),
    isPaw: attrBool(node, "is_paw"),
    isCoulomb: attrBool(node, "is_coulomb"),
    hasSo: attrBool(node, "has_so"),
    hasWfc: attrBool(node, "has_wfc"),
    hasGipaw: attrBool(node, "has_gipaw"),
    pawAsGipaw: attrBool(node, "paw_as_gipaw"),
    coreCorrection: attrBool(node, "core_correction"),
    functional: attr(node, "functional"),
    zValence: attrNum(node, "z_valence"),
    totalPsenergy: attrNum(node, "total_psenergy"),
    wfcCutoff: attrNum(node, "wfc_cutoff"),
    rhoCutoff: attrNum(node, "rho_cutoff"),
    lMax: attrInt(node, "l_max"),
    lMaxRho: attrInt(node, "l_max_rho"),
    lLocal: attrInt(node, "l_local", -1),
    meshSize: attrInt(node, "mesh_size"),
    numberOfWfc: attrInt(node, "number_of_wfc"),
    numberOfProj: attrInt(node, "number_of_proj"),
  };
}

function parseMesh(node: XmlNode): PseudopotentialMesh {
  const dx = attr(node, "dx") ? attrNum(node, "dx") : undefined;
  return {
    gridType: dx != null ? "logarithmic" : "custom",
    dx,
    mesh: attr(node, "mesh") ? attrInt(node, "mesh") : undefined,
    xmin: attr(node, "xmin") ? attrNum(node, "xmin") : undefined,
    rmax: attrNum(node, "rmax"),
    zmesh: attr(node, "zmesh") ? attrNum(node, "zmesh") : undefined,
    r: parseData(textOf(node["PP_R"])),
    rab: parseData(textOf(node["PP_RAB"])),
  };
}

function parseLocal(node: XmlNode): PseudopotentialLocal {
  return { vloc: parseData(textOf(node)) };
}

function parseBeta(node: XmlNode): BetaProjector {
  return {
    index: attr(node, "index") ? attrInt(node, "index") : undefined,
    angularMomentum: attrInt(node, "angular_momentum"),
    cutoffRadiusIndex: attr(node, "cutoff_radius_index")
      ? attrInt(node, "cutoff_radius_index")
      : undefined,
    cutoffRadius: attr(node, "cutoff_radius")
      ? attrNum(node, "cutoff_radius")
      : undefined,
    normConservingRadius: attr(node, "norm_conserving_radius")
      ? attrNum(node, "norm_conserving_radius")
      : undefined,
    ultrasoftCutoffRadius: attrNum(node, "ultrasoft_cutoff_radius"),
    label: attr(node, "label"),
    beta: parseData(textOf(node)),
  };
}

function parseQijlKey(key: string): { i: number; j: number; l: number } | null {
  const m = key.match(/^PP_QIJL\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { i: parseIntSafe(m[1]), j: parseIntSafe(m[2]), l: parseIntSafe(m[3]) };
}

function parseAugmentation(node: XmlNode): AugmentationData {
  const qijl: QijlFunction[] = [];
  for (const [key, val] of entries(node)) {
    const ids = parseQijlKey(key);
    if (ids) {
      for (const q of toArray(val)) {
        qijl.push({ ...ids, qijl: parseData(textOf(q)) });
      }
    }
  }
  qijl.sort((a, b) => a.i - b.i || a.j - b.j || a.l - b.l);

  return {
    nqf: attr(node, "nqf") ? attrInt(node, "nqf") : undefined,
    nqlc: attr(node, "nqlc") ? attrInt(node, "nqlc") : undefined,
    qWithL: attr(node, "q_with_l") ? attrBool(node, "q_with_l") : undefined,
    shape: attr(node, "shape") || undefined,
    rMatchAugfun: attr(node, "r_match_augfun")
      ? attrNum(node, "r_match_augfun")
      : undefined,
    cutoffR: attr(node, "cutoff_r")
      ? attrNum(node, "cutoff_r")
      : undefined,
    cutoffRIndex: attr(node, "cutoff_r_index")
      ? attrInt(node, "cutoff_r_index")
      : attr(node, "iraug")
        ? attrInt(node, "iraug")
        : undefined,
    irc: attr(node, "irc") ? attrInt(node, "irc") : undefined,
    lmaxAug: attr(node, "l_max_aug")
      ? attrInt(node, "l_max_aug")
      : attr(node, "lmax_aug")
        ? attrInt(node, "lmax_aug")
        : undefined,
    augmentationEpsilon: attr(node, "augmentation_epsilon")
      ? attrNum(node, "augmentation_epsilon")
      : undefined,
    q: node["PP_Q"] ? parseData(textOf(node["PP_Q"])) : undefined,
    multipoles: node["PP_MULTIPOLES"]
      ? parseData(textOf(node["PP_MULTIPOLES"]))
      : undefined,
    qfcoeff: node["PP_QFCOEFF"]
      ? parseData(textOf(node["PP_QFCOEFF"]))
      : undefined,
    rinner: node["PP_RINNER"]
      ? parseData(textOf(node["PP_RINNER"]))
      : undefined,
    qijl: qijl.length > 0 ? qijl : undefined,
  };
}

function parseNonlocal(node: XmlNode): PseudopotentialNonlocal {
  const betas: BetaProjector[] = [];
  for (const [key, val] of entries(node)) {
    if (key === "PP_BETA" || key.startsWith("PP_BETA.")) {
      betas.push(...toArray(val).map(parseBeta));
    }
  }

  const dijText = textOf(node["PP_DIJ"]);
  const tokens = dijText.trim().split(/\s+/).filter(Boolean).map(parseFortranNumber);
  const dij: Array<[number, number, number]> = [];

  if (tokens.length > 0) {
    const nProj = betas.length;

    // Triplet format wins when every (nb, mb) pair is a plausible 1-based
    // projector index. This resolves the ambiguity where a triplet file
    // with nProj diagonal entries has exactly nProj^2 tokens (e.g. 3
    // projectors with 3 diagonal triplets = 9 tokens): a flat matrix of
    // floats is essentially never index-clean, while real triplets always
    // are.
    let tripletClean = false;
    if (nProj > 0 && tokens.length % 3 === 0) {
      tripletClean = true;
      for (let k = 0; k < tokens.length; k += 3) {
        const nb = tokens[k];
        const mb = tokens[k + 1];
        if (
          !Number.isInteger(nb) ||
          !Number.isInteger(mb) ||
          nb < 1 ||
          mb < 1 ||
          nb > nProj ||
          mb > nProj
        ) {
          tripletClean = false;
          break;
        }
      }
    }

    if (tripletClean) {
      for (let k = 0; k < tokens.length; k += 3) {
        dij.push([tokens[k], tokens[k + 1], tokens[k + 2]]);
      }
    }
    // Flat matrix format: tokens.length == nProj^2, row-major
    else if (nProj > 0 && tokens.length === nProj * nProj) {
      for (let i = 0; i < nProj; i++) {
        for (let j = 0; j < nProj; j++) {
          dij.push([i + 1, j + 1, tokens[i * nProj + j]]);
        }
      }
    }
    // Lenient fallback: token count divisible by 3, parsed as triplets
    // even when the indices look out of range (legacy tolerance).
    else if (tokens.length % 3 === 0) {
      for (let k = 0; k < tokens.length; k += 3) {
        dij.push([tokens[k], tokens[k + 1], tokens[k + 2]]);
      }
    }
  }

  // PP_AUGMENTATION (optional, child of PP_NONLOCAL)
  const augmentation = node["PP_AUGMENTATION"]
    ? parseAugmentation(node["PP_AUGMENTATION"])
    : undefined;

  // nqf lives on the augmentation block; mirror it for convenience.
  const nqf = augmentation?.nqf ?? undefined;

  return { betas, dij, nqf, augmentation };
}

function parsePswfcNode(node: XmlNode): PseudopotentialWfc {
  return {
    l: attrInt(node, "l"),
    occupation: attrNum(node, "occupation"),
    label: attr(node, "label"),
    n: attr(node, "n") ? attrInt(node, "n") : undefined,
    pseudoEnergy: attr(node, "pseudo_energy")
      ? attrNum(node, "pseudo_energy")
      : undefined,
    cutoffRadius: attr(node, "cutoff_radius")
      ? attrNum(node, "cutoff_radius")
      : undefined,
    ultrasoftCutoffRadius: attr(node, "ultrasoft_cutoff_radius")
      ? attrNum(node, "ultrasoft_cutoff_radius")
      : undefined,
    chi: parseData(textOf(node)),
  };
}

function parseFullWfcNode(node: XmlNode): FullWfc {
  return {
    l: attrInt(node, "l"),
    label: attr(node, "label"),
    aewfc: parseData(textOf(node)),
  };
}

/** Parse PP_PAW, including any non-standard PP_AEWFC/PP_PSWFC children. */
function parsePaw(node: XmlNode): PawData {
  const innerAeWfcs: FullWfc[] = [];
  const innerPsWfcs: FullWfc[] = [];
  for (const [key, val] of entries(node)) {
    if (key === "PP_AEWFC" || key.startsWith("PP_AEWFC.")) {
      for (const wfc of toArray(val)) innerAeWfcs.push(parseFullWfcNode(wfc));
    }
    if (key === "PP_PSWFC" || key.startsWith("PP_PSWFC.")) {
      for (const wfc of toArray(val)) innerPsWfcs.push(parseFullWfcNode(wfc));
    }
  }
  return {
    pawDataFormat: attrInt(node, "paw_data_format"),
    coreEnergy: attrNum(node, "core_energy"),
    occupations: node["PP_OCCUPATIONS"]
      ? parseData(textOf(node["PP_OCCUPATIONS"]))
      : new Float64Array(0),
    aeNlcc: node["PP_AE_NLCC"]
      ? parseData(textOf(node["PP_AE_NLCC"]))
      : new Float64Array(0),
    aeVloc: node["PP_AE_VLOC"]
      ? parseData(textOf(node["PP_AE_VLOC"]))
      : new Float64Array(0),
    aeWfcs: innerAeWfcs,
    psWfcs: innerPsWfcs,
  };
}

function parseGipaw(
  node: XmlNode,
  tag: "PP_GIPAW" | "PP_GIPAW_RECONSTRUCTION",
): GipawData {
  const coreOrbitals: GipawData["coreOrbitals"] = [];
  const coreOrbsSection = node["PP_GIPAW_CORE_ORBITALS"];
  if (coreOrbsSection) {
    for (const [key, val] of entries(coreOrbsSection)) {
      if (key.startsWith("PP_GIPAW_CORE_ORBITAL.")) {
        for (const co of toArray(val)) {
          coreOrbitals.push({
            n: attrInt(co, "n"),
            l: attrInt(co, "l"),
            orbital: parseData(textOf(co)),
          });
        }
      }
    }
  }

  const orbitals: GipawData["orbitals"] = [];
  const orbsSection = node["PP_GIPAW_ORBITALS"];
  if (orbsSection) {
    for (const [key, val] of entries(orbsSection)) {
      if (key.startsWith("PP_GIPAW_ORBITAL.")) {
        for (const orb of toArray(val)) {
          orbitals.push({
            l: attrInt(orb, "l"),
            label: attr(orb, "label"),
            aeOrbital: orb["PP_GIPAW_ORBITAL_AE"]
              ? parseData(textOf(orb["PP_GIPAW_ORBITAL_AE"]))
              : new Float64Array(0),
            psOrbital: orb["PP_GIPAW_ORBITAL_PS"]
              ? parseData(textOf(orb["PP_GIPAW_ORBITAL_PS"]))
              : new Float64Array(0),
          });
        }
      }
    }
  }

  let vlocAe: Float64Array = new Float64Array(0);
  let vlocPs: Float64Array = new Float64Array(0);
  const vlocalSection = node["PP_GIPAW_VLOCAL"];
  if (vlocalSection) {
    vlocAe = vlocalSection["GIPAW_VLOCAL_AE"]
      ? parseData(textOf(vlocalSection["GIPAW_VLOCAL_AE"]))
      : vlocAe;
    vlocPs = vlocalSection["GIPAW_VLOCAL_PS"]
      ? parseData(textOf(vlocalSection["GIPAW_VLOCAL_PS"]))
      : vlocPs;
  }

  return {
    tag,
    gipawDataFormat: attrInt(node, "gipaw_data_format"),
    coreOrbitals,
    orbitals,
    vlocAe,
    vlocPs,
  };
}

function parseRelWfc(node: XmlNode): RelativisticWfc {
  return {
    jchi: attrNum(node, "jchi"),
    index: attr(node, "index") ? attrInt(node, "index") : undefined,
    els: attr(node, "els") || undefined,
    nn: attr(node, "nn") ? attrInt(node, "nn") : undefined,
    lchi: attr(node, "lchi") ? attrInt(node, "lchi") : undefined,
    oc: attr(node, "oc") ? attrNum(node, "oc") : undefined,
    chi: parseOptionalData(textOf(node)),
  };
}

function parseRelBeta(node: XmlNode): RelativisticBeta {
  return {
    jjj: attrNum(node, "jjj"),
    index: attr(node, "index") ? attrInt(node, "index") : undefined,
    lll: attr(node, "lll") ? attrInt(node, "lll") : undefined,
    beta: parseOptionalData(textOf(node)),
  };
}

function parseSpinOrbit(node: XmlNode): SpinOrbitData {
  const relWfcs: RelativisticWfc[] = [];
  const relBetas: RelativisticBeta[] = [];
  for (const [key, val] of entries(node)) {
    if (key === "PP_RELWFC" || key.startsWith("PP_RELWFC.")) {
      for (const wfc of toArray(val)) relWfcs.push(parseRelWfc(wfc));
    }
    if (key === "PP_RELBETA" || key.startsWith("PP_RELBETA.")) {
      for (const beta of toArray(val)) relBetas.push(parseRelBeta(beta));
    }
  }
  return { relWfcs, relBetas };
}

/** Extract raw PP_INPUTFILE content (may hold non-XML generator input). */
function extractInputFile(text: string): string | undefined {
  const m = text.match(/<PP_INPUTFILE>([\s\S]*?)<\/PP_INPUTFILE>/);
  if (!m) return undefined;
  const content = m[1].trim();
  return content || undefined;
}

// ── Main parser ────────────────────────────────────────────────────

/**
 * Parse a UPF v2.0.1 pseudopotential string into a first-class
 * Pseudopotential object.
 *
 * @param text - The complete UPF file content as a string.
 * @returns A parsed Pseudopotential object.
 * @throws If the text is not valid UPF v2.0.1 format.
 */
export function fromUPF(text: string): Pseudopotential {
  const doc = parseXml(text);

  const upf: XmlNode = doc?.UPF;
  if (!upf) {
    throw new Error("Not a UPF file: missing <UPF> root element");
  }

  const version = ((attr(upf, "version") || "2.0.1") as UPFVersion);

  // PP_INFO (optional, plain text)
  const info = upf["PP_INFO"] ? textOf(upf["PP_INFO"]).trim() || undefined : undefined;

  // PP_INPUTFILE (optional, raw text — may contain generator input)
  const inputFile = extractInputFile(text);

  // PP_HEADER (required, self-closing tag with attributes)
  if (!upf["PP_HEADER"]) {
    throw new Error("Missing PP_HEADER section");
  }
  const header = parseHeader(upf["PP_HEADER"]);

  // PP_MESH (required)
  if (!upf["PP_MESH"]) {
    throw new Error("Missing PP_MESH section");
  }
  const mesh = parseMesh(upf["PP_MESH"]);

  // PP_NLCC (optional)
  const nlcc = upf["PP_NLCC"] ? parseData(textOf(upf["PP_NLCC"])) : undefined;

  // PP_LOCAL (required)
  if (!upf["PP_LOCAL"]) {
    throw new Error("Missing PP_LOCAL section");
  }
  const local = parseLocal(upf["PP_LOCAL"]);

  // PP_SEMILOCAL (optional)
  let semilocal: Pseudopotential["semilocal"] | undefined;
  if (upf["PP_SEMILOCAL"]) {
    semilocal = toArray<XmlNode>(upf["PP_SEMILOCAL"]["PP_VNL"]).map((vnl: XmlNode) => ({
      l: attrInt(vnl, "L"),
      j: attr(vnl, "J") ? attrNum(vnl, "J") : undefined,
      vnl: parseData(textOf(vnl)),
    }));
  }

  // PP_NONLOCAL (required)
  if (!upf["PP_NONLOCAL"]) {
    throw new Error("Missing PP_NONLOCAL section");
  }
  const nonlocal = parseNonlocal(upf["PP_NONLOCAL"]);

  // PP_PSWFC (optional)
  const pswfcRaw = upf["PP_PSWFC"];
  const pswfc: PseudopotentialWfc[] = [];
  if (pswfcRaw) {
    for (const [key, val] of entries(pswfcRaw)) {
      if (key === "PP_CHI" || key.startsWith("PP_CHI.")) {
        for (const chi of toArray(val)) {
          pswfc.push(parsePswfcNode(chi));
        }
      }
    }
  }

  // PP_FULL_WFC (optional, PAW only)
  let fullWfc: FullWfc[] | undefined;
  if (upf["PP_FULL_WFC"]) {
    const wfcs: FullWfc[] = [];
    for (const [key, val] of entries(upf["PP_FULL_WFC"])) {
      if (key === "PP_AEWFC" || key.startsWith("PP_AEWFC")) {
        for (const wfc of toArray(val)) {
          wfcs.push(parseFullWfcNode(wfc));
        }
      }
    }
    fullWfc = wfcs.length > 0 ? wfcs : undefined;
  }

  // PP_RHOATOM (required)
  if (!upf["PP_RHOATOM"]) {
    throw new Error("Missing PP_RHOATOM section");
  }
  const rhoatom = parseData(textOf(upf["PP_RHOATOM"]));

  // PP_PAW (optional)
  const paw = upf["PP_PAW"] ? parsePaw(upf["PP_PAW"]) : undefined;

  // PP_GIPAW (optional — tag may be PP_GIPAW or PP_GIPAW_RECONSTRUCTION)
  const gipaw = upf["PP_GIPAW"]
    ? parseGipaw(upf["PP_GIPAW"], "PP_GIPAW")
    : upf["PP_GIPAW_RECONSTRUCTION"]
      ? parseGipaw(upf["PP_GIPAW_RECONSTRUCTION"], "PP_GIPAW_RECONSTRUCTION")
      : undefined;

  // PP_SPIN_ORB (optional)
  const spinOrbit = upf["PP_SPIN_ORB"]
    ? parseSpinOrbit(upf["PP_SPIN_ORB"])
    : undefined;

  // Merge any non-standard inner PAW wavefunctions into the top-level lists
  // (UPF v2.0.1 spec keeps PP_FULL_WFC / PP_PSWFC as siblings of PP_PAW, but
  // some generators nest PP_AEWFC / PP_PSWFC inside PP_PAW).
  if (paw) {
    if (paw.aeWfcs.length > 0) {
      fullWfc = [...(fullWfc ?? []), ...paw.aeWfcs];
    }
    if (paw.psWfcs.length > 0 && pswfc.length === 0) {
      for (const w of paw.psWfcs) {
        pswfc.push({ l: w.l, occupation: 0, label: w.label, chi: w.aewfc });
      }
    }
    paw.aeWfcs = fullWfc ?? [];
    paw.psWfcs =
      paw.psWfcs.length > 0
        ? paw.psWfcs
        : pswfc.map((w) => ({
            l: w.l,
            label: w.label ?? "",
            aewfc: w.chi,
          }));
  }

  return {
    format: "UPF2",
    version,
    units: { ...CANONICAL_UNITS },
    provenance: { sourceFormat: "UPF2" },
    info,
    inputFile,
    header,
    mesh,
    nlcc,
    local,
    semilocal,
    nonlocal,
    pswfc,
    fullWfc,
    rhoatom,
    paw,
    gipaw,
    spinOrbit,
  };
}

// ── Serializer ─────────────────────────────────────────────────────

/**
 * Serialize a first-class Pseudopotential object back to UPF v2.0.1 format.
 *
 * @param pp - The pseudopotential to serialize.
 * @returns The UPF file content as a string.
 */
export function toUPF(pp: Pseudopotential): string {
  const lines: string[] = [];

  lines.push(`<UPF version="${pp.version ?? "2.0.1"}">`);
  lines.push("");

  // PP_INFO
  if (pp.info) {
    lines.push("<PP_INFO>");
    lines.push(pp.info);
    lines.push("</PP_INFO>");
    lines.push("");
  }

  // PP_HEADER: header fields take precedence; provenance creator/date fill
  // in for objects arriving from formats without header equivalents (PSML,
  // FHI), so generator stamps survive a hub conversion.
  lines.push("<PP_HEADER");
  lines.push(`  generated="${escapeXmlAttr(pp.header.generated ?? pp.provenance.creator ?? "")}"`);
  lines.push(`  author="${escapeXmlAttr(pp.header.author ?? "")}"`);
  lines.push(`  date="${escapeXmlAttr(pp.header.date ?? pp.provenance.date ?? "")}"`);
  lines.push(`  comment="${escapeXmlAttr(pp.header.comment ?? "")}"`);
  lines.push(`  element="${pp.header.element}"`);
  lines.push(`  pseudo_type="${pp.header.pseudoType}"`);
  lines.push(`  relativistic="${pp.header.relativistic}"`);
  lines.push(`  is_ultrasoft="${formatFortranBool(pp.header.isUltrasoft)}"`);
  lines.push(`  is_paw="${formatFortranBool(pp.header.isPaw)}"`);
  lines.push(`  is_coulomb="${formatFortranBool(pp.header.isCoulomb)}"`);
  lines.push(`  has_so="${formatFortranBool(pp.header.hasSo)}"`);
  lines.push(`  has_wfc="${formatFortranBool(pp.header.hasWfc)}"`);
  lines.push(`  has_gipaw="${formatFortranBool(pp.header.hasGipaw)}"`);
  lines.push(`  paw_as_gipaw="${formatFortranBool(pp.header.pawAsGipaw)}"`);
  lines.push(`  core_correction="${formatFortranBool(pp.header.coreCorrection)}"`);
  lines.push(`  functional="${pp.header.functional}"`);
  lines.push(`  z_valence="${formatFortranNumber(pp.header.zValence)}"`);
  lines.push(`  total_psenergy="${formatFortranNumber(pp.header.totalPsenergy)}"`);
  lines.push(`  wfc_cutoff="${formatFortranNumber(pp.header.wfcCutoff)}"`);
  lines.push(`  rho_cutoff="${formatFortranNumber(pp.header.rhoCutoff)}"`);
  lines.push(`  l_max="${pp.header.lMax}"`);
  lines.push(`  l_max_rho="${pp.header.lMaxRho}"`);
  lines.push(`  l_local="${pp.header.lLocal}"`);
  lines.push(`  mesh_size="${pp.header.meshSize}"`);
  lines.push(`  number_of_wfc="${pp.header.numberOfWfc}"`);
  lines.push(`  number_of_proj="${pp.header.numberOfProj}"/>`);
  lines.push("");

  // PP_MESH
  const meshAttrs: string[] = [];
  if (pp.mesh.dx != null) meshAttrs.push(`dx="${pp.mesh.dx}"`);
  if (pp.mesh.mesh != null) meshAttrs.push(`mesh="${pp.mesh.mesh}"`);
  if (pp.mesh.xmin != null) meshAttrs.push(`xmin="${pp.mesh.xmin}"`);
  meshAttrs.push(`rmax="${pp.mesh.rmax}"`);
  if (pp.mesh.zmesh != null) meshAttrs.push(`zmesh="${pp.mesh.zmesh}"`);
  lines.push(`<PP_MESH ${meshAttrs.join(" ")}>`);
  lines.push("<PP_R>");
  lines.push(formatDataArray(pp.mesh.r));
  lines.push("</PP_R>");
  lines.push("<PP_RAB>");
  lines.push(formatDataArray(pp.mesh.rab));
  lines.push("</PP_RAB>");
  lines.push("</PP_MESH>");
  lines.push("");

  // PP_NLCC (optional)
  if (pp.nlcc) {
    lines.push("<PP_NLCC>");
    lines.push(formatDataArray(pp.nlcc));
    lines.push("</PP_NLCC>");
    lines.push("");
  }

  // PP_LOCAL
  lines.push("<PP_LOCAL>");
  lines.push(formatDataArray(pp.local.vloc));
  lines.push("</PP_LOCAL>");
  lines.push("");

  // PP_SEMILOCAL (optional)
  if (pp.semilocal) {
    lines.push("<PP_SEMILOCAL>");
    for (const vnl of pp.semilocal) {
      lines.push(`<PP_VNL L="${vnl.l}"${vnl.j !== undefined ? ` J="${vnl.j}"` : ""}>`);
      lines.push(formatDataArray(vnl.vnl));
      lines.push("</PP_VNL>");
    }
    lines.push("</PP_SEMILOCAL>");
    lines.push("");
  }

  // PP_NONLOCAL
  lines.push("<PP_NONLOCAL>");
  for (let i = 0; i < pp.nonlocal.betas.length; i++) {
    const beta = pp.nonlocal.betas[i];
    const betaAttrs = [
      `angular_momentum="${beta.angularMomentum}"`,
      `label="${beta.label}"`,
    ];
    // Preserve document order without inventing attributes: only write
    // index when the source carried one.
    if (beta.index != null) betaAttrs.unshift(`index="${beta.index}"`);
    if (beta.cutoffRadiusIndex != null) betaAttrs.push(`cutoff_radius_index="${beta.cutoffRadiusIndex}"`);
    if (beta.cutoffRadius != null) betaAttrs.push(`cutoff_radius="${formatFortranNumber(beta.cutoffRadius)}"`);
    if (beta.normConservingRadius != null) betaAttrs.push(`norm_conserving_radius="${formatFortranNumber(beta.normConservingRadius)}"`);
    betaAttrs.push(`ultrasoft_cutoff_radius="${formatFortranNumber(beta.ultrasoftCutoffRadius)}"`);
    lines.push(`<PP_BETA ${betaAttrs.join(" ")}>`);
    lines.push(formatDataArray(beta.beta));
    lines.push("</PP_BETA>");
  }
  lines.push("<PP_DIJ>");
  for (const [nb, mb, val] of pp.nonlocal.dij) {
    lines.push(`${nb}  ${mb}  ${formatFortranNumber(val)}`);
  }
  lines.push("</PP_DIJ>");

  // PP_AUGMENTATION (optional, USPP/PAW)
  if (pp.nonlocal.augmentation) {
    const aug = pp.nonlocal.augmentation;
    const augAttrs: string[] = [];
    if (aug.qWithL != null) augAttrs.push(`q_with_l="${aug.qWithL ? "T" : "F"}"`);
    if (aug.nqf != null) augAttrs.push(`nqf="${aug.nqf}"`);
    if (aug.nqlc != null) augAttrs.push(`nqlc="${aug.nqlc}"`);
    if (aug.shape != null) augAttrs.push(`shape="${aug.shape}"`);
    if (aug.rMatchAugfun != null) augAttrs.push(`r_match_augfun="${formatFortranNumber(aug.rMatchAugfun)}"`);
    if (aug.cutoffR != null) augAttrs.push(`cutoff_r="${formatFortranNumber(aug.cutoffR)}"`);
    if (aug.cutoffRIndex != null) augAttrs.push(`cutoff_r_index="${aug.cutoffRIndex}"`);
    if (aug.irc != null) augAttrs.push(`irc="${aug.irc}"`);
    if (aug.lmaxAug != null) augAttrs.push(`l_max_aug="${aug.lmaxAug}"`);
    if (aug.augmentationEpsilon != null) augAttrs.push(`augmentation_epsilon="${formatFortranNumber(aug.augmentationEpsilon)}"`);
    lines.push(`<PP_AUGMENTATION ${augAttrs.join(" ")}>`);
    if (aug.q) {
      lines.push("<PP_Q>");
      lines.push(formatDataArray(aug.q));
      lines.push("</PP_Q>");
    }
    if (aug.multipoles) {
      lines.push("<PP_MULTIPOLES>");
      lines.push(formatDataArray(aug.multipoles));
      lines.push("</PP_MULTIPOLES>");
    }
    if (aug.qfcoeff) {
      lines.push("<PP_QFCOEFF>");
      lines.push(formatDataArray(aug.qfcoeff));
      lines.push("</PP_QFCOEFF>");
    }
    if (aug.rinner) {
      lines.push("<PP_RINNER>");
      lines.push(formatDataArray(aug.rinner));
      lines.push("</PP_RINNER>");
    }
    if (aug.qijl) {
      for (const q of aug.qijl) {
        lines.push(`<PP_QIJL.${q.i}.${q.j}.${q.l}>`);
        lines.push(formatDataArray(q.qijl));
        lines.push(`</PP_QIJL.${q.i}.${q.j}.${q.l}>`);
      }
    }
    lines.push("</PP_AUGMENTATION>");
  }

  lines.push("</PP_NONLOCAL>");
  lines.push("");

  // PP_PSWFC
  if (pp.pswfc.length > 0) {
    lines.push("<PP_PSWFC>");
    for (let i = 0; i < pp.pswfc.length; i++) {
      const wfc = pp.pswfc[i];
      const chiAttrs = [
        `index="${i + 1}"`,
        `l="${wfc.l}"`,
        `occupation="${formatFortranNumber(wfc.occupation)}"`,
        `label="${wfc.label ?? ""}"`,
      ];
      if (wfc.n != null) chiAttrs.push(`n="${wfc.n}"`);
      if (wfc.pseudoEnergy != null) chiAttrs.push(`pseudo_energy="${formatFortranNumber(wfc.pseudoEnergy)}"`);
      if (wfc.cutoffRadius != null) chiAttrs.push(`cutoff_radius="${formatFortranNumber(wfc.cutoffRadius)}"`);
      if (wfc.ultrasoftCutoffRadius != null) chiAttrs.push(`ultrasoft_cutoff_radius="${formatFortranNumber(wfc.ultrasoftCutoffRadius)}"`);
      lines.push(`<PP_CHI ${chiAttrs.join(" ")}>`);
      lines.push(formatDataArray(wfc.chi));
      lines.push("</PP_CHI>");
    }
    lines.push("</PP_PSWFC>");
    lines.push("");
  }

  // PP_FULL_WFC (optional)
  if (pp.fullWfc && pp.fullWfc.length > 0) {
    lines.push("<PP_FULL_WFC>");
    for (const wfc of pp.fullWfc) {
      lines.push(`<PP_AEWFC l="${wfc.l}" label="${wfc.label}">`);
      lines.push(formatDataArray(wfc.aewfc));
      lines.push("</PP_AEWFC>");
    }
    lines.push("</PP_FULL_WFC>");
    lines.push("");
  }

  // PP_RHOATOM
  lines.push("<PP_RHOATOM>");
  lines.push(formatDataArray(pp.rhoatom));
  lines.push("</PP_RHOATOM>");
  lines.push("");

  // PP_PAW (optional): block holds OCCUPATIONS / AE_NLCC / AE_VLOC only;
  // wavefunctions live in the top-level PP_PSWFC / PP_FULL_WFC sections.
  if (pp.paw) {
    lines.push(`<PP_PAW paw_data_format="${pp.paw.pawDataFormat}" core_energy="${formatFortranNumber(pp.paw.coreEnergy)}">`);
    if (pp.paw.occupations.length > 0) {
      lines.push("<PP_OCCUPATIONS>");
      lines.push(formatDataArray(pp.paw.occupations));
      lines.push("</PP_OCCUPATIONS>");
    }
    if (pp.paw.aeNlcc.length > 0) {
      lines.push("<PP_AE_NLCC>");
      lines.push(formatDataArray(pp.paw.aeNlcc));
      lines.push("</PP_AE_NLCC>");
    }
    if (pp.paw.aeVloc.length > 0) {
      lines.push("<PP_AE_VLOC>");
      lines.push(formatDataArray(pp.paw.aeVloc));
      lines.push("</PP_AE_VLOC>");
    }
    lines.push("</PP_PAW>");
    lines.push("");
  }

  // PP_GIPAW (optional): preserve the original tag variant.
  if (pp.gipaw) {
    const tag = pp.gipaw.tag ?? "PP_GIPAW";
    lines.push(`<${tag} gipaw_data_format="${pp.gipaw.gipawDataFormat}">`);
    if (pp.gipaw.coreOrbitals.length > 0) {
      lines.push(`<PP_GIPAW_CORE_ORBITALS number_of_core_orbitals="${pp.gipaw.coreOrbitals.length}">`);
      for (let i = 0; i < pp.gipaw.coreOrbitals.length; i++) {
        const co = pp.gipaw.coreOrbitals[i];
        lines.push(`<PP_GIPAW_CORE_ORBITAL.${i + 1} n="${co.n}" l="${co.l}">`);
        if (co.orbital.length > 0) lines.push(formatDataArray(co.orbital));
        lines.push(`</PP_GIPAW_CORE_ORBITAL.${i + 1}>`);
      }
      lines.push("</PP_GIPAW_CORE_ORBITALS>");
    }
    if (pp.gipaw.orbitals.length > 0) {
      lines.push("<PP_GIPAW_ORBITALS>");
      for (let i = 0; i < pp.gipaw.orbitals.length; i++) {
        const orb = pp.gipaw.orbitals[i];
        lines.push(`<PP_GIPAW_ORBITAL.${i + 1} l="${orb.l}" label="${escapeXmlAttr(orb.label)}">`);
        lines.push("<PP_GIPAW_ORBITAL_AE>");
        lines.push(formatDataArray(orb.aeOrbital));
        lines.push("</PP_GIPAW_ORBITAL_AE>");
        lines.push("<PP_GIPAW_ORBITAL_PS>");
        lines.push(formatDataArray(orb.psOrbital));
        lines.push("</PP_GIPAW_ORBITAL_PS>");
        lines.push(`</PP_GIPAW_ORBITAL.${i + 1}>`);
      }
      lines.push("</PP_GIPAW_ORBITALS>");
    }
    if (pp.gipaw.vlocAe.length > 0 || pp.gipaw.vlocPs.length > 0) {
      lines.push("<PP_GIPAW_VLOCAL>");
      if (pp.gipaw.vlocAe.length > 0) {
        lines.push("<GIPAW_VLOCAL_AE>");
        lines.push(formatDataArray(pp.gipaw.vlocAe));
        lines.push("</GIPAW_VLOCAL_AE>");
      }
      if (pp.gipaw.vlocPs.length > 0) {
        lines.push("<GIPAW_VLOCAL_PS>");
        lines.push(formatDataArray(pp.gipaw.vlocPs));
        lines.push("</GIPAW_VLOCAL_PS>");
      }
      lines.push("</PP_GIPAW_VLOCAL>");
    }
    lines.push(`</${tag}>`);
    lines.push("");
  }

  // PP_SPIN_ORB (optional)
  if (pp.spinOrbit) {
    lines.push("<PP_SPIN_ORB>");
    let relIdx = 1;
    for (const wfc of pp.spinOrbit.relWfcs) {
      const attrs = [
        `index="${wfc.index ?? relIdx}"`,
        `jchi="${formatFortranNumber(wfc.jchi)}"`,
      ];
      if (wfc.els != null) attrs.push(`els="${escapeXmlAttr(wfc.els)}"`);
      if (wfc.nn != null) attrs.push(`nn="${wfc.nn}"`);
      if (wfc.lchi != null) attrs.push(`lchi="${wfc.lchi}"`);
      if (wfc.oc != null) attrs.push(`oc="${formatFortranNumber(wfc.oc)}"`);
      lines.push(`<PP_RELWFC ${attrs.join(" ")}>`);
      if (wfc.chi && wfc.chi.length > 0) lines.push(formatDataArray(wfc.chi));
      lines.push("</PP_RELWFC>");
      relIdx++;
    }
    let betaIdx = 1;
    for (const beta of pp.spinOrbit.relBetas) {
      const attrs = [
        `index="${beta.index ?? betaIdx}"`,
        `jjj="${formatFortranNumber(beta.jjj)}"`,
      ];
      if (beta.lll != null) attrs.push(`lll="${beta.lll}"`);
      lines.push(`<PP_RELBETA ${attrs.join(" ")}>`);
      if (beta.beta && beta.beta.length > 0) lines.push(formatDataArray(beta.beta));
      lines.push("</PP_RELBETA>");
      betaIdx++;
    }
    lines.push("</PP_SPIN_ORB>");
    lines.push("");
  }

  // PP_INPUTFILE (optional, verbatim)
  if (pp.inputFile) {
    lines.push("<PP_INPUTFILE>");
    lines.push(pp.inputFile);
    lines.push("</PP_INPUTFILE>");
    lines.push("");
  }

  lines.push("</UPF>");

  return lines.join("\n");
}
