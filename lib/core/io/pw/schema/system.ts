/**
 * &SYSTEM namelist parameters.
 *
 * All optional fields include their QE default value in the JSDoc.
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id4
 */
export interface QeSystemOptions {
  // --- lattice & atoms (REQUIRED) ---

  /**
   * Bravais-lattice index. Optional only if space_group is set.
   * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#ibrav
   */
  ibrav?: number;

  /**
   * Crystallographic constants (in Bohr). alat = celldm(1).
   * Specify either these OR A,B,C,cosAB,cosAC,cosBC — not both.
   */
  celldm?:
    | [number]
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | [number, number, number, number, number]
    | [number, number, number, number, number, number];

  /**
   * Lattice parameter a in Angstrom (alternative to celldm(1)).
   */
  A?: number;

  /**
   * Lattice parameter b in Angstrom.
   */
  B?: number;

  /**
   * Lattice parameter c in Angstrom.
   */
  C?: number;

  /**
   * Cosine of the angle between axis a and b (gamma).
   */
  cosAB?: number;

  /**
   * Cosine of the angle between axis a and c (beta).
   */
  cosAC?: number;

  /**
   * Cosine of the angle between axis b and c (alpha).
   */
  cosBC?: number;

  /**
   * Number of atoms in the unit cell.
   */
  nat?: number;

  /**
   * Number of types of atoms in the unit cell.
   */
  ntyp?: number;

  // --- electronic structure ---

  /**
   * Number of electronic states (bands).
   * Default: valence bands for insulator, +20% for metal.
   */
  nbnd?: number;

  /**
   * Number of conduction-band states for two-chem-potential calc.
   */
  nbnd_cond?: number;

  /**
   * Total charge of the system (for charged cells).
   * @default 0
   */
  tot_charge?: number;

  /**
   * Starting charge on each atomic type.
   * @default 0
   */
  starting_charge?: number[];

  /**
   * Total majority - minority spin charge.
   * @default unspecified (-10000)
   */
  tot_magnetization?: number;

  /**
   * Starting spin polarization per atomic type.
   * @default 0
   */
  starting_magnetization?: number[];

  // --- energy cutoffs ---

  /**
   * Kinetic energy cutoff (Ry) for wavefunctions.
   */
  ecutwfc: number;

  /**
   * Kinetic energy cutoff (Ry) for charge density and potential.
   * @default 4 * ecutwfc
   */
  ecutrho?: number;

  /**
   * Kinetic energy cutoff (Ry) for exact exchange operator (EXX).
   * @default ecutrho
   */
  ecutfock?: number;

  // --- FFT grids ---

  /**
   * Hard FFT grid for charge density. All three must be specified.
   */
  nr1?: number;

  /** @see nr1 */
  nr2?: number;

  /** @see nr1 */
  nr3?: number;

  /**
   * Smooth FFT grid for wavefunctions. All three must be specified.
   * @default same as nr1/nr2/nr3
   */
  nr1s?: number;

  /** @see nr1s */
  nr2s?: number;

  /** @see nr1s */
  nr3s?: number;

  // --- symmetry ---

  /**
   * Disable symmetry usage.
   * @default false
   */
  nosym?: boolean;

  /**
   * Disable symmetry and force k-points to have full Bravais-lattice symmetry.
   * @default false
   */
  nosym_evc?: boolean;

  /**
   * Disable k => -k (time reversal) symmetry.
   * @default false
   */
  noinv?: boolean;

  /**
   * Disable magnetic symmetry operations (rotation + time reversal).
   * @default false
   */
  no_t_rev?: boolean;

  /**
   * Force symmetry group to be symmorphic.
   * @default false
   */
  force_symmorphic?: boolean;

  /**
   * Do not constrain FFT grids for non-symmorphic translations.
   * @default false
   */
  use_all_frac?: boolean;

  // --- occupations & smearing ---

  /**
   * Occupation method.
   * @default undefined (depends on context)
   */
  occupations?:
    | "smearing"
    | "tetrahedra"
    | "tetrahedra_lin"
    | "tetrahedra_opt"
    | "fixed"
    | "from_input";

  /**
   * For isolated atoms with occupations='from_input'.
   * @default false
   */
  one_atom_occupations?: boolean;

  /**
   * Initialize wavefunctions as spin-angle functions (spin-orbit).
   * @default false
   */
  starting_spin_angle?: boolean;

  /**
   * Gaussian spreading for BZ integration (Ry).
   * @default 0
   */
  degauss?: number;

  /**
   * Gaussian spreading in conduction manifold (Ry).
   * @default 0
   */
  degauss_cond?: number;

  /**
   * Number of electrons in conduction manifold (two-chem-potential).
   * @default 0
   */
  nelec_cond?: number;

  /**
   * Smearing type.
   * @default "gaussian"
   */
  smearing?:
    | "gaussian"
    | "gauss"
    | "methfessel-paxton"
    | "m-p"
    | "mp"
    | "marzari-vanderbilt"
    | "cold"
    | "m-v"
    | "mv"
    | "fermi-dirac"
    | "f-d"
    | "fd";

  // --- spin ---

  /**
   * Number of spin components: 1 = non-polarized, 2 = LSDA, 4 = noncollinear.
   * Do not set nspin=4; use noncolin=true instead.
   * @default 1
   */
  nspin?: 1 | 2 | 4;

  /**
   * Enable noncollinear calculation.
   * @default false
   */
  noncolin?: boolean;

  // -- gamma-DFT (polaron) ---

  /**
   * Strength of the gammaDFT potential.
   * @default 0
   */
  sic_gamma?: number;

  /**
   * Polaron type for gammaDFT.
   */
  pol_type?: "e" | "h";

  /**
   * Enable total energy calculation in gammaDFT.
   * @default false
   */
  sic_energy?: boolean;

  /**
   * Valence band scissor-operator shift (eV).
   * @default 0
   */
  sci_vb?: number;

  /**
   * Conduction band scissor-operator shift (eV).
   * @default 0
   */
  sci_cb?: number;

  // --- variable-cell functional parameters ---

  /**
   * Constant-cutoff for modified functional (Ry).
   * @default 0
   */
  ecfixed?: number;

  /**
   * Height of energy step for |G|^2 > ecfixed (Ry).
   * @default 0
   */
  qcutz?: number;

  /**
   * Width of energy step for |G|^2 > ecfixed (Ry).
   * @default 0.1
   */
  q2sigma?: number;

  // --- exchange-correlation ---

  /**
   * Override XC functional from pseudopotentials (e.g. 'PBE', 'BLYP').
   */
  input_dft?: string;

  /**
   * Use Adaptively Compressed Exchange operator.
   * @default true
   */
  ace?: boolean;

  /**
   * Fraction of EXX for hybrid functionals.
   * @default depends on functional (0.25 for PBE0, 0.20 for B3LYP)
   */
  exx_fraction?: number;

  /**
   * Screening parameter for HSE-like hybrids.
   * @default 0.106
   */
  screening_parameter?: number;

  /**
   * Treatment of Coulomb divergence in EXX.
   * @default "gygi-baldereschi"
   */
  exxdiv_treatment?: "gygi-baldereschi" | "vcut_spherical" | "vcut_ws" | "none";

  /**
   * Extrapolate G=0 term of EXX potential.
   * @default true
   */
  x_gamma_extrapolation?: boolean;

  /**
   * Reciprocal-space cutoff for Coulomb divergence correction (Ry).
   * @default 0
   */
  ecutvcut?: number;

  /**
   * q-mesh for Fock operator (EXX).
   */
  nqx1?: number;

  /** @see nqx1 */
  nqx2?: number;

  /** @see nqx1 */
  nqx3?: number;

  /**
   * Localization threshold for SCDM-based EXX evaluation.
   * @default 0
   */
  localization_thr?: number;

  // --- DFT+U (Hubbard) ---

  /**
   * Hubbard occupations per species (read from pseudos by default).
   */
  Hubbard_occ?: number[][];

  /**
   * Hubbard perturbation for J0 linear-response (eV).
   * @default 0
   */
  Hubbard_beta?: number[];

  /**
   * Starting eigenvalues of ns occupation matrix.
   * @default -1 (not set)
   */
  starting_ns_eigenvalue?: number;

  // --- DMFT ---

  /**
   * Enable DMFT restart mode.
   * @default false
   */
  dmft?: boolean;

  /**
   * Prefix for DMFT HDF5 archive.
   * @default same as prefix
   */
  dmft_prefix?: string;

  /**
   * Calculate ensemble of XC energies for BEEF analysis.
   * @default false
   */
  ensemble_energies?: boolean;

  // --- electric field (tefield) ---

  /**
   * Direction of electric field / dipole correction (1, 2, or 3).
   * Required when tefield=true.
   */
  edir?: 1 | 2 | 3;

  /**
   * Position of saw-like potential maximum along edir.
   * @default 0.5
   */
  emaxpos?: number;

  /**
   * Zone where saw-like potential decreases.
   * @default 0.1
   */
  eopreg?: number;

  /**
   * Amplitude of electric field (Hartree a.u.).
   * @default 0.001
   */
  eamp?: number;

  // --- noncollinear magnetization ---

  /**
   * Angle between initial magnetization and z-axis (degrees).
   */
  angle1?: number[];

  /**
   * Angle between magnetization projection on x-y plane and x-axis (degrees).
   */
  angle2?: number[];

  /**
   * Rotate collinear density for noncollinear start.
   * @default false
   */
  lforcet?: boolean;

  /**
   * Type of constrained magnetization.
   * @default "none"
   */
  constrained_magnetization?:
    | "none"
    | "total"
    | "atomic"
    | "total direction"
    | "atomic direction";

  /**
   * Target magnetization vector for constrained_magnetization='total'.
   * @default 0
   */
  fixed_magnetization?: [number, number, number];

  /**
   * Penalty parameter for constrained magnetization.
   * @default 1
   */
  lambda?: number;

  /**
   * Controls printing of magnetic moments.
   * @default -1 (beginning + convergence only)
   */
  report?: number;

  /**
   * Enable spin-orbit coupling.
   * @default false
   */
  lspinorb?: boolean;

  // --- isolated systems ---

  /**
   * Isolated-system correction method.
   * @default "none"
   */
  assume_isolated?:
    | "none"
    | "makov-payne"
    | "m-p"
    | "mp"
    | "martyna-tuckerman"
    | "m-t"
    | "mt"
    | "esm"
    | "2D";

  /**
   * ESM boundary conditions.
   * @default "pbc"
   */
  esm_bc?: "pbc" | "bc1" | "bc2" | "bc3";

  /**
   * ESM position offset of screening region (Bohr).
   * @default 0
   */
  esm_w?: number;

  /**
   * ESM electric field magnitude for bc2 (Ry/Bohr).
   * @default 0
   */
  esm_efield?: number;

  /**
   * ESM number of z-grid points for polynomial fit.
   * @default 4
   */
  esm_nfit?: number;

  // --- grand-canonical SCF ---

  /**
   * Enable grand-canonical SCF.
   * @default false
   */
  lgcscf?: boolean;

  /**
   * Target Fermi energy (eV) for GC-SCF. Required when lgcscf=true.
   */
  gcscf_mu?: number;

  /**
   * Fermi energy convergence threshold (eV) for GC-SCF.
   * @default 1e-2
   */
  gcscf_conv_thr?: number;

  /**
   * Mixing factor for GC-SCF.
   * @default 0.05
   */
  gcscf_beta?: number;

  // --- van der Waals ---

  /**
   * Type of van der Waals correction.
   * @default "none"
   */
  vdw_corr?:
    | "none"
    | "grimme-d2"
    | "Grimme-D2"
    | "DFT-D"
    | "dft-d"
    | "grimme-d3"
    | "Grimme-D3"
    | "DFT-D3"
    | "dft-d3"
    | "TS"
    | "ts"
    | "ts-vdw"
    | "ts-vdW"
    | "tkatchenko-scheffler"
    | "MBD"
    | "mbd"
    | "many-body-dispersion"
    | "mbd_vdw"
    | "XDM"
    | "xdm";

  /**
   * Global scaling for DFT-D.
   * @default 0.75
   */
  london_s6?: number;

  /**
   * Atomic C6 coefficients for DFT-D.
   */
  london_c6?: number[];

  /**
   * Atomic vdW radii for DFT-D.
   */
  london_rvdw?: number[];

  /**
   * Cutoff radius for dispersion interactions (Bohr).
   * @default 200
   */
  london_rcut?: number;

  /**
   * Grimme-D3 version: 2=D2, 3=D3(zero), 4=D3(BJ), 5=D3M(zero), 6=D3M(BJ).
   * @default 3
   */
  dftd3_version?: 2 | 3 | 4 | 5 | 6;

  /**
   * Enable three-body terms in Grimme-D3.
   * @default true
   */
  dftd3_threebody?: boolean;

  /**
   * TS vdW energy convergence threshold.
   * @default 1e-6
   */
  ts_vdw_econv_thr?: number;

  /**
   * Use TS/MBD for isolated (non-periodic) systems.
   * @default false
   */
  ts_vdw_isolated?: boolean;

  /**
   * XDM damping parameter a1 (dimensionless).
   * @default 0.6836
   */
  xdm_a1?: number;

  /**
   * XDM damping parameter a2 (Angstrom).
   * @default 1.5045
   */
  xdm_a2?: number;

  // --- space group ---

  /**
   * Space group number (International Tables). Requires crystal_sg positions.
   * @default 0
   */
  space_group?: number;

  /**
   * Use b-unique monoclinic ibrav.
   * @default false
   */
  uniqueb?: boolean;

  /**
   * Origin choice for space groups with two origins.
   * @default 1
   */
  origin_choice?: 1 | 2;

  /**
   * Rhombohedral coordinates use hexagonal axes when false.
   * @default true
   */
  rhombohedral?: boolean;

  // --- gate ---

  /**
   * Position of charged plate (units of cell length in z).
   * @default 0.5
   */
  zgate?: number;

  /**
   * Allow relaxation towards charged plate.
   * @default false
   */
  relaxz?: boolean;

  /**
   * Add potential barrier for field-effect configuration.
   * @default false
   */
  block?: boolean;

  /**
   * Lower edge of potential barrier (units of cell z).
   * @default 0.45
   */
  block_1?: number;

  /**
   * Upper edge of potential barrier (units of cell z).
   * @default 0.55
   */
  block_2?: number;

  /**
   * Height of potential barrier (Ry).
   * @default 0.1
   */
  block_height?: number;

  // --- external force fields ---

  /**
   * Number of activated external ionic force fields.
   * @default 0
   */
  nextffield?: number;
}
