/**
 * QE input card types.
 *
 * Every card that can appear in a QE PW input file is typed here.
 * Cards that map to Structure fields (ATOMIC_SPECIES, ATOMIC_POSITIONS,
 * CELL_PARAMETERS) define row-level types; toPW/fromPW use these
 * as the intermediate representation when converting to/from Structure.
 *
 * Cards with no Structure equivalent (K_POINTS, OCCUPATIONS, etc.)
 * define full card-level types that live on the QEOptions or are
 * parsed separately.
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html
 */

// ──────────────────────────────────────────────────────────────────────
//  Structure-mapped cards
// ──────────────────────────────────────────────────────────────────────

// --- ATOMIC_SPECIES ---

/** One row of the ATOMIC_SPECIES card. */
export interface AtomicSpeciesEntry {
  symbol: string;
  mass: number;
  pseudo: string;
}

// --- ATOMIC_POSITIONS ---

/** Unit for ATOMIC_POSITIONS coordinates. */
export type AtomicPositionUnit = "crystal" | "angstrom" | "bohr" | "alat";

/** One row of the ATOMIC_POSITIONS card. */
export interface AtomicPositionEntry {
  symbol: string;
  x: number;
  y: number;
  z: number;
  /** Selective dynamics flags [if_pos(1), if_pos(2), if_pos(3)]. 1=fixed, 0=free. */
  ifPos?: [number, number, number];
}

// --- CELL_PARAMETERS ---

/** Unit for CELL_PARAMETERS vectors. */
export type CellParameterUnit = "angstrom" | "bohr" | "alat";

/** One row of the CELL_PARAMETERS card (3 components of one lattice vector). */
export type CellParameterEntry = [number, number, number];

// ──────────────────────────────────────────────────────────────────────
//  QE-specific cards (no direct Structure equivalent)
// ──────────────────────────────────────────────────────────────────────

// --- K_POINTS ---

/** K-point with weight (for crystal / tpiba modes). */
export interface Kpt {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * K_POINTS card in automatic (Monkhorst-Pack) mode.
 * nk1×nk2×nk3 grid with shift sk1 sk2 sk3.
 */
export interface KPointsAutomatic {
  mode: "automatic";
  grid: [number, number, number];
  shift: [number, number, number];
}

/**
 * K_POINTS card with explicit k-point list.
 */
export interface KPointsList {
  mode: "crystal" | "tpiba";
  points: Kpt[];
}

/**
 * K_POINTS card in gamma-only mode (no data needed).
 */
export interface KPointsGamma {
  mode: "gamma";
}

/**
 * K_POINTS card for band-structure calculations (crystal_b or tpiba_b).
 * List of k-points defining high-symmetry paths.
 */
export interface KPointsBands {
  mode: "crystal_b" | "tpiba_b";
  /** Number of k-points per segment */
  nks: number;
  points: Kpt[];
}

/**
 * K_POINTS card for coverings of the Brillouin zone (crystal_c or tpiba_c).
 */
export interface KPointsCovering {
  mode: "crystal_c" | "tpiba_c";
  points: Kpt[];
}

export type KPointsCard =
  | KPointsAutomatic
  | KPointsList
  | KPointsGamma
  | KPointsBands
  | KPointsCovering;

// --- ADDITIONAL_K_POINTS ---

/**
 * ADDITIONAL_K_POINTS card.
 * Same format as a k-point list; appended to the main K_POINTS.
 */
export interface AdditionalKPointsCard {
  points: Kpt[];
}

// --- OCCUPATIONS ---

/**
 * OCCUPATIONS card.
 * Requires occupations='from_input' and a single k-point.
 */
export interface OccupationsCard {
  /** Occupations per band (spin-up). */
  f_inp1: number[];
  /** Occupations per band (spin-down, spin-polarized only). */
  f_inp2?: number[];
}

// --- ATOMIC_VELOCITIES ---

/** One row of the ATOMIC_VELOCITIES card. */
export interface AtomicVelocity {
  label: string;
  vx: number;
  vy: number;
  vz: number;
}

// --- ATOMIC_FORCES ---

/** One row of the ATOMIC_FORCES card. */
export interface AtomicForce {
  label: string;
  fx: number;
  fy: number;
  fz: number;
}

// --- CONSTRAINTS ---

/**
 * A single constraint specification.
 */
export interface Constraint {
  type: string;
  /** Constraining parameters (variable length depending on type). */
  params:
    | [number, number]
    | [number, number, number]
    | [number, number, number, number];
  target?: number;
}

/**
 * CONSTRAINTS card.
 * nconstr constraints, each with type, parameters, and optional target.
 */
export interface ConstraintsCard {
  tol?: number;
  constraints: Constraint[];
}

// --- SOLVENTS ---

/** One row of the SOLVENTS card (3D-RISM). */
export interface Solvent {
  label: string;
  density: number;
  molecule: string;
}

/**
 * SOLVENTS card for Laue-RISM with laue_both_hands=true.
 * Separate densities for left and right solvent regions.
 */
export interface SolventBothHands {
  label: string;
  densityLeft: number;
  densityRight: number;
  molecule: string;
}

// --- HUBBARD ---

/**
 * Hubbard parameter entry.
 *
 * The Hubbard card is polymorphic depending on the variant
 * (DFT+U, DFT+U+J, DFT+U+V, orbital-resolved). This type
 * captures the most common DFT+U / DFT+U+J form.
 *
 * For DFT+U+V or orbital-resolved cases, use the generic
 * `raw` field to specify freeform card content.
 */
export interface HubbardEntry {
  label: string;
  /** Angular momentum manifold (e.g. "3d", "2p", "4f"). */
  manifold: string;
  /** Hubbard U parameter (eV). */
  u?: number;
  /** Hubbard J0 parameter (eV). */
  j0?: number;
  /** Hubbard alpha parameter (eV). */
  alpha?: number;
}

/**
 * Hubbard V interaction entry for DFT+U+V.
 */
export interface HubbardVEntry {
  labelI: string;
  manifoldI: string;
  labelJ: string;
  manifoldJ: string;
  i: number;
  j: number;
  v: number;
}

/**
 * HUBBARD card.
 *
 * For simple DFT+U/J cases, use `entries`.
 * For DFT+U+V, also populate `vEntries`.
 * For orbital-resolved or exotic cases, fall back to `raw`.
 */
export interface HubbardCard {
  /**
   * Hubbard basis type.
   * @default "atomic"
   */
  basis?: "atomic" | "ortho-atomic" | "norm-atomic" | "wf" | "pseudo";
  entries?: HubbardEntry[];
  vEntries?: HubbardVEntry[];
  /** Freeform raw lines for orbital-resolved or unusual cases. */
  raw?: string[];
}
