/** Pseudopotential type identifiers in UPF format. */
export type PseudopotentialType = "NC" | "SL" | "1/r" | "US" | "PAW";

/** Relativistic treatment identifiers. */
export type RelativisticType = "scalar" | "full" | "nonrelativistic";

/** UPF version string. */
export type UPFVersion = "1.0.0" | "2.0.1";

/** Source format identifier for interconversion. */
export type PseudopotentialFormat =
  | "UPF1"
  | "UPF2"
  | "PSP8"
  | "PSML"
  | "CPI"
  | "GTH"
  | "HGH";

/** Header attributes from PP_HEADER section. */
export interface PseudopotentialHeader {
  /** Generation code identifier. */
  generated?: string;
  /** Author of the pseudopotential. */
  author?: string;
  /** Generation date. */
  date?: string;
  /** Brief description. */
  comment?: string;
  /** Chemical element symbol. */
  element: string;
  /** Pseudopotential type. */
  pseudoType: PseudopotentialType;
  /** Level of relativistic formalism. */
  relativistic: RelativisticType;
  /** True if ultrasoft (Vanderbilt) pseudopotential. */
  isUltrasoft: boolean;
  /** True if PAW dataset. */
  isPaw: boolean;
  /** True if Coulomb 1/r potential. */
  isCoulomb: boolean;
  /** True if spin-orbit information present. */
  hasSo: boolean;
  /** True if all-electron orbitals present. */
  hasWfc: boolean;
  /** True if GIPAW data present. */
  hasGipaw: boolean;
  /** True if PAW used as GIPAW. */
  pawAsGipaw: boolean;
  /** True if non-linear core correction present. */
  coreCorrection: boolean;
  /** DFT functional identifier. */
  functional: string;
  /** Valence charge. */
  zValence: number;
  /** Total pseudo-valence energy (Ry). */
  totalPsenergy: number;
  /** Suggested wavefunction cutoff (Ry). */
  wfcCutoff: number;
  /** Suggested charge density cutoff (Ry). */
  rhoCutoff: number;
  /** Maximum angular momentum of valence orbitals. */
  lMax: number;
  /** Maximum angular momentum of atomic charge density. */
  lMaxRho: number;
  /** Angular momentum of local channel. */
  lLocal: number;
  /** Number of radial mesh points. */
  meshSize: number;
  /** Number of atomic wavefunctions. */
  numberOfWfc: number;
  /** Number of Kleinman-Bylander projectors. */
  numberOfProj: number;
  /** Numeric XC functional code (PSP8 pspxc). */
  xcCode?: number;
  /** Spin-orbit extension switch (PSP8). */
  extensionSwitch?: number;
}

/** Radial mesh parameters and data from PP_MESH section. */
export interface PseudopotentialMesh {
  /** Grid type discriminator. */
  gridType?: "logarithmic" | "linear" | "custom";
  /** Logarithmic grid spacing parameter dx. */
  dx?: number;
  /** Number of mesh points. */
  mesh?: number;
  /** Minimum x value for logarithmic grid. */
  xmin?: number;
  /** Maximum radial coordinate. */
  rmax: number;
  /** Nuclear charge for grid generation. */
  zmesh?: number;
  /** Radial grid points r(i) in Bohr. */
  r: Float64Array;
  /** Radial integration weights rab(i). */
  rab: Float64Array;
}

/** Local potential from PP_LOCAL section. */
export interface PseudopotentialLocal {
  /** Local potential vloc(mesh) in Ry. */
  vloc: Float64Array;
}

/** A single Kleinman-Bylander projector from PP_BETA section. */
export interface BetaProjector {
  /** Angular momentum of this projector. */
  angularMomentum: number;
  /** Number of mesh points for this projector. */
  cutoffRadiusIndex?: number;
  /** Cutoff radius in Bohr. */
  cutoffRadius?: number;
  /** Norm-conserving radius (US only). */
  normConservingRadius?: number;
  /** Ultrasoft cutoff radius. */
  ultrasoftCutoffRadius: number;
  /** Projector label. */
  label: string;
  /** Projector values beta(r) * r. */
  beta: Float64Array;
}

/** Nonlocal pseudopotential data from PP_NONLOCAL section. */
export interface PseudopotentialNonlocal {
  /** Array of beta projectors. */
  betas: BetaProjector[];
  /** D_ij matrix entries. Format: [nb, mb, value] triples. */
  dij: Array<[number, number, number]>;
  /** Number of Q function expansion coefficients. */
  nqf?: number;
  /** Inner radii for Q function pseudization. */
  rinner?: Float64Array;
  /** Q_ij norm integrals. */
  qqq?: Array<[number, number, number]>;
  /** Augmentation functions r^2 q_ij(r). */
  qfunc?: Array<[number, number, number, Float64Array]>;
  /** Augmentation data (USPP/PAW). */
  augmentation?: AugmentationData;
}

/** Augmentation data from PP_AUGMENTATION section (USPP/PAW). */
export interface AugmentationData {
  /** Augmentation charge shape (BESSEL, GAUSS, PSQ, etc.). */
  shape?: string;
  /** Augmentation matching radius. */
  rMatchAugfun?: number;
  /** Index of radial grid point at augmentation radius. */
  irc?: number;
  /** Maximum angular momentum of augmentation. */
  lmaxAug?: number;
  /** Augmentation multipoles augmom(nb, nb1, l). */
  augmom?: Float64Array;
  /** Augmentation functions augfun(k). */
  augfun?: Float64Array[];
  /** Q_ij norms from PP_Q section. */
  q?: Float64Array;
  /** Electrostatic multipoles from PP_MULTIPOLES section. */
  multipoles?: Float64Array;
  /** Taylor expansion coefficients from PP_QFCOEFF section. */
  qfcoeff?: Float64Array;
  /** Inner radii for Q function from PP_RINNER section. */
  rinner?: Float64Array;
  /** Whether augmentation charge depends on angular momentum. */
  qWithL?: boolean;
}

/** Atomic wavefunction from PP_CHI section. */
export interface PseudopotentialWfc {
  /** Angular momentum quantum number. */
  l: number;
  /** Occupation number. */
  occupation: number;
  /** Wavefunction label (e.g. "2S", "3P"). */
  label?: string;
  /** Principal quantum number. */
  n?: number;
  /** Pseudo energy. */
  pseudoEnergy?: number;
  /** Inner cutoff radius. */
  cutoffRadius?: number;
  /** Ultrasoft cutoff radius. */
  ultrasoftCutoffRadius?: number;
  /** Wavefunction values chi(r) * r. */
  chi: Float64Array;
}

/** All-electron wavefunction from PP_FULL_WFC section (PAW). */
export interface FullWfc {
  /** Angular momentum quantum number. */
  l: number;
  /** Wavefunction label. */
  label: string;
  /** Wavefunction values aewfc(r) * r. */
  aewfc: Float64Array;
}

/** PAW dataset from PP_PAW section. */
export interface PawData {
  /** PAW data format version. */
  pawDataFormat: number;
  /** Core energy constant (Ry). */
  coreEnergy: number;
  /** Occupations of atomic orbitals. */
  occupations: Float64Array;
  /** All-electron core charge. */
  aeNlcc: Float64Array;
  /** All-electron local potential. */
  aeVloc: Float64Array;
  /** All-electron wavefunctions. */
  aeWfcs: FullWfc[];
  /** Pseudo wavefunctions for each projector. */
  psWfcs: FullWfc[];
}

/** GIPAW data from PP_GIPAW_RECONSTRUCTION section. */
export interface GipawData {
  /** GIPAW data format version. */
  gipawDataFormat: number;
  /** Core orbitals. */
  coreOrbitals: Array<{
    n: number;
    l: number;
    orbital: Float64Array;
  }>;
  /** AE and PS orbitals for each valence state. */
  orbitals: Array<{
    l: number;
    label: string;
    aeOrbital: Float64Array;
    psOrbital: Float64Array;
  }>;
  /** AE local potential. */
  vlocAe: Float64Array;
  /** PS local potential. */
  vlocPs: Float64Array;
}

/** Spin-orbit data from PP_SPIN_ORB section. */
export interface SpinOrbitData {
  /** Relativistic wavefunction data. */
  relWfcs: Array<{
    jchi: number;
    index?: number;
    els?: string;
    nn?: number;
    lchi?: number;
    oc?: number;
  }>;
  /** Relativistic projector data. */
  relBetas: Array<{
    jjj: number;
    index?: number;
    lll?: number;
  }>;
}

/** GTH/HGH analytical pseudopotential parameters. */
export interface GthData {
  /** Valence electron configuration [s, p, d, ...]. */
  nElec: number[];
  /** Local potential Gaussian radius. */
  rLoc: number;
  /** Local potential Gaussian coefficients. */
  cexpPpl: number[];
  /** Non-local projector radii per angular momentum channel. */
  rPs: number[];
  /** h-matrix elements [channel][i][j]. */
  hprj: number[][][];
  /** k-matrix elements for spin-orbit [channel][i][j]. */
  kprj?: number[][][];
}

/** Provenance metadata (PSML and others). */
export interface Provenance {
  /** Generator program name. */
  creator: string;
  /** Generation date. */
  date?: string;
  /** Embedded input files. */
  inputFiles?: Array<{ name: string; content: string }>;
}

/** Complete pseudopotential data parsed from a pseudopotential file. */
export interface Pseudopotential {
  /** Source format. */
  format?: PseudopotentialFormat;
  /** UPF format version (for UPF formats). */
  version: UPFVersion;
  /** Human-readable info section. */
  info?: string;
  /** Provenance metadata. */
  provenance?: Provenance;
  /** Header with metadata. */
  header: PseudopotentialHeader;
  /** Radial mesh. */
  mesh: PseudopotentialMesh;
  /** Non-linear core correction charge. */
  nlcc?: Float64Array;
  /** Local potential. */
  local: PseudopotentialLocal;
  /** Semilocal potentials (NC only). */
  semilocal?: Array<{
    l: number;
    j?: number;
    vnl: Float64Array;
  }>;
  /** Nonlocal projectors and D_ij. */
  nonlocal: PseudopotentialNonlocal;
  /** Augmentation data (USPP/PAW). DEPRECATED: prefer nonlocal.augmentation. */
  augmentation?: AugmentationData;
  /** Atomic pseudo-wavefunctions. */
  pswfc: PseudopotentialWfc[];
  /** Atomic all-electron wavefunctions (PAW). */
  fullWfc?: FullWfc[];
  /** Atomic charge density. */
  rhoatom: Float64Array;
  /** PAW dataset. */
  paw?: PawData;
  /** GIPAW reconstruction data. */
  gipaw?: GipawData;
  /** Spin-orbit coupling data. */
  spinOrbit?: SpinOrbitData;
  /** GTH/HGH analytical parameters (when format is GTH or HGH). */
  gth?: GthData;
}
