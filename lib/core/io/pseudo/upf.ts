import { XMLParser, XMLBuilder } from "fast-xml-parser";

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
  PseudopotentialType,
  RelativisticType,
} from "../../pseudopotential/pseudopotential";

// ── Fortran helpers ─────────────────────────────────────────────────

function parseFortranNumber(s: string): number {
  return Number.parseFloat(s.replace(/[dD]/g, "e"));
}

function parseFortranBool(s: string): boolean {
  const v = s.trim().toLowerCase();
  return v === ".true." || v === "true" || v === "t";
}

function parseFloat64Array(text: string): Float64Array {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const arr = new Float64Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    arr[i] = parseFortranNumber(tokens[i]);
  }
  return arr;
}

function parseIntSafe(s: string): number {
  return Number.parseInt(s.trim(), 10);
}

function formatFortranNumber(n: number, width = 20): string {
  const s = n.toExponential(15);
  const d = s.replace(/e/, "D").replace(/e\+/, "D+").replace(/e-/, "D-");
  return d.padStart(width);
}

function formatFortranBool(b: boolean): string {
  return b ? ".true." : ".false.";
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

// ── XML node helpers ────────────────────────────────────────────────

type XmlNode = Record<string, any>;

function attr(node: XmlNode | undefined, name: string): string {
  return node?.[`@_${name}`] ?? "";
}

function attrNum(node: XmlNode | undefined, name: string, fallback = 0): number {
  const v = attr(node, name);
  return v ? parseFortranNumber(v) : fallback;
}

function attrInt(node: XmlNode | undefined, name: string, fallback = 0): number {
  const v = attr(node, name);
  return v ? parseIntSafe(v) : fallback;
}

function attrBool(node: XmlNode | undefined, name: string): boolean {
  return parseFortranBool(attr(node, name) || ".false.");
}

function textOf(node: XmlNode | string | undefined): string {
  if (typeof node === "string") return node;
  if (node && "#text" in node) return String(node["#text"]);
  return "";
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

function parseData(text: string): Float64Array {
  return parseFloat64Array(text);
}

// ── XML parser config ──────────────────────────────────────────────

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (_name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean) => {
    if (isAttribute) return false;
    // These tags can appear multiple times — always wrap in array.
    // Also match dotted variants (e.g. PP_GIPAW_CORE_ORBITAL.1).
    if (
      _name === "PP_BETA" ||
      _name.startsWith("PP_BETA.") ||
      _name === "PP_CHI" ||
      _name.startsWith("PP_CHI.") ||
      _name === "PP_VNL" ||
      _name === "PP_AEWFC" ||
      _name.startsWith("PP_AEWFC.") ||
      _name.startsWith("PP_GIPAW_CORE_ORBITAL.") ||
      _name.startsWith("PP_GIPAW_ORBITAL.") ||
      _name === "PP_RELWFC" ||
      _name === "PP_RELBETA"
    ) {
      return true;
    }
    return false;
  },
};

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
  return {
    dx: attr(node, "dx") ? attrNum(node, "dx") : undefined,
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

function parseNonlocal(node: XmlNode): PseudopotentialNonlocal {
  const betas: BetaProjector[] = [];
  for (const [key, val] of Object.entries(node)) {
    if (key === "PP_BETA" || key.startsWith("PP_BETA.")) {
      betas.push(...toArray(val).map(parseBeta));
    }
  }

  const dijText = textOf(node["PP_DIJ"]);
  const tokens = dijText.trim().split(/\s+/).filter(Boolean).map(parseFortranNumber);
  const dij: Array<[number, number, number]> = [];

  if (tokens.length > 0) {
    const nProj = betas.length;

    // Flat matrix format: tokens.length == nProj^2, row-major
    if (nProj > 0 && tokens.length === nProj * nProj) {
      for (let i = 0; i < nProj; i++) {
        for (let j = 0; j < nProj; j++) {
          dij.push([i + 1, j + 1, tokens[i * nProj + j]]);
        }
      }
    }
    // Triplet format: tokens.length % 3 == 0, each triplet is (i, j, value)
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

  // nqf from PP_NONLOCAL or PP_AUGMENTATION attributes
  const nqf = augmentation?.nqf ?? undefined;

  return { betas, dij, nqf, augmentation };
}

function parseAugmentation(node: XmlNode): AugmentationData {
  return {
    qWithL: attr(node, "q_with_l") ? attrBool(node, "q_with_l") : undefined,
    nqf: attr(node, "nqf") ? attrInt(node, "nqf") : undefined,
    shape: attr(node, "shape") || undefined,
    rMatchAugfun: attr(node, "r_match_augfun")
      ? attrNum(node, "r_match_augfun")
      : undefined,
    irc: attr(node, "irc") ? attrInt(node, "irc") : undefined,
    lmaxAug: attr(node, "l_max_aug") ? attrInt(node, "l_max_aug") : undefined,
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
  };
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

function parsePaw(node: XmlNode): PawData {
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
    aeWfcs: [],
    psWfcs: [],
  };
}

function parseGipaw(node: XmlNode): GipawData {
  const coreOrbitals: GipawData["coreOrbitals"] = [];
  const coreOrbsSection = node["PP_GIPAW_CORE_ORBITALS"];
  if (coreOrbsSection) {
    for (const [key, val] of Object.entries(coreOrbsSection)) {
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
    for (const [key, val] of Object.entries(orbsSection)) {
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

  let vlocAe = new Float64Array(0);
  let vlocPs = new Float64Array(0);
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
    gipawDataFormat: attrInt(node, "gipaw_data_format"),
    coreOrbitals,
    orbitals,
    vlocAe,
    vlocPs,
  };
}

function parseSpinOrbit(node: XmlNode): SpinOrbitData {
  const relWfcs: SpinOrbitData["relWfcs"] = [];
  for (const wfc of toArray(node["PP_RELWFC"])) {
    relWfcs.push({
      jchi: attrNum(wfc, "jchi"),
      index: attr(wfc, "index") ? attrInt(wfc, "index") : undefined,
      els: attr(wfc, "els") || undefined,
      nn: attr(wfc, "nn") ? attrInt(wfc, "nn") : undefined,
      lchi: attr(wfc, "lchi") ? attrInt(wfc, "lchi") : undefined,
      oc: attr(wfc, "oc") ? attrNum(wfc, "oc") : undefined,
    });
  }

  const relBetas: SpinOrbitData["relBetas"] = [];
  for (const beta of toArray(node["PP_RELBETA"])) {
    relBetas.push({
      jjj: attrNum(beta, "jjj"),
      index: attr(beta, "index") ? attrInt(beta, "index") : undefined,
      lll: attr(beta, "lll") ? attrInt(beta, "lll") : undefined,
    });
  }

  return { relWfcs, relBetas };
}

// ── Main parser ────────────────────────────────────────────────────

/**
 * Parse a UPF v2.0.1 pseudopotential string into a Pseudopotential object.
 *
 * @param text - The complete UPF file content as a string.
 * @returns A parsed Pseudopotential object.
 * @throws If the text is not valid UPF v2.0.1 format.
 */
export function fromUPF(text: string): Pseudopotential {
  const parser = new XMLParser(parserOptions);
  const doc = parser.parse(text);

  const upf: XmlNode = doc?.UPF;
  if (!upf) {
    throw new Error("Not a UPF file: missing <UPF> root element");
  }

  const version = (attr(upf, "version") || "2.0.1") as "2.0.1";

  // PP_INFO (optional, plain text)
  const info = upf["PP_INFO"] ? textOf(upf["PP_INFO"]).trim() || undefined : undefined;

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
    semilocal = toArray(upf["PP_SEMILOCAL"]["PP_VNL"]).map((vnl: XmlNode) => ({
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
    for (const [key, val] of Object.entries(pswfcRaw)) {
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
    for (const [key, val] of Object.entries(upf["PP_FULL_WFC"])) {
      if (key.startsWith("PP_AEWFC")) {
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
    ? parseGipaw(upf["PP_GIPAW"])
    : upf["PP_GIPAW_RECONSTRUCTION"]
      ? parseGipaw(upf["PP_GIPAW_RECONSTRUCTION"])
      : undefined;

  // PP_SPIN_ORB (optional)
  const spinOrbit = upf["PP_SPIN_ORB"]
    ? parseSpinOrbit(upf["PP_SPIN_ORB"])
    : undefined;

  // Populate paw.aeWfcs/psWfcs from top-level sections (UPF v2.0.1 spec:
  // PP_FULL_WFC and PP_PSWFC are siblings of PP_PAW, not children).
  if (paw && fullWfc && fullWfc.length > 0) {
    paw.aeWfcs = fullWfc;
  }
  if (paw && pswfc.length > 0) {
    paw.psWfcs = pswfc.map((w) => ({
      l: w.l,
      label: w.label ?? "",
      aewfc: w.chi,
    }));
  }

  return {
    version,
    info,
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
 * Serialize a Pseudopotential object back to UPF v2.0.1 format.
 *
 * @param pp - The pseudopotential to serialize.
 * @returns The UPF file content as a string.
 */
export function toUPF(pp: Pseudopotential): string {
  const lines: string[] = [];

  lines.push(`<UPF version="${pp.version}">`);
  lines.push("");

  // PP_INFO
  if (pp.info) {
    lines.push("<PP_INFO>");
    lines.push(pp.info);
    lines.push("</PP_INFO>");
    lines.push("");
  }

  // PP_HEADER
  lines.push("<PP_HEADER");
  lines.push(`  generated="${pp.header.generated ?? ""}"`);
  lines.push(`  author="${pp.header.author ?? ""}"`);
  lines.push(`  date="${pp.header.date ?? ""}"`);
  lines.push(`  comment="${pp.header.comment ?? ""}"`);
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
  lines.push(`<PP_MESH dx="${pp.mesh.dx ?? 0}" mesh="${pp.mesh.mesh ?? pp.header.meshSize}" xmin="${pp.mesh.xmin ?? 0}" rmax="${pp.mesh.rmax}" zmesh="${pp.mesh.zmesh ?? 0}">`);
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
    lines.push(`<PP_BETA index="${i + 1}" angular_momentum="${beta.angularMomentum}" label="${beta.label}" ultrasoft_cutoff_radius="${formatFortranNumber(beta.ultrasoftCutoffRadius)}">`);
    lines.push(formatDataArray(beta.beta));
    lines.push("</PP_BETA>");
  }
  lines.push("<PP_DIJ>");
  for (const [nb, mb, val] of pp.nonlocal.dij) {
    lines.push(`${nb}  ${mb}  ${formatFortranNumber(val)}`);
  }
  lines.push("</PP_DIJ>");
  lines.push("</PP_NONLOCAL>");
  lines.push("");

  // PP_PSWFC
  if (pp.pswfc.length > 0) {
    lines.push("<PP_PSWFC>");
    for (let i = 0; i < pp.pswfc.length; i++) {
      const wfc = pp.pswfc[i];
      lines.push(`<PP_CHI index="${i + 1}" l="${wfc.l}" occupation="${formatFortranNumber(wfc.occupation)}" label="${wfc.label ?? ""}" n="${wfc.n ?? 0}" pseudo_energy="${formatFortranNumber(wfc.pseudoEnergy ?? 0)}" cutoff_radius="${formatFortranNumber(wfc.cutoffRadius ?? 0)}" ultrasoft_cutoff_radius="${formatFortranNumber(wfc.ultrasoftCutoffRadius ?? 0)}">`);
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

  // PP_PAW (optional)
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
    if (pp.paw.aeWfcs.length > 0) {
      for (const wfc of pp.paw.aeWfcs) {
        lines.push(`<PP_AEWFC l="${wfc.l}" label="${wfc.label}">`);
        lines.push(formatDataArray(wfc.aewfc));
        lines.push("</PP_AEWFC>");
      }
    }
    if (pp.paw.psWfcs.length > 0) {
      for (const wfc of pp.paw.psWfcs) {
        lines.push(`<PP_PSWFC l="${wfc.l}" label="${wfc.label}">`);
        lines.push(formatDataArray(wfc.aewfc));
        lines.push("</PP_PSWFC>");
      }
    }
    lines.push("</PP_PAW>");
    lines.push("");
  }

  // PP_GIPAW (optional)
  if (pp.gipaw) {
    lines.push("<PP_GIPAW>");
    if (pp.gipaw.coreOrbitals.length > 0) {
      lines.push(`<PP_GIPAW_CORE_ORBITALS number_of_core_orbitals="${pp.gipaw.coreOrbitals.length}">`);
      for (let i = 0; i < pp.gipaw.coreOrbitals.length; i++) {
        const co = pp.gipaw.coreOrbitals[i];
        lines.push(`<PP_GIPAW_CORE_ORBITAL n="${co.n}" l="${co.l}">`);
        if (co.orbital.length > 0) lines.push(formatDataArray(co.orbital));
        lines.push("</PP_GIPAW_CORE_ORBITAL>");
      }
      lines.push("</PP_GIPAW_CORE_ORBITALS>");
    }
    if (pp.gipaw.orbitals.length > 0) {
      lines.push("<PP_GIPAW_ORBITALS>");
      for (let i = 0; i < pp.gipaw.orbitals.length; i++) {
        const orb = pp.gipaw.orbitals[i];
        lines.push(`<PP_GIPAW_ORBITAL l="${orb.l}" label="${orb.label}">`);
        lines.push("<PP_GIPAW_ORBITAL_AE>");
        lines.push(formatDataArray(orb.aeOrbital));
        lines.push("</PP_GIPAW_ORBITAL_AE>");
        lines.push("<PP_GIPAW_ORBITAL_PS>");
        lines.push(formatDataArray(orb.psOrbital));
        lines.push("</PP_GIPAW_ORBITAL_PS>");
        lines.push("</PP_GIPAW_ORBITAL>");
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
    lines.push("</PP_GIPAW>");
    lines.push("");
  }

  lines.push("</UPF>");

  return lines.join("\n");
}
