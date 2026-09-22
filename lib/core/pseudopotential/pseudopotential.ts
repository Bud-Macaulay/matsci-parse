/**
 * First-class pseudopotential data model.
 *
 * This module defines the canonical in-memory representation of a
 * pseudopotential. The model is derived from the UPF v2.0.1 format (the
 * superset of all supported formats) and every other format is handled by an
 * adapter in `lib/core/io/pseudo/` that converts into / out of this type.
 *
 * Canonical in-memory units: **Rydberg (energy), Bohr (length)** — i.e. the
 * UPF-native units. Adapters for Hartree-based formats (PSP8, FHI/CPI, PSML,
 * GTH) convert energies on parse (×2) and back on serialize (×0.5). Both
 * factors are exact powers of two, so round-trips stay bit-exact.
 */

/** Pseudopotential type identifiers in UPF format. */
export type PseudopotentialType = "NC" | "SL" | "1/r" | "US" | "PAW";

/** Relativistic treatment identifiers. "no" is observed in the wild (FHI98PP). */
export type RelativisticType = "scalar" | "full" | "nonrelativistic" | "no";

/** UPF version string. Only set when the source format is UPF. */
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

/** Canonical in-memory energy unit (Rydberg). */
export type EnergyUnit = "Ry";

/** Canonical in-memory length unit (Bohr). */
export type LengthUnit = "Bohr";

/** Units attached to every first-class pseudopotential object. */
export interface PseudopotentialUnits {
  energy: EnergyUnit;
  length: LengthUnit;
}

/** The canonical unit system (Ry / Bohr). */
export const CANONICAL_UNITS: PseudopotentialUnits = {
  energy: "Ry",
  length: "Bohr",
};

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
  /** Chemical element symbol ("" when the source format carries none, e.g. raw .cpi). */
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
  /** Pseudopotential well radius r2well (PSP8/FHI ABINIT header). */
  r2well?: number;
  /** Core charge radius rchrg (PSP8 ABINIT header). */
  rchrg?: number;
  /** Core charge model flag fchrg (PSP8 ABINIT header). */
  fchrg?: number;
  /** Core charge qchrg (PSP8 ABINIT header). */
  qchrg?: number;
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
  /** 1-based position of this projector in the file ordering. */
  index?: number;
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

/** A single Q_ij^L augmentation function from PP_QIJL.i.j.L (USPP/PAW). */
export interface QijlFunction {
  /** First projector index (1-based). */
  i: number;
  /** Second projector index (1-based). */
  j: number;
  /** Augmentation angular momentum. */
  l: number;
  /** Augmentation function values on the radial mesh. */
  qijl: Float64Array;
}

/** Nonlocal pseudopotential data from PP_NONLOCAL section. */
export interface PseudopotentialNonlocal {
  /** Array of beta projectors. */
  betas: BetaProjector[];
  /** D_ij matrix entries. Format: [nb, mb, value in Ry] triples (1-based). */
  dij: Array<[number, number, number]>;
  /** Number of Q function expansion coefficients. */
  nqf?: number;
  /** Augmentation data (USPP/PAW). */
  augmentation?: AugmentationData;
}

/** Augmentation data from PP_AUGMENTATION section (USPP/PAW). */
export interface AugmentationData {
  /** Number of Q function expansion coefficients. */
  nqf?: number;
  /** Number of Q_ij composite functions (nqlc). */
  nqlc?: number;
  /** Augmentation charge shape (BESSEL, GAUSS, PSQ, etc.). */
  shape?: string;
  /** Augmentation matching radius. */
  rMatchAugfun?: number;
  /** Cutoff radius for augmentation (alias: iraug). */
  cutoffR?: number;
  /** Index of radial grid point at the augmentation cutoff radius. */
  cutoffRIndex?: number;
  /** Index of radial grid point at augmentation radius (legacy alias). */
  irc?: number;
  /** Maximum angular momentum of augmentation (accepts l_max_aug / lmax_aug). */
  lmaxAug?: number;
  /** Augmentation pseudization threshold. */
  augmentationEpsilon?: number;
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
  /** Augmentation charge functions from PP_QIJL.i.j.L sections. */
  qijl?: QijlFunction[];
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
  /** Pseudo energy (Ry). */
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
  /** All-electron local potential (Ry). */
  aeVloc: Float64Array;
  /** All-electron wavefunctions. */
  aeWfcs: FullWfc[];
  /** Pseudo wavefunctions for each projector. */
  psWfcs: FullWfc[];
}

/** GIPAW data from PP_GIPAW / PP_GIPAW_RECONSTRUCTION section. */
export interface GipawData {
  /** Which tag the data was read from (preserved for round-trip fidelity). */
  tag?: "PP_GIPAW" | "PP_GIPAW_RECONSTRUCTION";
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

/** A single relativistic wavefunction entry with its radial data. */
export interface RelativisticWfc {
  /** Total angular momentum j of the spinor. */
  jchi: number;
  index?: number;
  els?: string;
  nn?: number;
  lchi?: number;
  oc?: number;
  /** Relativistic wavefunction values (may be absent in legacy files). */
  chi?: Float64Array;
}

/** A single relativistic projector entry with its radial data. */
export interface RelativisticBeta {
  /** Total angular momentum j of the projector. */
  jjj: number;
  index?: number;
  lll?: number;
  /** Relativistic projector values (may be absent in legacy files). */
  beta?: Float64Array;
}

/** Spin-orbit data from PP_SPIN_ORB section. */
export interface SpinOrbitData {
  /** Relativistic wavefunction data. */
  relWfcs: RelativisticWfc[];
  /** Relativistic projector data. */
  relBetas: RelativisticBeta[];
}

/** GTH/HGH analytical pseudopotential parameters (energies in Ry). */
export interface GthData {
  /** Valence electron configuration [s, p, d, ...]. */
  nElec: number[];
  /** Local potential Gaussian radius. */
  rLoc: number;
  /** Local potential Gaussian coefficients (Ry). */
  cexpPpl: number[];
  /** Non-local projector radii per angular momentum channel. */
  rPs: number[];
  /** h-matrix elements [channel][i][j] (Ry). */
  hprj: number[][][];
  /** k-matrix elements for spin-orbit [channel][i][j] (Ry). */
  kprj?: number[][][];
}

/** Provenance metadata: where this object came from. */
export interface Provenance {
  /** Format the data was originally read from. */
  sourceFormat: PseudopotentialFormat;
  /** Generator program name. */
  creator?: string;
  /** Generation date. */
  date?: string;
  /** Embedded input files. */
  inputFiles?: Array<{ name: string; content: string }>;
  /** True when analytical parameters (GTH/HGH) are preserved alongside the grid. */
  analytical?: boolean;
  /** Free-form notes (e.g. appended by resampling operations). */
  notes?: string;
}

/** Complete pseudopotential data: the first-class pseudopotential object. */
export interface Pseudopotential {
  /** Source format this object was parsed from. */
  format: PseudopotentialFormat;
  /** UPF format version (only set for UPF1/UPF2 sources). */
  version?: UPFVersion;
  /** Canonical in-memory units (always Ry / Bohr). */
  units: PseudopotentialUnits;
  /** Provenance metadata (source format, generator, ...). */
  provenance: Provenance;
  /** Human-readable info section. */
  info?: string;
  /** Raw PP_INPUTFILE content, when present in the source. */
  inputFile?: string;
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
