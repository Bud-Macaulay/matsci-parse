/**
 * Typed VASP INCAR tags, one flat interface in alphabetical order (INCAR is
 * a single flat namespace, as is the VASP wiki's tag index).
 *
 * Every type, allowed value and default is taken from the tag's page on the
 * VASP wiki, linked from each tag. All tags are optional; omitted tags take
 * VASP's default.
 * @see https://www.vasp.at/wiki/index.php/Category:INCAR_tag
 */
export interface VaspIncarTags {
  /**
   * Use an additional support grid (8× the fine grid) for evaluating
   * augmentation charges; can reduce noise in forces. Test carefully.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ADDGRID
   */
  ADDGRID?: boolean;

  /**
   * Fraction of exact exchange in a Hartree-Fock/hybrid calculation. `1.0`
   * switches off correlation by default (full Hartree-Fock).
   * @default 0.25 if `LHFCALC = true` and `LRHFCALC = false`; 1 if `LRHFCALC = true`; 0 if `LHFCALC = false`
   * @see https://www.vasp.at/wiki/index.php/AEXX
   */
  AEXX?: number;

  /**
   * Multiplier of the gradient correction in the GGA correlation functional
   * (not implemented for AM05).
   * @default 1.0 if `LHFCALC = false` or AEXX ≠ 1.0; 0.0 if `LHFCALC = true` and AEXX = 1.0
   * @see https://www.vasp.at/wiki/index.php/AGGAC
   */
  AGGAC?: number;

  /**
   * Multiplier of the gradient correction in the GGA exchange functional.
   * Usable only with `LHFCALC = .TRUE.`; not implemented for AM05.
   * @default 1.0-AEXX if `LHFCALC = true`; 1.0 if `LHFCALC = false`
   * @see https://www.vasp.at/wiki/index.php/AGGAX
   */
  AGGAX?: number;

  /**
   * Multiplier of the LDA correlation functional (or LDA part of GGA
   * correlation).
   * @default 1.0 if `LHFCALC = false` or AEXX ≠ 1.0; 0.0 if `LHFCALC = true` and AEXX = 1.0
   * @see https://www.vasp.at/wiki/index.php/ALDAC
   */
  ALDAC?: number;

  /**
   * Multiplier of the LDA exchange functional (or LDA part of GGA exchange).
   * Usable only with `LHFCALC = .TRUE.`; before VASP 6.4.0 it was forced to
   * 1.0-AEXX.
   * @default 1.0-AEXX if `LHFCALC = true`; 1.0 if `LHFCALC = false`
   * @see https://www.vasp.at/wiki/index.php/ALDAX
   */
  ALDAX?: number;

  /**
   * Electronic-minimization algorithm or many-body method (VASP ≥ 4.5):
   * - `"Normal"`: blocked Davidson (IALGO 38)
   * - `"Fast"`: Davidson then RMM-DIIS (IALGO 68)
   * - `"VeryFast"`: RMM-DIIS (IALGO 48); not for hybrid functionals
   * - `"Old Fast"`, `"Old VeryFast"`: VASP 5 versions of Fast/VeryFast (VASP 6)
   * - `"All"` / `"Conjugate"`: all-band conjugate gradient (IALGO 58)
   * - `"Damped"`: damped MD for the orbitals (IALGO 53)
   * - `"Exact"`: exact diagonalization (IALGO 90)
   * - `"Subrot"`: subspace rotation only (IALGO 4)
   * - `"Eigenval"`: recompute eigenvalues from fixed orbitals (IALGO 3)
   * - `"None"` / `"Nothing"`: no orbital update (IALGO 2)
   * - `"CHI"`, `"TDHF"`, `"BSE"`, `"Timeev"`, `"ACFDT"` / `"RPA"`,
   *   `"ACFDTR"` / `"RPAR"`, `"ACFDTRK"`, `"CRPA"`: response functions,
   *   TDHF/BSE, time evolution, RPA/MP2 and constrained RPA
   * - `"EVGW0"`, `"EVGW"`, `"QPGW0"`, `"QPGW"`, `"GW0R"`, `"GWR"`, `"G0W0R"`,
   *   `"EVGW0R"` (VASP ≥ 6.4): GW variants
   * Except None, Nothing, Exact and Eigenval, only the first letter is parsed.
   * @default "Normal"
   * @see https://www.vasp.at/wiki/index.php/ALGO
   */
  ALGO?:
    | "Normal"
    | "Fast"
    | "VeryFast"
    | "Old Fast"
    | "Old VeryFast"
    | "All"
    | "Conjugate"
    | "Damped"
    | "Exact"
    | "Subrot"
    | "Eigenval"
    | "None"
    | "Nothing"
    | "CHI"
    | "TDHF"
    | "BSE"
    | "Timeev"
    | "ACFDT"
    | "RPA"
    | "ACFDTR"
    | "RPAR"
    | "ACFDTRK"
    | "CRPA"
    | "EVGW0"
    | "EVGW"
    | "QPGW0"
    | "QPGW"
    | "GW0R"
    | "GWR"
    | "G0W0R"
    | "EVGW0R"
    | (string & {});

  /**
   * Specify alpha in vdW-DF3-opt1/vdW-DF3-opt2.
   * @default 0.94950 for IVDW_NL=3 or; 0.28248 for IVDW_NL=4
   * @see https://www.vasp.at/wiki/index.php/ALPHA_VDW
   */
  ALPHA_VDW?: number;

  /**
   * AMGGAC is a parameter that multiplies the meta-GGA correlation functional
   * (available as of VASP.6.4.0).
   * @default 1.0 if LHFCALC=false or AEXXneq1.0; 0.0 if LHFCALC=true and
   * AEXX=1.0
   * @see https://www.vasp.at/wiki/index.php/AMGGAC
   */
  AMGGAC?: number;

  /**
   * AMGGAX is a parameter that multiplies the meta-GGA exchange functional
   * (available as of VASP.6.4.0).
   * @default 1.0-AEXX if LHFCALC=true; 1.0 if LHFCALC=false
   * @see https://www.vasp.at/wiki/index.php/AMGGAX
   */
  AMGGAX?: number;

  /**
   * Minimal mixing parameter in Kerker's initial approximation to the
   * charge-dielectric function for Broyden/Pulay mixing (`IMIX = 4`,
   * `INIMIX = 1`); damping parameter μ for `IMIX = 2`.
   * @default min(0.1, AMIX, AMIX_MAG)
   * @see https://www.vasp.at/wiki/index.php/AMIN
   */
  AMIN?: number;

  /**
   * Linear mixing parameter.
   * @default 0.4 for PAW datasets; for US-PPs, 0.8 if ISPIN = 1 and 0.4 if
   * ISPIN = 2
   * @see https://www.vasp.at/wiki/index.php/AMIX
   */
  AMIX?: number;

  /**
   * Linear mixing parameter for the magnetization density.
   * @default 1.6
   * @see https://www.vasp.at/wiki/index.php/AMIX_MAG
   */
  AMIX_MAG?: number;

  /**
   * Collision probability (0 to 1) for the Andersen thermostat, as average
   * number of collisions per atom and time step; 0 gives an NVE ensemble.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ANDERSEN_PROB
   */
  ANDERSEN_PROB?: number;

  /**
   * ANTIRES determines whether the Tamm-Dancoff approximation is used or not.
   * Values: 0, 1, 2.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ANTIRES
   */
  ANTIRES?: number;

  /**
   * APACO sets the maximum distance in the evaluation of the pair-correlation
   * function (in Å).
   * @default 10
   * @see https://www.vasp.at/wiki/index.php/APACO
   */
  APACO?: number;

  /**
   * BANDGAP determines the verbosity for reporting the bandgap to the OUTCAR
   * file. Only the first character is significant.
   * Values: COMPACT, WEIGHT, KPOINT.
   * @default COMPACT
   * @see https://www.vasp.at/wiki/index.php/BANDGAP
   */
  BANDGAP?: "COMPACT" | "WEIGHT" | "KPOINT" | (string & {});

  /**
   * Specifies an external magnetic field in eV.
   * @default 0.0 if ISPIN=2; 3*0.0 if LNONCOLLINEAR=true; N/A else
   * @see https://www.vasp.at/wiki/index.php/BEXT
   */
  BEXT?: number[];

  /**
   * BEXX specifies the fraction of short-range exact exchange in range-
   * separated hybrid-functionals constructed with LMODELHF=.TRUE.
   * Available as of VASP 6.6.0.
   * @default 1 if LHFCALC=true
   * @see https://www.vasp.at/wiki/index.php/BEXX
   */
  BEXX?: number;

  /**
   * Cutoff wave vector for Kerker mixing (`IMIX = 1` and/or `INIMIX = 1`).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/BMIX
   */
  BMIX?: number;

  /**
   * Cutoff wave vector for Kerker mixing (`IMIX = 1` and/or `INIMIX = 1`) of
   * the magnetization density.
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/BMIX_MAG
   */
  BMIX_MAG?: number;

  /**
   * Parameter b in the kernel of the nonlocal rVV10 correlation functional
   * (6.3 rVV10, 15.7 SCAN+rVV10, 10 PBE+rVV10L, 11.95 r2SCAN+rVV10).
   * @default 6.3
   * @see https://www.vasp.at/wiki/index.php/BPARAM
   */
  BPARAM?: number;

  /**
   * BSEELECTRON sets the coordinates of the fixed electron of the exciton
   * wavefunction.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/BSEELECTRON
   */
  BSEELECTRON?: number[];

  /**
   * BSEHOLE sets the coordinates of the fixed hole of the exciton
   * wavefunction.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/BSEHOLE
   */
  BSEHOLE?: number[];

  /**
   * Determines the precision of the time-evolution algorithm, where it
   * controls the timestep and the number of steps, and the precision of the
   * Lanczos algorithms, where it sets the convergence threshold for the
   * dielectric function.
   * Values: Low, Medium, High, Accurate.
   * @default Medium
   * @see https://www.vasp.at/wiki/index.php/BSEPREC
   */
  BSEPREC?: "Low" | "Medium" | "High" | "Accurate" | (string & {});

  /**
   * This tag is used to scale (amplify) the calculated dielectric function
   * within the supercell core-hole method and the BSE+GW method for core
   * electrons.
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/CH_AMPLIFICATION
   */
  CH_AMPLIFICATION?: number;

  /**
   * This flag controls whether the dielecectric function using the supercell
   * core-hole method is calculated or not.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/CH_LSPEC
   */
  CH_LSPEC?: boolean;

  /**
   * This tag specifies the number of frequency (energy) grid points on the
   * x-axis in the calculation of the dielectric function in the supercell
   * core-hole method.
   * @default 1000
   * @see https://www.vasp.at/wiki/index.php/CH_NEDOS
   */
  CH_NEDOS?: number;

  /**
   * This tag specifies the width of the Gaussian broadening in eV of the
   * imaginary dielectric function within the supercell core-hole method.
   * @default 0.3
   * @see https://www.vasp.at/wiki/index.php/CH_SIGMA
   */
  CH_SIGMA?: number;

  /**
   * Enables a finite differences calculation to be restarted or split up into
   * displacements.
   * Values: CONTINUE, RESET, NONE, SINGLE.
   * Available as of VASP 6.6.0.
   * @default RESET
   * @see https://www.vasp.at/wiki/index.php/CHECKPOINT_FD
   */
  CHECKPOINT_FD?: "CONTINUE" | "RESET" | "NONE" | "SINGLE" | (string & {});

  /**
   * CLL selects the angular quantum number l of the excited core electron when
   * using ICORELEVEL>0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/CLL
   */
  CLL?: number;

  /**
   * CLN selects the main quantum number n of the excited core electron when
   * using ICORELEVEL>0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/CLN
   */
  CLN?: number;

  /**
   * CLNT selects the type of the excited atoms in XAS calculations with
   * ICORELEVEL>0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/CLNT
   */
  CLNT?: number;

  /**
   * CLZ selects a fractional or the full electron charge for the core hole in
   * the core-excitation calculations with ICORELEVEL=2.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/CLZ
   */
  CLZ?: number;

  /**
   * defines the c parameter in the MBJ potential.
   * @default calculated self-consistently
   * @see https://www.vasp.at/wiki/index.php/CMBJ
   */
  CMBJ?: number[];

  /**
   * sets the alpha parameter in the MBJ and LMBJ potentials.
   * @default −0.012 if METAGGA=MBJ; 0.488 if METAGGA=LMBJ
   * @see https://www.vasp.at/wiki/index.php/CMBJA
   */
  CMBJA?: number;

  /**
   * sets the beta parameter in the MBJ and LMBJ potentials.
   * @default 1.023 if METAGGA=MBJ; 0.5 if METAGGA=LMBJ
   * @see https://www.vasp.at/wiki/index.php/CMBJB
   */
  CMBJB?: number;

  /**
   * sets the e parameter in the MBJ and local MBJ potentials.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/CMBJE
   */
  CMBJE?: number;

  /**
   * Parameter C in the kernel of the nonlocal rVV10 correlation functional.
   * @default 0.0093
   * @see https://www.vasp.at/wiki/index.php/CPARAM
   */
  CPARAM?: number;

  /**
   * Lorentzian broadening in eV of the dielectric tensor, via the complex
   * shift η in the Kramers-Kronig transformation.
   * @default 0.1 for LOPTICS, BSE/Casida TDDFT and time-evolution TDDFT;
   * OMEGAMAX × 1.3 / max(NOMEGA, 40) for GW calculations
   * @see https://www.vasp.at/wiki/index.php/CSHIFT
   */
  CSHIFT?: number;

  /**
   * CUTOFF_MU specifies the energy cutoff mu in eV for the function specified
   * by CUTOFF_MU.
   * @default 0.8 * Fermi level of a system with NUM_WANN orbitals occupied
   * @see https://www.vasp.at/wiki/index.php/CUTOFF_MU
   */
  CUTOFF_MU?: number[];

  /**
   * CUTOFF_SIGMA specifies the broadening sigma in eV for the cutoff function
   * specified by CUTOFF_TYPE.
   * @default 0.1
   * @see https://www.vasp.at/wiki/index.php/CUTOFF_SIGMA
   */
  CUTOFF_SIGMA?: number[];

  /**
   * CUTOFF_TYPE chooses the type of cutoff function to be used before
   * performing the singular-value decomposition (SVD) of the initial
   * projections matrix.
   * Values: erfc, gaussian, fermi, num_wann.
   * @default erfc
   * @see https://www.vasp.at/wiki/index.php/CUTOFF_TYPE
   */
  CUTOFF_TYPE?: "erfc" | "gaussian" | "fermi" | "num_wann" | (string & {});

  /**
   * DEG_THRESHOLD specifies whether two eigenvalues should be treated as
   * degenerate during clustering of orbitals in the linear response code.
   * DEG_THRESHOLD is specified in units of eV.
   * @default $2 \times 10^{-3}$
   * @see https://www.vasp.at/wiki/index.php/DEG_THRESHOLD
   */
  DEG_THRESHOLD?: number;

  /**
   * DEPER specifies a relative stopping criterion for the optimization of an
   * eigenvalue.
   * @default 0.3
   * @see https://www.vasp.at/wiki/index.php/DEPER
   */
  DEPER?: number;

  /**
   * DFTD4_MODEL defines the model in the DFT-D4 method.
   * Available as of VASP 6.6.0.
   * @default D4
   * @see https://www.vasp.at/wiki/index.php/DFTD4_MODEL
   */
  DFTD4_MODEL?: string;

  /**
   * DFTD4_XC sets the exchange-correlation functional which determines the van
   * der Waals parameters used in the DFT-D4 method implemented in the DFT-D4
   * package.
   * @default The functional set by the GGA, METAGGA or XC tag.
   * @see https://www.vasp.at/wiki/index.php/DFTD4_XC
   */
  DFTD4_XC?: string;

  /**
   * The flag DIMER_DIST defines the step size for the numerical
   * differentiation (in AA) for the Improved Dimer Method.
   * @default 0.01
   * @see https://www.vasp.at/wiki/index.php/DIMER_DIST
   */
  DIMER_DIST?: number;

  /**
   * Center of the cell `[Rx, Ry, Rz]` in direct lattice coordinates with
   * respect to which the dipole moment is calculated. If unset, VASP locates
   * the plane-averaged density minimum and places the center half a lattice
   * vector away from it.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/DIPOL
   */
  DIPOL?: number[];

  /**
   * step size for the finite difference k-space derivative in the linear
   * response calculation of chemical shifts.
   * @default 0.001
   * @see https://www.vasp.at/wiki/index.php/DQ
   */
  DQ?: number;

  /**
   * EBREAK specifies an absolute stopping criterion for the optimization of an
   * eigenvalue.
   * @default EDIFF/NBANDS/4
   * @see https://www.vasp.at/wiki/index.php/EBREAK
   */
  EBREAK?: number;

  /**
   * Global break condition for the electronic SC loop, in eV: stop when both
   * the total (free) energy change and the band-structure energy change
   * between two steps are below EDIFF. `0` runs exactly {@link NELM} steps.
   * @default 1E-4
   * @see https://www.vasp.at/wiki/index.php/EDIFF
   */
  EDIFF?: number;

  /**
   * Break condition for the ionic relaxation loop. Positive: stop when the
   * total-energy change between ionic steps is below EDIFFG. Negative: stop
   * when all force norms are below |EDIFFG|. Zero: stop after NSW steps.
   * Does not apply to molecular dynamics.
   * @default EDIFF × 10
   * @see https://www.vasp.at/wiki/index.php/EDIFFG
   */
  EDIFFG?: number;

  /**
   * How the Fermi energy is determined: `"MIDGAP"` (recommended; VASP ≥ 6.4),
   * `"LEGACY"`, or a fixed Fermi energy in eV (requires `ICHARG = 11`).
   * @default "LEGACY"
   * @see https://www.vasp.at/wiki/index.php/EFERMI
   */
  EFERMI?: "MIDGAP" | "LEGACY" | number | (string & {});

  /**
   * Number of Gauss–Legendre integration points used to evaluate the
   * Fermi–Dirac distribution and determine the Fermi level at finite
   * temperature using the tetrahedron method only with .
   * Available as of VASP 6.5.0.
   * @default 21
   * @see https://www.vasp.at/wiki/index.php/EFERMI_NEDOS
   */
  EFERMI_NEDOS?: number;

  /**
   * Magnitude of the applied external electric force field in eV/Å, along
   * the direction selected by `IDIPOL = 1-3`. Defined opposite to the usual
   * convention (electrons move along the field).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/EFIELD
   */
  EFIELD?: number;

  /**
   * EFIELD_PEAD specifies the homogeneous electric force field in the electric
   * enthalpy functional used to compute the self-consistent response to finite
   * electric fields. EFIELD_PEAD is specified in units of eV/Å.
   * @default 3*0.01 if LCALCEPS=true; 3*0.0 else
   * @see https://www.vasp.at/wiki/index.php/EFIELD_PEAD
   */
  EFIELD_PEAD?: number[];

  /**
   * EFOR sets external forces in eV/&#8491; on each atom in the cartesian x-,
   * y-, and z-directions. The order of the ions is equivalent to the order in
   * the POSCAR file, and for each ion, x-, y-, and z-components have to be
   * given.
   * Available as of VASP 6.5.0.
   * @default 3 * NIONS * 0.0
   * @see https://www.vasp.at/wiki/index.php/EFOR
   */
  EFOR?: number[];

  /**
   * EINT sets the energy interval for bands contributing to the calculation of
   * the partial charge density in eV.
   * Values: [real1] [real2], [real1].
   * @default not set
   * @see https://www.vasp.at/wiki/index.php/EINT
   */
  EINT?: number[];

  /**
   * Chooses which contributions to include in the computation of the electron-
   * phonon matrix elements.
   * Available as of VASP 6.5.0.
   * @default VDPR
   * @see https://www.vasp.at/wiki/index.php/ELPH_DECOMPOSE
   */
  ELPH_DECOMPOSE?: string;

  /**
   * Chooses which driver to use for electron-phonon calculations.
   * Values: el, mels.
   * Available as of VASP 6.5.0.
   * @default el
   * @see https://www.vasp.at/wiki/index.php/ELPH_DRIVER
   */
  ELPH_DRIVER?: "el" | "mels" | (string & {});

  /**
   * Number of Gauss–Legendre integration points used to evaluate the
   * Fermi–Dirac distribution and determine the electronic Fermi level at
   * finite temperature in the context of electron–phonon (el–ph) coupling
   * calculations.
   * Available as of VASP 6.5.0.
   * @default 501
   * @see https://www.vasp.at/wiki/index.php/ELPH_FERMI_NEDOS
   */
  ELPH_FERMI_NEDOS?: number;

  /**
   * If enabled, VASP ignores imaginary phonon frequencies during electron-
   * phonon calculations.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_IGNORE_IMAG_PHONONS
   */
  ELPH_IGNORE_IMAG_PHONONS?: boolean;

  /**
   * Chooses the smearing method to determine the fermi level and chemical
   * potential before an electron-phonon calculation.
   * Values: -15, -14, -5, -4, -1, 0, [integer]>0.
   * Available as of VASP 6.5.0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ELPH_ISMEAR
   */
  ELPH_ISMEAR?: number;

  /**
   * The tag ELPH_KSPACING determines the k point mesh if the KPOINTS_ELPH file
   * is not present.
   * Available as of VASP 6.5.0.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/ELPH_KSPACING
   */
  ELPH_KSPACING?: number;

  /**
   * Controls the treatment of the long-range part of the electron-phonon
   * potential.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ELPH_LR
   */
  ELPH_LR?: number;

  /**
   * Meta tag that selects reasonable defaults for electron-phonon
   * calculations.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_MODE
   */
  ELPH_MODE?: string;

  /**
   * Number of bands to compute on the dense k point grid for the electron-
   * phonon driver.
   * Available as of VASP 6.5.0.
   * @default NBANDS
   * @see https://www.vasp.at/wiki/index.php/ELPH_NBANDS
   */
  ELPH_NBANDS?: number;

  /**
   * Number of intermediate states to include in the computation of the phonon-
   * induced electron self-energy.
   * Available as of VASP 6.5.0.
   * @default ELPH_NBANDS
   * @see https://www.vasp.at/wiki/index.php/ELPH_NBANDS_SUM
   */
  ELPH_NBANDS_SUM?: number[];

  /**
   * Specifies the FFT mesh for mapping the electron-phonon potential to the
   * primitive cell.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_POT_FFT_MESH
   */
  ELPH_POT_FFT_MESH?: number[];

  /**
   * Calculates the electron-phonon potential from finite atomic displacements.
   * Available as of VASP 6.5.0.
   * @default False
   * @see https://www.vasp.at/wiki/index.php/ELPH_POT_GENERATE
   */
  ELPH_POT_GENERATE?: boolean;

  /**
   * Allows specifying an alternative primitive cell for the mapping of the
   * electron-phonon potential.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_POT_LATTICE
   */
  ELPH_POT_LATTICE?: number[];

  /**
   * Writes the potential, the force-constants and other information related to
   * electron-phonon interactions to the vaspout.h5 file.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_PREPARE
   */
  ELPH_PREPARE?: boolean;

  /**
   * Select whether to run and electron-phonon calculation.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_RUN
   */
  ELPH_RUN?: boolean;

  /**
   * Select which type of approximation is used to compute the electron
   * scattering lifetimes due to electron-phonon coupling.
   * Available as of VASP 6.5.0.
   * @default SERTA MRTA_LAMBDA
   * @see https://www.vasp.at/wiki/index.php/ELPH_SCATTERING_APPROX
   */
  ELPH_SCATTERING_APPROX?: string;

  /**
   * Compute the electron self-energy due to electron-phonon coupling only for
   * bands with indices starting from ELPH_SELFEN_BAND_START.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_BAND_START
   */
  ELPH_SELFEN_BAND_START?: number;

  /**
   * Index of the first k' band included in the electron self-energy sum; -1
   * uses all bands, and -2 activates automatic determination based on energy
   * conservation.
   * Available as of VASP 6.6.0.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_BAND_START_KP
   */
  ELPH_SELFEN_BAND_START_KP?: number;

  /**
   * Compute the electron self-energy due to electron-phonon coupling only for
   * bands with indices until ELPH_SELFEN_BAND_STOP.
   * Available as of VASP 6.5.0.
   * @default ELPH_NBANDS
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_BAND_STOP
   */
  ELPH_SELFEN_BAND_STOP?: number;

  /**
   * Index of the last k' band included in the electron self-energy sum; -1
   * uses all bands up to ELPH_NBANDS, and -2 activates automatic determination
   * based on energy conservation.
   * Available as of VASP 6.6.0.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_BAND_STOP_KP
   */
  ELPH_SELFEN_BAND_STOP_KP?: number;

  /**
   * defines the fraction of the total weight of the broadening function
   * (derived from the imaginary part of the electron self-energy) that is
   * excluded when setting the energy window beyond which the delta function is
   * considered zero. Must be between 0 and 1. This tag is only used when
   * ELPH_SELFEN_IMAG_SKIP=.TRUE. and ELPH_SELFEN_DELTA>0.
   * Available as of VASP 6.5.0.
   * @default 1e-6
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_BROAD_TOL
   */
  ELPH_SELFEN_BROAD_TOL?: number;

  /**
   * List of additional carrier densities in units of cm^-3 at which to compute
   * the phonon-mediated electron self-energy and transport coefficients.
   * Available as of VASP 6.5.0.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_CARRIER_DEN
   */
  ELPH_SELFEN_CARRIER_DEN?: number[];

  /**
   * List of carrier density ranges in logarithmic scale (in cm^-3) at which to
   * compute the phonon-mediated electron self-energy and transport
   * coefficients.
   * Available as of VASP 6.6.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_CARRIER_DEN_RANGE
   */
  ELPH_SELFEN_CARRIER_DEN_RANGE?: number[];

  /**
   * List of additional number of carriers for which to compute the phonon-
   * mediated electron self-energy and transport coefficients.
   * Available as of VASP 6.5.0.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_CARRIER_PER_CELL
   */
  ELPH_SELFEN_CARRIER_PER_CELL?: number[];

  /**
   * Complex imaginary shift to use when computing the self-energy due to
   * electron-phonon coupling.
   * Available as of VASP 6.5.0.
   * @default 0.01
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_DELTA
   */
  ELPH_SELFEN_DELTA?: number[];

  /**
   * Controls whether the Debye-Waller contribution is included in the
   * calculation of the phonon-induced electron self-energy.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_DW
   */
  ELPH_SELFEN_DW?: boolean;

  /**
   * Specifies the energy window (in eV) around the band edges within which the
   * electron-phonon self-energy is computed.
   * Available as of VASP 6.5.0.
   * @default 0.0 0.0
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_ENERGY_WINDOW
   */
  ELPH_SELFEN_ENERGY_WINDOW?: number[];

  /**
   * Controls whether the Fan-Migdal contribution is included in the
   * calculation of the phonon-induced electron self-energy.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_FAN
   */
  ELPH_SELFEN_FAN?: boolean;

  /**
   * Skip the computation of the electron-phonon matrix elements and instead
   * assume their numerical value is 1.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_G_SKIP
   */
  ELPH_SELFEN_G_SKIP?: boolean;

  /**
   * Find the direct and indirect gaps and the valence and conduction Kohn-Sham
   * states that form it and select to compute their self-energy due to
   * electron-phonon coupling.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_GAPS
   */
  ELPH_SELFEN_GAPS?: boolean;

  /**
   * Compute the electron self-energy due to electron-phonon for a list of
   * k-points specified by their index in the irreducible Brillouin zone
   * generated from KPOINTS_ELPH.
   * Available as of VASP 6.5.0.
   * @default All k-points
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_IKPT
   */
  ELPH_SELFEN_IKPT?: number[];

  /**
   * Use the tetrahedron method to skip the computation of electron-phonon
   * matrix elements for which the energy-conserving delta functions are zero.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_IMAG_SKIP
   */
  ELPH_SELFEN_IMAG_SKIP?: boolean;

  /**
   * Computes the electron self-energy due to electron-phonon for a list of
   * k-points specified by their fractional coordinates.
   * Available as of VASP 6.5.0.
   * @default All k-points
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_KPTS
   */
  ELPH_SELFEN_KPTS?: number[];

  /**
   * List of chemical potentials at which to compute the phonon-mediated
   * electron self-energy and transport coefficients.
   * Available as of VASP 6.5.0.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_MU
   */
  ELPH_SELFEN_MU?: number[];

  /**
   * List of the range of chemical potentials (in eV) at which to compute the
   * phonon-mediated electron self-energy and transport coefficients.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_MU_RANGE
   */
  ELPH_SELFEN_MU_RANGE?: number[];

  /**
   * Number of energies to use when computing the phonon-induced electron self-
   * energy.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_NW
   */
  ELPH_SELFEN_NW?: number;

  /**
   * Activates the adiabatic approximation for the phonon-induced electron
   * self-energy.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_STATIC
   */
  ELPH_SELFEN_STATIC?: boolean;

  /**
   * List of temperatures for which to compute the electron self-energy due to
   * electron-phonon coupling.
   * Available as of VASP 6.5.0.
   * @default 0 100 200 300 400 500
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_TEMPS
   */
  ELPH_SELFEN_TEMPS?: number[];

  /**
   * The range of temperatures (in K) at which to compute the phonon-mediated
   * electron self-energy and transport coefficients.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_TEMPS_RANGE
   */
  ELPH_SELFEN_TEMPS_RANGE?: number[];

  /**
   * Together with ELPH_SELFEN_NW specifies the energy window in which to
   * evaluate the phonon-induced electron self-energy.
   * Available as of VASP 6.5.0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ELPH_SELFEN_WRANGE
   */
  ELPH_SELFEN_WRANGE?: number;

  /**
   * Activates transport calculation involving electron-phonon coupling.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT
   */
  ELPH_TRANSPORT?: boolean;

  /**
   * choose the fraction of the integral weight of the derivative of the
   * Fermi–Dirac distribution that is excluded when defining the energy window
   * for the Onsager coefficients. Must be between 0 and 1, and is only used
   * when ELPH_TRANSPORT_DRIVER=1.
   * Available as of VASP 6.5.0.
   * @default 1e-6
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_DFERMI_TOL
   */
  ELPH_TRANSPORT_DFERMI_TOL?: number;

  /**
   * choose method to compute the Onsager coefficients, which are then used to
   * compute the transport coefficients.
   * Available as of VASP 6.5.0.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_DRIVER
   */
  ELPH_TRANSPORT_DRIVER?: number;

  /**
   * Upper bound of the energy window in which states are considered for
   * transport calculations.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_EMAX
   */
  ELPH_TRANSPORT_EMAX?: number;

  /**
   * Specifies the maximum energy (in eV) to be considered when computing the
   * transport distribution function for plotting.
   * Available as of VASP 6.5.0.
   * @default \max(\varepsilon_{n\mathbf{k
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_EMAX_PLOT
   */
  ELPH_TRANSPORT_EMAX_PLOT?: number;

  /**
   * Lower bound of the energy window in which states are considered for
   * transport calculations.
   * Available as of VASP 6.5.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_EMIN
   */
  ELPH_TRANSPORT_EMIN?: number;

  /**
   * Specifies the minimum energy (in eV) to be considered when computing the
   * transport distribution function for plotting.
   * Available as of VASP 6.5.0.
   * @default \min(\varepsilon_{n\mathbf{k
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_EMIN_PLOT
   */
  ELPH_TRANSPORT_EMIN_PLOT?: number;

  /**
   * Specifies the number of energy points used to sample the transport
   * distribution function for plotting.
   * Available as of VASP 6.5.0.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/ELPH_TRANSPORT_NEDOS_PLOT
   */
  ELPH_TRANSPORT_NEDOS_PLOT?: number;

  /**
   * Toggles the use of BLAS routines for computing electron-phonon matrix
   * elements.
   * Available as of VASP 6.5.0.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/ELPH_USEBLAS
   */
  ELPH_USEBLAS?: boolean;

  /**
   * Computes electron-phonon matrix elements in reciprocal space instead of
   * real space.
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_USERECIP
   */
  ELPH_USERECIP?: boolean;

  /**
   * Maximum memory (in MB) allocated for caching wavefunctions during
   * electron-phonon matrix element calculations.
   * Available as of VASP 6.5.1.
   * @default 1000
   * @see https://www.vasp.at/wiki/index.php/ELPH_WF_CACHE_MB
   */
  ELPH_WF_CACHE_MB?: number;

  /**
   * Pre-fills the wavefunction cache before the main electron-phonon loop
   * begins.
   * Available as of VASP 6.5.0.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/ELPH_WF_CACHE_PREFILL
   */
  ELPH_WF_CACHE_PREFILL?: boolean;

  /**
   * Selects the MPI communication pattern used to exchange orbitals between
   * different MPI ranks.
   * Available as of VASP 6.5.0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ELPH_WF_COMM_OPT
   */
  ELPH_WF_COMM_OPT?: number;

  /**
   * After computing the electronic states, they are redistributed among the
   * CPUs such that the workload to compute the electron self-energy is similar
   * among the different CPUs.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_WF_REDISTRIBUTE
   */
  ELPH_WF_REDISTRIBUTE?: boolean;

  /**
   * If set, writes the electron group velocities to the vaspout.h5 file.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_WRITE_HDF5VEL
   */
  ELPH_WRITE_HDF5VEL?: boolean;

  /**
   * If set, writes the electron group velocities to a velocity human-readable
   * text file.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ELPH_WRITE_TEXTVEL
   */
  ELPH_WRITE_TEXTVEL?: boolean;

  /**
   * Upper bound of the energy range for the DOS, in eV.
   * @default highest KS eigenvalue + Δ
   * @see https://www.vasp.at/wiki/index.php/EMAX
   */
  EMAX?: number;

  /**
   * Lower bound of the energy range for the DOS, in eV. Set EMIN > EMAX if
   * unsure where the region of interest lies.
   * @default lowest KS eigenvalue - Δ
   * @see https://www.vasp.at/wiki/index.php/EMIN
   */
  EMIN?: number;

  /**
   * Specifies the cutoff energy of the plane-wave representation of the
   * augmentation charges in eV.
   * @default largest EAUG read from the POTCAR file
   * @deprecated Deprecated; should not be used anymore.
   * @see https://www.vasp.at/wiki/index.php/ENAUG
   */
  ENAUG?: number;

  /**
   * Plane-wave basis-set energy cutoff, in eV. The wiki strongly recommends
   * always setting it explicitly.
   * @default largest ENMAX in the POTCAR file
   * @see https://www.vasp.at/wiki/index.php/ENCUT
   */
  ENCUT?: number;

  /**
   * The ENCUTFOCK tag sets the energy cutoff that determines the FFT grids
   * used by the Hartree-Fock routines.
   * @default unset
   * @deprecated No longer supported (VASP ≥ 5.2.4); use PRECFOCK instead.
   * @see https://www.vasp.at/wiki/index.php/ENCUTFOCK
   */
  ENCUTFOCK?: number;

  /**
   * The tag ENCUTGW sets the energy cutoff for the response function. It
   * controls the basis set for the response functions in exactly the same
   * manner as ENCUT does for the orbitals.
   * @default 2/3 ENCUT
   * @see https://www.vasp.at/wiki/index.php/ENCUTGW
   */
  ENCUTGW?: number;

  /**
   * See the VASP wiki for ENCUTGWSOFT.
   * @default ENCUTGWtimes 0.8 for ALGO=ACFDT; ENCUTGWtimes 0.8 as of VASP.6.3;
   * ENCUTGW else
   * @see https://www.vasp.at/wiki/index.php/ENCUTGWSOFT
   */
  ENCUTGWSOFT?: number;

  /**
   * Reciprocal space cutoff for the treatment of the long-range contribution.
   * Available as of VASP 6.5.0.
   * @default 50 eV
   * @see https://www.vasp.at/wiki/index.php/ENCUTLR
   */
  ENCUTLR?: number;

  /**
   * Energy cutoff, in eV, used during the initial (steepest-descent) phase for
   * `IALGO = 48`.
   * @default ENCUT
   * @see https://www.vasp.at/wiki/index.php/ENINI
   */
  ENINI?: number;

  /**
   * Dielectric constant of the medium; used only to scale the monopole and
   * dipole corrections.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/EPSILON
   */
  EPSILON?: number;

  /**
   * ESTOP specifies the stop condition for stochastic MP2.
   * @default 0.05
   * @see https://www.vasp.at/wiki/index.php/ESTOP
   */
  ESTOP?: number;

  /**
   * EVENONLY=.TRUE. selects a subset of k-points for the representation of the
   * Fock exchange potential, with C_1=C_2=C_3=1, and n_1+n_2+n_3 even.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/EVENONLY
   */
  EVENONLY?: boolean;

  /**
   * EVENONLYGW allows to restrict the k-points in the evaluation of response
   * functions (in GW calculations) to even values.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/EVENONLYGW
   */
  EVENONLYGW?: boolean;

  /**
   * EWALD_CUTOFF sets the unified cutoff radius for the Ewald summation of the
   * electrostatic interaction. It controls both the number of cells that
   * contribute (in real space) as well as the number of G-vectors that are
   * considered (in reciprocal space).
   * Available as of VASP 6.6.0.
   * @default 4.0
   * @see https://www.vasp.at/wiki/index.php/EWALD_CUTOFF
   */
  EWALD_CUTOFF?: number;

  /**
   * Defines the step height for the bias potential in eV.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/FBIAS_A
   */
  FBIAS_A?: number[];

  /**
   * Sets the slope of the bias potential.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/FBIAS_D
   */
  FBIAS_D?: number[];

  /**
   * Defines the half-step position for the bias potential.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/FBIAS_R0
   */
  FBIAS_R0?: number[];

  /**
   * Down-spin occupancies for `ISMEAR = -2` with `ISPIN = 2`; same layout as
   * {@link FERWE}.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/FERDO
   */
  FERDO?: number[];

  /**
   * Occupancy of every state for `ISMEAR = -2`, band index fastest:
   * `[f(1), ..., f(NBANDS × Nk)]`, each in [0, 1]. Up-spin only when
   * `ISPIN = 2` (see {@link FERDO}). For non-spin-polarized runs these are
   * half the OUTCAR occupations.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/FERWE
   */
  FERWE?: number[];

  /**
   * Defines whether a forward (FINDIFF=1) or a central (FINDIFF=2) difference
   * formula for the numerical differentiation to compute the curvature along
   * the dimer direction is used in the improved dimer method.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/FINDIFF
   */
  FINDIFF?: number;

  /**
   * Select which atom types in the POSCAR-file participate in swapping within
   * the Müller-Plathe method.
   * @default NIONS * False
   * @see https://www.vasp.at/wiki/index.php/FMP_ACTIVE
   */
  FMP_ACTIVE?: boolean[];

  /**
   * Index of the lattice vector mathbfa_i along which the temperature gradient
   * is created in the (Müller-Plathe method).
   * Values: 1, 2, 3.
   * @default 3
   * @see https://www.vasp.at/wiki/index.php/FMP_DIRECTION
   */
  FMP_DIRECTION?: number;

  /**
   * Number of time steps between two swapping events in the Müller-Plathe
   * method.
   * @default 10
   * @see https://www.vasp.at/wiki/index.php/FMP_PERIOD
   */
  FMP_PERIOD?: number;

  /**
   * Number of slabs perpendicular to the temperature gradient in the Müller-
   * Plathe method.
   * @default 10
   * @see https://www.vasp.at/wiki/index.php/FMP_SNUMBER
   */
  FMP_SNUMBER?: number;

  /**
   * Number of pairs that are exchanged in a single swapping event in the
   * Müller-Plathe method.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/FMP_SWAPNUM
   */
  FMP_SWAPNUM?: number;

  /**
   * The tag FOCKCORR determines how the Coulomb convergence corrections are
   * applied.
   * Values: 1, 2.
   * @default 2 if LMAXFOCKAE>0; 1 else
   * @see https://www.vasp.at/wiki/index.php/FOCKCORR
   */
  FOCKCORR?: number;

  /**
   * Specify gamma in vdW-DF3-opt1/vdW-DF3-opt2.
   * @default 1.12 for IVDW_NL=3 or; 1.29 for IVDW_NL=4
   * @see https://www.vasp.at/wiki/index.php/GAMMA_VDW
   */
  GAMMA_VDW?: number;

  /**
   * LDA or GGA exchange-correlation functional ("_X"/"_C" suffix = exchange-
   * or correlation-only):
   * - `"LIBXC"` / `"LI"`: any LDA/GGA from Libxc (VASP ≥ 6.3.0; needs LIBXC1/LIBXC2)
   * - `"CA"` / `"PZ"`: LDA, Slater + Perdew-Zunger (Ceperley-Alder)
   * - `"PW92"`: LDA, Slater + Perdew-Wang 92 (VASP ≥ 6.5.0)
   * - `"SL"`: Slater exchange only (VASP ≥ 6.4.3)
   * - `"CA_C"` / `"PZ_C"`: Perdew-Zunger correlation only (VASP ≥ 6.4.3)
   * - `"PW92_C"`: Perdew-Wang 92 correlation only (VASP ≥ 6.5.0)
   * - `"VW"`: LDA, Slater + VWN5
   * - `"HL"`: LDA, Slater + Hedin-Lundqvist
   * - `"WI"`: LDA, Slater + Wigner
   * - `"PE"`: PBE
   * - `"PBE_X"` / `"PBE_C"`: PBE exchange / correlation only (VASP ≥ 6.4.3)
   * - `"RE"`: revPBE (Zhang-Yang)
   * - `"RP"`: RPBE (Hammer et al.)
   * - `"PS"`: PBEsol
   * - `"AM"`: AM05
   * - `"91"`: PW91
   * - `"B3"`: B3LYP with VWN3; `"B5"`: B3LYP with VWN5
   * - `"OR"`: optPBE exchange + PBE correlation
   * - `"BO"`: optB88 exchange + PBE correlation (set PARAM1/PARAM2)
   * - `"MK"`: optB86b exchange + PBE correlation
   * - `"ML"`: PW86R exchange + PBE correlation
   * - `"CX"`: CX (LV-PW86r) exchange + PBE correlation
   * - `"BF"`: BEEF (requires -Dlibbeef)
   * @default the functional given by LEXCH in the POTCAR, if METAGGA and XC are also unset
   * @see https://www.vasp.at/wiki/index.php/GGA
   */
  GGA?:
    | "LIBXC"
    | "LI"
    | "CA"
    | "PZ"
    | "PW92"
    | "SL"
    | "CA_C"
    | "PZ_C"
    | "PW92_C"
    | "VW"
    | "HL"
    | "WI"
    | "PE"
    | "PBE_X"
    | "PBE_C"
    | "RE"
    | "RP"
    | "PS"
    | "AM"
    | "91"
    | "B3"
    | "B5"
    | "OR"
    | "BO"
    | "MK"
    | "ML"
    | "CX"
    | "BF"
    | (string & {});

  /**
   * If set to GGA_COMPAT = .FALSE., this tag restores the full lattice
   * symmetry for gradient-corrected functionals.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/GGA_COMPAT
   */
  GGA_COMPAT?: boolean;

  /**
   * HFALPHA sets the decay constant used in the method of Massida, Posternak,
   * and Baldereschi, which is activated by HFRCUT=0.
   * @default 6/sqrt(ENMAX)/(2π) if HFRCUT is 0
   * @see https://www.vasp.at/wiki/index.php/HFALPHA
   */
  HFALPHA?: number;

  /**
   * To be compatible w.r.t. old releases, VASP also reads the flag HFLMAX to
   * the same effect as LMAXFOCK.
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/HFLMAX
   */
  HFLMAX?: number;

  /**
   * HFRCUT specifies how the Coulomb kernel is approximated at G=0 when the
   * Fock energy and the exchange potential are evaluated.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/HFRCUT
   */
  HFRCUT?: number;

  /**
   * Range-separation parameter (Å⁻¹) of range-separated hybrids, e.g. 0.2 for
   * HSE06 with `GGA = PE`. Only usable with `GGA = PE`, `PS` or `CA`.
   * @default 0 (none)
   * @see https://www.vasp.at/wiki/index.php/HFSCREEN
   */
  HFSCREEN?: number;

  /**
   * HILLS_BIN sets the number of steps after which the bias potential is
   * updated in a metadynamics run (in case VASP was compiled with -Dtbdyn).
   * @default NSW
   * @see https://www.vasp.at/wiki/index.php/HILLS_BIN
   */
  HILLS_BIN?: number;

  /**
   * HILLS_H specifies the height of the Gaussian hill (in eV) used in
   * metadynamics (in case VASP was compiled with -Dtbdyn).
   * @default 10^-3
   * @see https://www.vasp.at/wiki/index.php/HILLS_H
   */
  HILLS_H?: number;

  /**
   * HILLS_W specifies the width of the Gaussian hill (in units of the
   * corresponding collective variable) used in metadynamics (in case VASP was
   * compiled with -Dtbdyn).
   * @default 10^-3
   * @see https://www.vasp.at/wiki/index.php/HILLS_W
   */
  HILLS_W?: number;

  /**
   * HITOLER specifies the convergence parameter for the iterative Hirschfeld
   * partitioning in the Tkatchenko-Scheffler method.
   * @default 5times10^-5
   * @see https://www.vasp.at/wiki/index.php/HITOLER
   */
  HITOLER?: number;

  /**
   * Switches on the constrained local moments approach (penalty term driving
   * the moment within {@link RWIGS} towards {@link M_CONSTR}):
   * - `1`: constrain the direction of the moments
   * - `2`: constrain the size and direction of the moments
   * - `4`: constrain the direction and sign of the moments (VASP ≥ 6.4.0)
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/I_CONSTRAINED_M
   */
  I_CONSTRAINED_M?: number;

  /**
   * Low-level orbital-optimization algorithm; prefer {@link ALGO}:
   * - `-1`: performance test only
   * - `2`: orbitals and eigenvalues fixed; `3`: orbitals fixed;
   *   `4`: subspace rotation only
   * - `38`: blocked Davidson
   * - `44`, `46`, `48`: RMM-DIIS variants (48 most reliable)
   * - `53`: damped MD; `54`: quick-min damped MD; `58`: preconditioned
   *   conjugate gradient (direct optimization)
   * - `90`: exact diagonalization
   * - `5`–`8`, `15`–`18`, `28`: band-by-band conjugate gradient, not
   *   supported since VASP 5
   * @default 38 if ALGO is not set (8 for VASP 4.4 and older)
   * @see https://www.vasp.at/wiki/index.php/IALGO
   */
  IALGO?: number;

  /**
   * IALL_IN_ONE>0 enables the all-in-one mode for many-body perturbation
   * theory calculations, i.e., ALGO=ACFDT[R],
   * [[Practical_guide_to_GW_calculations|[EV]GW0[R]]], GWR.
   * @default 1 for LALL_IN_ONE=true or NBANDS<0; -1 for LALL_IN_ONE=false
   * @see https://www.vasp.at/wiki/index.php/IALL_IN_ONE
   */
  IALL_IN_ONE?: number;

  /**
   * IBAND sets a list of bands that contribute to calculating the partial
   * charge density.
   * @default not set
   * @see https://www.vasp.at/wiki/index.php/IBAND
   */
  IBAND?: number[];

  /**
   * How the crystal structure changes during the calculation:
   * - `-1`: no update
   * - `0`: molecular dynamics
   * - `1`: structure optimization with RMM-DIIS (quasi-Newton)
   * - `2`: structure optimization with conjugate gradient
   * - `3`: structure optimization with damped molecular dynamics
   * - `5`: phonons by finite differences without symmetry (deprecated; use 6)
   * - `6`: phonons by finite differences with symmetry
   * - `7`: phonons by perturbation theory without symmetry (deprecated; use 8)
   * - `8`: phonons by perturbation theory with symmetry
   * - `11`: interactively supplied structures from standard input
   * - `12`: structures supplied by a Python plugin
   * - `40`: intrinsic-reaction-coordinate (IRC) calculation
   * - `44`: improved dimer method
   * @default -1 if {@link NSW} = -1 or 0, else 0
   * @see https://www.vasp.at/wiki/index.php/IBRION
   */
  IBRION?: number;

  /**
   * IBSE can be used to select the algorithm for solving the Bethe-Salpeter or
   * Casida equation.
   * Values: 0, 1, 2, 3.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/IBSE
   */
  IBSE?: number;

  /**
   * How the initial charge density is constructed:
   * - `0`: from the initial wave functions
   * - `1`: read CHGCAR and extrapolate to the new positions
   * - `2`: superposition of atomic charge densities
   * - `4`: read the local potential from the POT file (VASP ≥ 5.1)
   * - `5`: external charge-density-update mode (e.g. DFT+DMFT), reading
   *   occupation corrections from GAMMA/vaspgamma.h5 each SCF step
   * Adding 10 (`10`, `11`, `12`) keeps the charge density fixed for the whole
   * electronic minimization (non-self-consistent run): `11` reads CHGCAR (band
   * structures/DOS), `12` uses atomic charge densities (Harris-Foulkes).
   * @default 2 if ISTART = 0, otherwise 0
   * @see https://www.vasp.at/wiki/index.php/ICHARG
   */
  ICHARG?: number;

  /**
   * determines the order of the finite difference stencil used to calculate
   * the magnetic susceptibility.
   * Values: 1, 2, 3.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ICHIBARE
   */
  ICHIBARE?: number;

  /**
   * ICORELEVEL controls whether the core energies are explicitly calculated or
   * not and how they are calculated.
   * Values: 0, 1, 2.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ICORELEVEL
   */
  ICORELEVEL?: number;

  /**
   * Switches on monopole/dipole and quadrupole corrections to the total
   * energy (monopole corrections too if the system is charged):
   * - `1`, `2`, `3`: only along the first, second or third lattice vector
   *   (slabs, with the surface normal along that direction)
   * - `4`: in all directions (isolated molecules)
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/IDIPOL
   */
  IDIPOL?: number;

  /**
   * IEPSILON determines along which Cartesian direction the E field is
   * applied.
   * Values: 1, 2, 3, 4.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/IEPSILON
   */
  IEPSILON?: number;

  /**
   * If positive, enforces the acoustic sum rule on the interatomic force
   * constants during an electron-phonon calculation.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/IFC_ASR
   */
  IFC_ASR?: number;

  /**
   * Controls the treatment of the long-range part of the interatomic force
   * constants during electron-phonon calculations.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/IFC_LR
   */
  IFC_LR?: number;

  /**
   * This tag specifies the socalled parallel or mathbfG_parallel direction in
   * the integration over the reciprocal space unit cell needed for LCALCPOL.
   * Values: 1, 2, 3.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/IGPAR
   */
  IGPAR?: number;

  /**
   * Defines the number of VASP calculations in separate directories, (e.g.,
   * 01, 02, 03, etc.) for nudged elastic band calculations, parallel
   * tempering, and thermodynamic integration.
   * Available as of VASP 6.2.0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/IMAGES
   */
  IMAGES?: number;

  /**
   * Type of density mixing:
   * - `0`: no mixing
   * - `1`: Kerker mixing
   * - `2`: variant of Tchebycheff mixing (damping set by {@link AMIN})
   * - `4`: Broyden's 2nd method (`WC = 0`) or Pulay mixing (`WC > 0`)
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/IMIX
   */
  IMIX?: number;

  /**
   * INCREM controls the transformation velocity in the slow-growth approach
   * (in case VASP was compiled with -Dtbdyn).
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/INCREM
   */
  INCREM?: number[];

  /**
   * Functional form of the initial mixing matrix in the Broyden scheme
   * (`IMIX = 4`); should not be changed (tune AMIX/BMIX instead):
   * - `0`: linear mixing with {@link AMIX}
   * - `1`: Kerker mixing with AMIX and {@link BMIX}
   * - `2`: no mixing (not recommended)
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/INIMIX
   */
  INIMIX?: number;

  /**
   * How initial orbitals are set up when `ISTART = 0`:
   * - `0`: "jellium" orbitals (plane waves of lowest kinetic energy; requires a
   *   special POTCAR)
   * - `1`: random numbers (recommended)
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/INIWAV
   */
  INIWAV?: number;

  /**
   * Determines the verbosity of the NMR output.
   * Values: -1, 0, 1.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/INMRPRINT
   */
  INMRPRINT?: number;

  /**
   * INTERACTIVE enables an interactive mode in which a series of structures is
   * piped into VASP via stdin.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/INTERACTIVE
   */
  INTERACTIVE?: boolean;

  /**
   * IPEAD specifies the order of the finite difference stencil used to compute
   * the derivative of the cell-periodic part of the orbitals w.r.t. k,
   * |&nabla;_ku_nk&rang; (LPEAD=.TRUE.), and the derivative of the
   * polarization w.r.t. the orbitals, δP/δ&lang;&psi;_nk| for
   * (LCALCEPS=.TRUE., or EFIELD_PEAD&ne;0).
   * Values: 1, 2, 3, 4.
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/IPEAD
   */
  IPEAD?: number;

  /**
   * Defines the tolerance factor Delta_0 in Å used in the IRC calculations.
   * @default 0.0015
   * @see https://www.vasp.at/wiki/index.php/IRC_DELTA0
   */
  IRC_DELTA0?: number;

  /**
   * Defines the direction of the initial displacement of the initial
   * transition-state structure in IRC calculations.
   * Values: -1, 1.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/IRC_DIRECTION
   */
  IRC_DIRECTION?: number;

  /**
   * Upper limit for the step size (in fs).
   * @default 3.000
   * @see https://www.vasp.at/wiki/index.php/IRC_MAXSTEP
   */
  IRC_MAXSTEP?: number;

  /**
   * Lower limit for the step size (in fs).
   * @default 0.0250
   * @see https://www.vasp.at/wiki/index.php/IRC_MINSTEP
   */
  IRC_MINSTEP?: number;

  /**
   * Sets the number of steps in which the energy must monotonously increase
   * before an IRC calculation terminates.
   * @default 20
   * @see https://www.vasp.at/wiki/index.php/IRC_STOP
   */
  IRC_STOP?: number;

  /**
   * The constant velocity vector (in Å/fs) in an IRC calculation.
   * @default 0.002
   * @see https://www.vasp.at/wiki/index.php/IRC_VNORM0
   */
  IRC_VNORM0?: number;

  /**
   * Controls the line-search algorithm used during the direct minimization of
   * the electronic structure (ALGO = All).
   * Values: 0, 1.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ISEARCH
   */
  ISEARCH?: number;

  /**
   * Whether the stress tensor is calculated and which degrees of freedom vary
   * (forces are always calculated):
   * - `0`: no stress; positions vary
   * - `1`: trace of stress only; positions vary
   * - `2`: stress; positions vary
   * - `3`: stress; positions, cell shape and volume vary
   * - `4`: stress; positions and cell shape vary
   * - `5`: stress; cell shape varies
   * - `6`: stress; cell shape and volume vary
   * - `7`: stress; cell volume varies
   * - `8`: stress; positions and cell volume vary (VASP ≥ 6.4.1)
   * @default 0 for `IBRION = 0` (MD) or `LHFCALC = true`, else 2
   * @see https://www.vasp.at/wiki/index.php/ISIF
   */
  ISIF?: number;

  /**
   * How partial occupancies are set:
   * - `-15`: tetrahedron method with Blöchl corrections and Fermi-Dirac
   *   smearing of width {@link SIGMA}
   * - `-14`: tetrahedron method with Fermi-Dirac smearing of width SIGMA
   * - `-5`: tetrahedron method with Blöchl corrections, no smearing
   * - `-4`: tetrahedron method without smearing
   * - `-3`: loop over the (ISMEAR, SIGMA) pairs in {@link SMEARINGS}
   * - `-2`: occupancies fixed, read from WAVECAR or set by
   *   {@link FERWE}/{@link FERDO}
   * - `-1`: Fermi smearing of width SIGMA
   * - `0`: Gaussian smearing of width SIGMA
   * - `N > 0`: Methfessel-Paxton smearing of order N, width SIGMA (can give
   *   erroneous results for insulators)
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ISMEAR
   */
  ISMEAR?: number;

  /**
   * Spin polarization:
   * - `1`: non-spin-polarized (one shared charge density)
   * - `2`: spin-polarized collinear (spin up and down treated separately)
   *
   * Ignored for noncollinear runs ({@link LNONCOLLINEAR}). Since VASP 6.5.0,
   * combining `ISPIN = 2` and MAGMOM with `LNONCOLLINEAR = .TRUE.` is an error.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/ISPIN
   */
  ISPIN?: number;

  /**
   * Whether to read the WAVECAR file:
   * - `0`: start from scratch; initialize orbitals according to {@link INIWAV}
   * - `1`: restart with constant energy cutoff; orbitals read from WAVECAR and
   *   the plane-wave set redefined for the new cell/ENCUT
   * - `2`: restart with constant basis set; plane-wave set not changed
   * - `3`: full restart including orbital and charge prediction (as `2`, but a
   *   valid TMPCAR must also exist; used for MD)
   * Values `1`/`2` revert to `0` if WAVECAR is missing or inconsistent.
   * @default 1 if a WAVECAR file exists, otherwise 0
   * @see https://www.vasp.at/wiki/index.php/ISTART
   */
  ISTART?: number;

  /**
   * How symmetry is treated:
   * - `-1`: symmetry switched off completely
   * - `0`: no symmetry, but Ψ_k = Ψ*_-k is assumed (use for MD)
   * - `1`: symmetry on
   * - `2`: symmetry on, with memory-conserving charge-density symmetrization
   * - `3`: symmetry on, charge density built from symmetrized orbitals
   *   (used with `LHFCALC = .TRUE.`)
   * @default 1 with USPPs; 3 if `LHFCALC = true`; else 2
   * @see https://www.vasp.at/wiki/index.php/ISYM
   */
  ISYM?: number;

  /**
   * Atom-pairwise or many-body vdW dispersion correction (added to energy,
   * forces and stress):
   * - `0`: no correction
   * - `1` or `10`: DFT-D2 (Grimme; VASP ≥ 5.2.11)
   * - `11`: DFT-D3 with zero damping (VASP ≥ 5.3.4)
   * - `12`: DFT-D3 with Becke-Johnson damping (VASP ≥ 5.3.4)
   * - `13`: DFT-D4 (VASP ≥ 6.2, external package)
   * - `14`: a method from the libMBD library (VASP ≥ 6.4.3, external package)
   * - `15`: DFT-D3 via the simple-DFT-D3 library (VASP ≥ 6.6.0, external
   *   package)
   * - `2` or `20`: Tkatchenko-Scheffler (VASP ≥ 5.3.3)
   * - `21`: Tkatchenko-Scheffler with iterative Hirshfeld partitioning
   *   (VASP ≥ 5.3.5)
   * - `202`: many-body dispersion MBD@rsSCS (VASP ≥ 5.4.1)
   * - `263`: many-body dispersion with fractionally ionic model,
   *   MBD@rSC/FI (VASP ≥ 6.1.0)
   * - `3`: DFT-ulg (VASP ≥ 5.3.5)
   * - `4`: dDsC dispersion correction (VASP ≥ 5.4.1)
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/IVDW
   */
  IVDW?: number;

  /**
   * Kernel of the nonlocal vdW part of the functional (VASP ≥ 6.4.0):
   * - `1`: kernel of Dion et al. (parameter {@link ZAB_VDW})
   * - `2`: rVV10 kernel (parameters {@link BPARAM}, {@link CPARAM})
   * @default 1 for a GGA; 2 for a METAGGA
   * @see https://www.vasp.at/wiki/index.php/IVDW_NL
   */
  IVDW_NL?: number;

  /**
   * How orbitals and/or charge densities are extrapolated between ionic
   * configurations (values < 10 use the TMPCAR file and are deprecated):
   * - `0`: no extrapolation
   * - `1` | `11`: simple extrapolation of the charge density using atomic
   *   charge densities
   * - `2` | `12`: second-order extrapolation of orbitals and charge density
   * - `3` | `13`: second-order extrapolation of orbitals, simple
   *   extrapolation of the charge density (not encouraged)
   * @default 12 for `IBRION = 0` (MD); 11 for relaxation and on-the-fly
   * machine-learning MD; 0 otherwise (static calculation)
   * @see https://www.vasp.at/wiki/index.php/IWAVPR
   */
  IWAVPR?: number;

  /**
   * K_MULTIPLY sets the per-direction k-point grid multiplier for downsampling
   * from a denser WAVECAR.
   * Available as of VASP 6.6.1.
   * @default -1 -1 -1 if not set in INCAR
   * @see https://www.vasp.at/wiki/index.php/K_MULTIPLY
   */
  K_MULTIPLY?: number[];

  /**
   * After KBLOCK × {@link NBLOCK} ionic steps the averaged pair-correlation
   * function and DOS are written to PCDAT and DOSCAR.
   * @default NSW
   * @see https://www.vasp.at/wiki/index.php/KBLOCK
   */
  KBLOCK?: number;

  /**
   * Determines the spatial extent of the truncated Coulomb interaction
   * relative to the computational cell dimension along the truncation
   * direction.
   * @default $\sqrt{3}$ if KERNEL_TRUNCATION/IDIMENSIONALITY = 0; 1 if
   * KERNEL_TRUNCATION/IDIMENSIONALITY = 2
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/FACTOR
   */
  "KERNEL_TRUNCATION/FACTOR"?: number;

  /**
   * Specifies the boundary condition used to compute the hartree and ionic
   * potential.
   * Values: 0, 2, 3.
   * @default 3
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/IDIMENSIONALITY
   */
  "KERNEL_TRUNCATION/IDIMENSIONALITY"?: number;

  /**
   * KERNEL_TRUNCATION/IPAD controls the padding strategy used for the Coulomb
   * kernel truncation in reciprocal space. Padding defines how much additional
   * empty space is introduced around the charge density before applying
   * truncation. This affects both the accuracy of the truncated Coulomb
   * potential and the computational cost.
   * @default 3 if KERNEL_TRUNCATION/IDIMENSIONALITY = 0; 2 if
   * KERNEL_TRUNCATION/IDIMENSIONALITY = 2
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/IPAD
   */
  "KERNEL_TRUNCATION/IPAD"?: number;

  /**
   * Specifies the non-periodic dimension when performing calculations with the
   * Coulomb-kernel-truncation method for 2D materials.
   * Values: 1, 2, 3.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/ISURFACE
   */
  "KERNEL_TRUNCATION/ISURFACE"?: number;

  /**
   * Coarsen the charge density before padding to speed up the computation of
   * the local potential in the Coulomb-kernel-truncation method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/LCOARSEN
   */
  "KERNEL_TRUNCATION/LCOARSEN"?: boolean;

  /**
   * Truncates the Coulomb kernel to remove electrostatic interactions along
   * non-periodic dimensions.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/KERNEL_TRUNCATION/LTRUNCATE
   */
  "KERNEL_TRUNCATION/LTRUNCATE"?: boolean;

  /**
   * Whether the automatically generated k-point mesh is Γ-centered; if
   * false it is shifted as in a Monkhorst-Pack grid. Ignored when a KPOINTS
   * file is present.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/KGAMMA
   */
  KGAMMA?: boolean;

  /**
   * Number of k-point groups treated in parallel (VASP ≥ 5.3.2); should be an
   * integer divisor of the number of cores. Also the parallelization tag for
   * Laplace-transformed MP2 calculations.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/KPAR
   */
  KPAR?: number;

  /**
   * KPOINT_BSE specifies the k-point index at which VASP calculates the
   * dielectric matrix.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/KPOINT_BSE
   */
  KPOINT_BSE?: number[];

  /**
   * Selects which diagonalization algorithm to use for the optional k-points
   * driver.
   * Values: 0, 1, 2.
   * Available as of VASP 6.5.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/KPOINTS_OPT_MODE
   */
  KPOINTS_OPT_MODE?: number;

  /**
   * KPOINTS_OPT_NKBATCH determines the size of the batch of k-points for the
   * KPOINTS_OPT driver.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/KPOINTS_OPT_NKBATCH
   */
  KPOINTS_OPT_NKBATCH?: number;

  /**
   * KPUSE sets a list of k points that contribute to calculating the partial
   * charge density.
   * @default not set
   * @see https://www.vasp.at/wiki/index.php/KPUSE
   */
  KPUSE?: number[];

  /**
   * Smallest allowed spacing between k points, in Å⁻¹, for the mesh
   * generated automatically when no KPOINTS file is present.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/KSPACING
   */
  KSPACING?: number;

  /**
   * Spacing between k points in the automatically generated mesh for the
   * KPOINTS_OPT driver if the KPOINTS_OPT file is not present.
   * Available as of VASP 6.6.0.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/KSPACING_OPT
   */
  KSPACING_OPT?: number;

  /**
   * Controls whether the ladder diagrams are included in the BSE calculation.
   * Note that the default for LRPA and therefore LADDER is somewhat
   * convoluted; so better to always double-check the OUTCAR file whether VASP
   * behaves as expected. Generally, VASP will select ladder diagrams whenever
   * this seems reasonable. This is for instance the case for ALGO="BSE" or
   * "TDHF" calculations.
   * @default .NOT. LRPA
   * @see https://www.vasp.at/wiki/index.php/LADDER
   */
  LADDER?: boolean;

  /**
   * Reconstruct the all-electron charge density on the fine FFT grid and
   * write core, proto-atomic valence and self-consistent valence densities to
   * AECCAR0, AECCAR1 and AECCAR2.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LAECHG
   */
  LAECHG?: boolean;

  /**
   * LALL_IN_ONE=.TRUE. enables the all-in-one mode for many-body perturbation
   * theory calculations, i.e., ALGO=ACFDT[R],
   * [[Practical_guide_to_GW_calculations|[EV]GW0[R]]], GWR.
   * @default false for NBANDS>0; true for NBANDS<0
   * @see https://www.vasp.at/wiki/index.php/LALL_IN_ONE
   */
  LALL_IN_ONE?: boolean;

  /**
   * Weight of the constrained-local-moment penalty terms in the total energy
   * and Hamiltonian (see {@link I_CONSTRAINED_M}).
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/LAMBDA
   */
  LAMBDA?: number;

  /**
   * LANCZOSTHR is used by the BSE Lanczos algorithm to stop the iterative
   * procedure, once the dielectric function has reached numerical convergence.
   * @default 10^-3
   * @deprecated Deprecated and will be removed in a future release; use
   * BSEPREC instead.
   * @see https://www.vasp.at/wiki/index.php/LANCZOSTHR
   */
  LANCZOSTHR?: number;

  /**
   * Friction coefficients in ps⁻¹ for the atomic degrees of freedom with the
   * Langevin thermostat (`MDALGO = 3`); one value per species, in POSCAR
   * species order.
   * @default 0 for every species
   * @see https://www.vasp.at/wiki/index.php/LANGEVIN_GAMMA
   */
  LANGEVIN_GAMMA?: number[];

  /**
   * Friction coefficient in ps⁻¹ for the lattice degrees of freedom in
   * Parrinello-Rahman (NpT) dynamics with the Langevin thermostat.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/LANGEVIN_GAMMA_L
   */
  LANGEVIN_GAMMA_L?: number;

  /**
   * Include non-spherical contributions from gradient corrections inside the
   * PAW spheres (in the KS potential as of VASP 5.X). Essential for accurate
   * results with f-elements, 3d elements, and with DFT+U, hybrids, meta-GGAs
   * or vdW-DFT.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LASPH
   */
  LASPH?: boolean;

  /**
   * Controls the overlap in communication.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LASYNC
   */
  LASYNC?: boolean;

  /**
   * Sets three boolean to selectively allow changes in the lattice vectors.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LATTICE_CONSTRAINTS
   */
  LATTICE_CONSTRAINTS?: boolean[];

  /**
   * This tag is used in the the evaluation of the Berry phase expression for
   * the electronic polarization of an insulating system.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LBERRY
   */
  LBERRY?: boolean;

  /**
   * for LBLUEOUT=.TRUE., VASP writes output for the free-energy gradient
   * calculation to the REPORT file (in case VASP was compiled with -Dtbdyn).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LBLUEOUT
   */
  LBLUEOUT?: boolean;

  /**
   * LBONE adds the small B-component to the chemical shift tensor.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LBONE
   */
  LBONE?: boolean;

  /**
   * for LCALCEPS=.TRUE. the macroscopic ion-clamped static dielectric tensor,
   * Born effective charge tensors, and the ion-clamped piezoelectric tensor of
   * the system are determined from the response to finite electric fields.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LCALCEPS
   */
  LCALCEPS?: boolean;

  /**
   * LCALCPOL=.TRUE. switches on the evaluation of the Berry phase expressions
   * for the macroscopic electronic polarization in accordance with the so-
   * called Modern Theory of Polarization.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LCALCPOL
   */
  LCALCPOL?: boolean;

  /**
   * Whether the charge density is written (CHGCAR and CHG, or vaspwave.h5
   * when `LH5 = .TRUE.`). For VASP 6.0 to 6.4.2 the default was `.NOT. LH5`.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LCHARG
   */
  LCHARG?: boolean;

  /**
   * Determines whether the charge densities are written to vaspwave.h5.
   * @default LH5
   * @see https://www.vasp.at/wiki/index.php/LCHARGH5
   */
  LCHARGH5?: boolean;

  /**
   * Calculate the chemical shifts and magnetic susceptibility within linear
   * response theory.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LCHIMAG
   */
  LCHIMAG?: boolean;

  /**
   * Controls whether Harris corrections are calculated or not.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LCORR
   */
  LCORR?: boolean;

  /**
   * Switch on DFT+U (variant set by {@link LDAUTYPE}).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LDAU
   */
  LDAU?: boolean;

  /**
   * Effective on-site exchange interaction J in eV, one value per species, in
   * POSCAR species order.
   * @default NTYP*0.0
   * @see https://www.vasp.at/wiki/index.php/LDAUJ
   */
  LDAUJ?: number[];

  /**
   * l-quantum number on which the on-site interaction is added, one value per
   * species, in POSCAR species order; `-1` adds no interaction.
   * @default NTYP*2
   * @see https://www.vasp.at/wiki/index.php/LDAUL
   */
  LDAUL?: number[];

  /**
   * Verbosity of a DFT+U calculation:
   * - `0`: no on-site occupancy matrix written
   * - `1`: spin-up/down on-site occupancy matrices (and eigenvalues/vectors of
   *   the total matrix) written to OUTCAR at each iteration
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/LDAUPRINT
   */
  LDAUPRINT?: number;

  /**
   * DFT+U variant:
   * - `1`: rotationally invariant DFT+U of Liechtenstein et al.
   * - `2`: simplified rotationally invariant approach of Dudarev et al.
   * - `3`: linear-response ansatz of Cococcioni et al. to compute U (LDAUU/LDAUJ
   *   then set the spherical potential on spin-up/spin-down)
   * - `4`: same as 1, but without exchange splitting
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/LDAUTYPE
   */
  LDAUTYPE?: number;

  /**
   * Effective on-site Coulomb interaction U in eV, one value per species, in
   * POSCAR species order.
   * @default NTYP*0.0
   * @see https://www.vasp.at/wiki/index.php/LDAUU
   */
  LDAUU?: number[];

  /**
   * Whether a subspace diagonalization is performed within the selected
   * algorithm. Can only be switched off for `ALGO = VeryFast` or `Damped`
   * (and skips the final diagonalization for All), e.g. to keep orbital order.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LDIAG
   */
  LDIAG?: boolean;

  /**
   * Switches on dipole corrections to the potential and forces (linear
   * correction; quadratic potential for charged cells, cubic cells only).
   * Requires {@link IDIPOL}; optionally {@link DIPOL}.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LDIPOL
   */
  LDIPOL?: boolean;

  /**
   * Selects the disentanglement-cRPA method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LDISENTANGLED
   */
  LDISENTANGLED?: boolean;

  /**
   * Computes the zero-field splitting (ZFS) matrix.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LDMATRIX
   */
  LDMATRIX?: boolean;

  /**
   * LDOWNSAMPLE selects a sub-grid of k-points defined in KPOINTS from
   * WAVECAR.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LDOWNSAMPLE
   */
  LDOWNSAMPLE?: boolean;

  /**
   * The LEFG computes the electric field gradient (EFG) at positions of the
   * atomic nuclei.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LEFG
   */
  LEFG?: boolean;

  /**
   * Whether to write the electron localization function to ELFCAR. Requires
   * `NPAR = 1` to be set explicitly.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LELF
   */
  LELF?: boolean;

  /**
   * LEPSILON=.TRUE. determines the static dielectric matrix, ion-clamped
   * piezoelectric tensor, and the Born effective charges using density
   * functional perturbation theory.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LEPSILON
   */
  LEPSILON?: boolean;

  /**
   * LFINITE_TEMPERATURE switches on the finite-temperature formalism of many-
   * body perturbation theory for adiabatic-connection-fluctuation-dissipation-
   * theorem (ACFDT)/GW calculations.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LFINITE_TEMPERATURE
   */
  LFINITE_TEMPERATURE?: boolean;

  /**
   * LFOCKACE determines whether the Adaptively Compressed Exchange Operator is
   * used.
   * @default true for VASP.6; N/A for VASP.5.X and older
   * @see https://www.vasp.at/wiki/index.php/LFOCKACE
   */
  LFOCKACE?: boolean;

  /**
   * Use the same charge augmentation for the Hartree and DFT exchange-
   * correlation part as is used in the Fock exchange and the many-body methods
   * beyond DFT, such as RPA and MP2.
   * @default False most calculations; True optimized-potential methods with
   * shape restoration active
   * @see https://www.vasp.at/wiki/index.php/LFOCKAEDFT
   */
  LFOCKAEDFT?: boolean;

  /**
   * Evaluate the exact exchange in RPA and GW calculations fully consistent
   * with the standard treatment in HF calculations.
   * Available as of VASP 6.6.0.
   * @default False
   * @see https://www.vasp.at/wiki/index.php/LFOCKSTD
   */
  LFOCKSTD?: boolean;

  /**
   * LFXC enables the (semi-)local exchange-correlation kernel in Casida and
   * time-evolution TDDFT calculations.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LFXC
   */
  LFXC?: boolean;

  /**
   * LH5 determines whether the output is written to the legacy files (CHGCAR,
   * CHG, WAVECAR) or the vaspwave.h5 file. Hence, setting LH5=.TRUE. will
   * suppress legacy file output all together. Whether or not the charge
   * density or wave functions are written to vaspwave.h5 is then determined by
   * setting LCHARG and LWAVE accordingly.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LH5
   */
  LH5?: boolean;

  /**
   * Controls whether the bubble diagrams are included in the BSE calculation.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LHARTREE
   */
  LHARTREE?: boolean;

  /**
   * Perform a Hartree-Fock/DFT hybrid-functional calculation (PBE0 unless the
   * mixing tags request otherwise).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LHFCALC
   */
  LHFCALC?: boolean;

  /**
   * compute the hyperfine tensors at the atomic sites (available as of
   * vasp.5.3.2).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LHYPERFINE
   */
  LHYPERFINE?: boolean;

  /**
   * LIBMBD_ALPHA defines the free-atom polarizabilities alpha_0 (bohr^3) used
   * in the Tkatchenko-Scheffler and Many-body dispersion energy methods as
   * implemented in the library libMBD of many-body dispersion methods.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_ALPHA
   */
  LIBMBD_ALPHA?: number[];

  /**
   * LIBMBD_C6AU defines the free-atom C_6 parameters (mathrmHartree
   * mathrmbohr^6) used in the Tkatchenko-Scheffler and Many-body dispersion
   * energy methods as implemented in the library libMBD of many-body
   * dispersion methods.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_C6AU
   */
  LIBMBD_C6AU?: number[];

  /**
   * LIBMBD_K_GRID sets the k-mesh of the collective oscillations defined in
   * the methods available in the library libMBD of many-body dispersion
   * methods.
   * @default determined in libMBD according to the cell shape
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_K_GRID
   */
  LIBMBD_K_GRID?: number[];

  /**
   * LIBMBD_K_GRID_SHIFT sets the shift for the k-mesh of the collective
   * oscillations defined in the methods available in the library libMBD of
   * many-body dispersion methods.
   * @default 0.5 (default in libMBD)
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_K_GRID_SHIFT
   */
  LIBMBD_K_GRID_SHIFT?: number;

  /**
   * LIBMBD_MBD_A sets the value of the damping parameter a in the many-body
   * methods as implemented in the library libMBD of many-body dispersion
   * methods.
   * @default 6.0
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_MBD_A
   */
  LIBMBD_MBD_A?: number;

  /**
   * LIBMBD_MBD_BETA sets the value of the scaling factor beta (usually denoted
   * s_R) in the many-body methods as implemented in the library libMBD of
   * many-body dispersion methods.
   * @default value that was determined for the exchange-correlation functional
   * set with LIBMBD_XC
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_MBD_BETA
   */
  LIBMBD_MBD_BETA?: number;

  /**
   * LIBMBD_METHOD selects one of the methods available in the library libMBD
   * of many-body dispersion methods. Only used when IVDW = 14.
   * @default mbd-rsscs (default in libMBD)
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_METHOD
   */
  LIBMBD_METHOD?: string;

  /**
   * LIBMBD_N_OMEGA_GRID sets the number of points on the grid of imaginary
   * frequencies used in the library libMBD of many-body dispersion methods.
   * @default 15 (default in libMBD)
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_N_OMEGA_GRID
   */
  LIBMBD_N_OMEGA_GRID?: number;

  /**
   * LIBMBD_PARALLEL_MODE selects the parallelization scheme used in the
   * library libMBD of many-body dispersion methods.
   * Values: auto, kpoints, atoms.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_PARALLEL_MODE
   */
  LIBMBD_PARALLEL_MODE?: "auto" | "kpoints" | "atoms" | (string & {});

  /**
   * LIBMBD_R0AU defines the free-atom R_0 parameters (bohr) used in the
   * Tkatchenko-Scheffler and Many-body dispersion energy methods as
   * implemented in the library libMBD of many-body dispersion methods.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_R0AU
   */
  LIBMBD_R0AU?: number[];

  /**
   * LIBMBD_TS_D sets the value of the damping parameter d in the Tkatchenko-
   * Scheffler method as implemented in the library libMBD of many-body
   * dispersion methods.
   * @default 20
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_TS_D
   */
  LIBMBD_TS_D?: number;

  /**
   * LIBMBD_TS_SR sets the value of the scaling factor s_R in the Tkatchenko-
   * Scheffler method as implemented in the library libMBD of many-body
   * dispersion methods.
   * @default value that was determined for the exchange-correlation functional
   * set with LIBMBD_XC
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_TS_SR
   */
  LIBMBD_TS_SR?: number;

  /**
   * LIBMBD_VDW_PARAMS_KIND sets the type of free-atom van der Waals parameters
   * that are used for the methods implemented in the library libMBD of many-
   * body dispersion methods.
   * Values: ts, tssurf.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_VDW_PARAMS_KIND
   */
  LIBMBD_VDW_PARAMS_KIND?: "ts" | "tssurf" | (string & {});

  /**
   * LIBMBD_XC sets the exchange-correlation functional for the setting of
   * damping parameters used in the methods available in the library libMBD of
   * many-body dispersion methods.
   * Values: pbe, pbe0, hse, blyp, b3lyp, revpbe, am05, none.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBMBD_XC
   */
  LIBMBD_XC?:
    | "pbe"
    | "pbe0"
    | "hse"
    | "blyp"
    | "b3lyp"
    | "revpbe"
    | "am05"
    | "none"
    | (string & {});

  /**
   * LIBXC1 specifies the exchange or exchange-correlation functional from the
   * library of exchange-correlation functionals Libxc.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBXC1
   */
  LIBXC1?: string | number;

  /**
   * LIBXC1_Pn, where n=1, 2, ldots allows to specify the values of the
   * parameters of the functional implemented in Libxc that is called with
   * LIBXC1.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBXC1_Pn
   */
  [key: `LIBXC1_P${number}`]: number;

  /**
   * LIBXC2 specifies the correlation functional from the library of exchange-
   * correlation functionals Libxc. LIBXC2 can be used only if the functional
   * specified with LIBXC1 corresponds to only exchange and not to exchange and
   * correlation.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBXC2
   */
  LIBXC2?: string | number;

  /**
   * LIBXC2_Pn, where n=1, 2, ldots allows to specify the values of the
   * parameters of the functional implemented in Libxc that is called with
   * LIBXC2.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/LIBXC2_Pn
   */
  [key: `LIBXC2_P${number}`]: number;

  /**
   * Enable reading the KPOINTS_OPT file.
   * @default true if KPOINTS_OPT file is present.
   * @see https://www.vasp.at/wiki/index.php/LKPOINTS_OPT
   */
  LKPOINTS_OPT?: boolean;

  /**
   * LKPOINTS_WAN controlls whether VASP reads the KPOINTS_WAN file.
   * @default true if KPOINTS_WAN file is present.
   * @see https://www.vasp.at/wiki/index.php/LKPOINTS_WAN
   */
  LKPOINTS_WAN?: boolean;

  /**
   * switches on the k-point projection scheme.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LKPROJ
   */
  LKPROJ?: boolean;

  /**
   * LLRAUG calculates the two-center contributions to the chemical shift
   * tensor.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LLRAUG
   */
  LLRAUG?: boolean;

  /**
   * LMAXFOCK sets the maximum angular momentum quantum number L for the
   * augmentation of charge densities in Hartree-Fock type routines.
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/LMAXFOCK
   */
  LMAXFOCK?: number;

  /**
   * Sets the maximum angular momentum quantum number L up to which the all-
   * electron charge density is restored on the plane-wave grid by shape
   * restoration.
   * @default -1 DFT, Hartree-Fock; 4 post-DFT methods
   * @see https://www.vasp.at/wiki/index.php/LMAXFOCKAE
   */
  LMAXFOCKAE?: number;

  /**
   * Maximum l-quantum number of the one-center PAW charge densities passed
   * through the mixer and written to CHGCAR. Use 4 for d-elements and 6 for
   * f-elements with DFT+U, `ICHARG = 11` restarts, or noncollinear runs.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/LMAXMIX
   */
  LMAXMIX?: number;

  /**
   * The maximum l-quantum number for the evaluation of the one-center terms on
   * the radial grids in the PAW method.
   * @default 2l_ max, where l_ max is the maximum angular quantum number of
   * the PAW partial waves in the POTCAR file.
   * @see https://www.vasp.at/wiki/index.php/LMAXPAW
   */
  LMAXPAW?: number;

  /**
   * Maximum l-quantum number in the PAW one-center expansion of the kinetic
   * energy density (rule of thumb: 2 for s-, 4 for p-, 6 for d-elements).
   * @default 6 if `LASPH = true`, else 0
   * @see https://www.vasp.at/wiki/index.php/LMAXTAU
   */
  LMAXTAU?: number;

  /**
   * send the kinetic-energy density through the density mixer as well.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LMIXTAU
   */
  LMIXTAU?: boolean;

  /**
   * LMODELHF selects dielectric-dependent range-separated hybrid functionals
   * with AEXX and BEXX for the exact Hartree-Fock exchange at long- and short-
   * range, respectively.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LMODELHF
   */
  LMODELHF?: boolean;

  /**
   * LMONO switches on monopole-monopole corrections for the total energy.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LMONO
   */
  LMONO?: boolean;

  /**
   * LMP2LT selects a Laplace transformed MP2 algorithm.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LMP2LT
   */
  LMP2LT?: boolean;

  /**
   * LNABLA=.TRUE. evaluates the transversal expression for the frequency
   * dependent dielectric matrix.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LNABLA
   */
  LNABLA?: boolean;

  /**
   * LNICSALL=.TRUE. calculates the NICS at the positions on the fine FFT grid
   * NGXF x NGYF x NGZF.
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LNICSALL
   */
  LNICSALL?: boolean;

  /**
   * discard symmetry operations that are not consistent with the way k-space
   * derivatives are calculated in the linear-response calculations of chemical
   * shifts.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LNMR_SYM_RED
   */
  LNMR_SYM_RED?: boolean;

  /**
   * Write the NMRCAR.magres file for EFG calculations and chemical shielding
   * calculations.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LNMRCAR
   */
  LNMRCAR?: boolean;

  /**
   * LNMRLEG controls whether VASP prints NMR properties to OUTCAR according to
   * the old format (pre-version 6.6.0).
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LNMRLEG
   */
  LNMRLEG?: boolean;

  /**
   * LNMRSHIELD controls whether the shielding or shift is printed.
   * Available as of VASP 6.6.0.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LNMRSHIELD
   */
  LNMRSHIELD?: boolean;

  /**
   * LNOAUGXC specifies if a METAGGA functional is evaluated with a density
   * that is augmented or not.
   * @default false
   * @deprecated Obsolete and should not be used.
   * @see https://www.vasp.at/wiki/index.php/LNOAUGXC
   */
  LNOAUGXC?: boolean;

  /**
   * Switch on noncollinear magnetic calculations (requires `vasp_ncl`;
   * supported as of VASP.4.5).
   * @default false; true if spin-orbit coupling is included (`LSORBIT = true`)
   * @see https://www.vasp.at/wiki/index.php/LNONCOLLINEAR
   */
  LNONCOLLINEAR?: boolean;

  /**
   * The LOCPROJ tag specifies local functions on which the orbitals are
   * projected. These projections are written to the PROJCAR file, LOCPROJ
   * file, and vasprun.xml file.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/LOCPROJ
   */
  LOCPROJ?: string;

  /**
   * Compute the frequency-dependent dielectric matrix (independent-particle,
   * summation over empty states) after the electronic ground state. Needs
   * many empty bands (NBANDS) and a dense frequency grid (NEDOS ≈ 2000).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LOPTICS
   */
  LOPTICS?: boolean;

  /**
   * Projection onto local quantum numbers (lm); writes DOSCAR plus
   * PROCAR/PROOUT. Values < 10 project within {@link RWIGS} spheres (RWIGS
   * required); values ≥ 10 use the PAW projectors (RWIGS ignored):
   * - `0`: DOSCAR and PROCAR
   * - `1`: DOSCAR and lm-decomposed PROCAR
   * - `2`: as 1, plus phase factors
   * - `5`: DOSCAR and PROOUT
   * - `10`: DOSCAR and PROCAR
   * - `11`: DOSCAR and lm-decomposed PROCAR
   * - `12`: as 11, plus phase factors (not recommended)
   * - `13`: as 12, best projector per band (not recommended; VASP ≥ 5.4.4)
   * - `14`: as 12, single optimized projector for the EMIN–EMAX interval
   *   (VASP ≥ 5.4.4)
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/LORBIT
   */
  LORBIT?: number;

  /**
   * Write the orbital moments (within the PAW spheres) to OUTCAR. Only
   * applicable with `LSORBIT = .TRUE.`.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LORBMOM
   */
  LORBMOM?: boolean;

  /**
   * Determines whether partial (band and/or k-point-decomposed) charge
   * densities are evaluated.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPARD
   */
  LPARD?: boolean;

  /**
   * LPARDH5 determines whether the partial charges are written to PARCHG or
   * vaspout.h5.
   * Available as of VASP 6.5.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPARDH5
   */
  LPARDH5?: boolean;

  /**
   * for LPEAD=.TRUE., the derivative of the cell-periodic part of the orbitals
   * w.r.t. k, |&nabla;_ku_nk&rang;, is calculated using finite differences
   * ("perturbation expansion after discretization" (PEAD)).
   * Values: .TRUE., .FALSE.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPEAD
   */
  LPEAD?: boolean | ".FALSE" | (string & {});

  /**
   * LPHON_DISPERSION requests the calculation of the phonon dispersion along
   * the q-point path supplied in file QPOINTS (same format as KPOINTS).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPHON_DISPERSION
   */
  LPHON_DISPERSION?: boolean;

  /**
   * LPHON_POLAR includes dipole-dipole corrections in the computation of the
   * phonon dispersion. For this mode, PHON_DIELECTRIC and PHON_BORN_CHARGES
   * must also be set.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPHON_POLAR
   */
  LPHON_POLAR?: boolean;

  /**
   * LPHON_READ_FORCE_CONSTANTS read the force constants from a vaspin.h5 file
   * containing the force constants computed with a previous VASP run.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LPHON_READ_FORCE_CONSTANTS
   */
  LPHON_READ_FORCE_CONSTANTS?: boolean;

  /**
   * Plane-wise data distribution in real space. Reduces FFT communication
   * but can worsen load balancing on massively parallel machines.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LPLANE
   */
  LPLANE?: boolean;

  /**
   * LPOSNICS controls if VASP reads the POSNICS file.
   * Available as of VASP 6.6.0.
   * @default true if POSNICS file is present.
   * @see https://www.vasp.at/wiki/index.php/LPOSNICS
   */
  LPOSNICS?: boolean;

  /**
   * Whether projection operators are evaluated in real or reciprocal space:
   * - `false`: reciprocal space
   * - `"Auto"` / `"A"`: real space, fully automatic projector optimization
   *   (recommended for > ~30 atoms)
   * - `"On"` / `"O"`: real space, projectors re-optimized (outdated)
   * - `true`: real space, projectors from file (not recommended)
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LREAL
   */
  LREAL?: boolean | "Auto" | "A" | "On" | "O" | (string & {});

  /**
   * Switch on the decomposition of the exchange for the hybrid functionals
   * using full Hartree-Fock exchange at long range.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LRHFCALC
   */
  LRHFCALC?: boolean;

  /**
   * LRPA=.TRUE. includes local field effect on the Hartree level only.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LRPA
   */
  LRPA?: boolean;

  /**
   * LRPAFORCE=.TRUE. calculates forces in the random-phase approximation
   * (RPA).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LRPAFORCE
   */
  LRPAFORCE?: boolean;

  /**
   * LSCAAWARE controls the distribution of the Hamilton matrix.
   * @default true if VASP is compiled with scaLAPACK support (precompiler
   * flag -DscaLAPACK); false otherwise
   * @see https://www.vasp.at/wiki/index.php/LSCAAWARE
   */
  LSCAAWARE?: boolean;

  /**
   * Use scaLAPACK for orthonormalization of the wavefunctions and subspace
   * diagonalization.
   * @default true if VASP is compiled with scaLAPACK support (-DscaLAPACK);
   * false otherwise
   * @see https://www.vasp.at/wiki/index.php/LSCALAPACK
   */
  LSCALAPACK?: boolean;

  /**
   * decides whether to re-scale the van der Waals radii R_0 (LSCALER0=.TRUE.)
   * or not.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LSCALER0
   */
  LSCALER0?: boolean;

  /**
   * Parallel (scaLAPACK) LU decomposition in the orthonormalization of the
   * wavefunctions. Requires `LSCALAPACK = .TRUE.`; often slower than serial.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSCALU
   */
  LSCALU?: boolean;

  /**
   * LSCDM switches on the selected columns of the density matrix (SCDM)
   * method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSCDM
   */
  LSCDM?: boolean;

  /**
   * LSCK=.True. switches on the squeezed Coulomb kernel. If LSCK is set to
   * .TRUE., the squeezed Coulomb kernel is used instead of the cosine window :
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSCK
   */
  LSCK?: boolean;

  /**
   * LSCRPA selects the spectral-cRPA method.
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSCRPA
   */
  LSCRPA?: boolean;

  /**
   * decides whether to compute gradients in the calculation of the MBD
   * dispersion energy or the SCS contribution.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LSCSGRAD
   */
  LSCSGRAD?: boolean;

  /**
   * Controls whether the frequency-dependent self-energy is calculated or not.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSELFENERGY
   */
  LSELFENERGY?: boolean;

  /**
   * Specifies whether the partial charge density is summed up for all selected
   * bands or separated and printed out in different files.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSEPB
   */
  LSEPB?: boolean;

  /**
   * Specifies whether the partial charge density is summed up for all selected
   * k points or separated and printed out in different files.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSEPK
   */
  LSEPK?: boolean;

  /**
   * Removes sources and drains from the exchange-correlation B field.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSFBXC
   */
  LSFBXC?: boolean;

  /**
   * Switch on singles contribution to correlation energy for GW algorithms.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSINGLES
   */
  LSINGLES?: boolean;

  /**
   * LSMP2LT selects a stochastic Laplace transformed MP2 algorithm.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSMP2LT
   */
  LSMP2LT?: boolean;

  /**
   * Switch on spin-orbit coupling; also sets `LNONCOLLINEAR = .TRUE.`.
   * Requires `vasp_ncl` and PAW potentials; supported as of VASP.4.5.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSORBIT
   */
  LSORBIT?: boolean;

  /**
   * LSOSHIFT = .True. activates spin–orbit coupling (SOC) contributions to the
   * calculated chemical shielding tensor in NMR.
   * @default LSORBIT
   * @see https://www.vasp.at/wiki/index.php/LSOSHIFT
   */
  LSOSHIFT?: boolean;

  /**
   * LSPECTRAL specifies to use the spectral method.
   * @default true if NOMEGA>2
   * @see https://www.vasp.at/wiki/index.php/LSPECTRAL
   */
  LSPECTRAL?: boolean;

  /**
   * LSPECTRALGW specifies to use the spectral method for calculating the self-
   * energy.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSPECTRALGW
   */
  LSPECTRALGW?: boolean;

  /**
   * LSPIN_VDW=.TRUE. switches on the use of the spin-polarized formulation for
   * the nonlocal part of a van der Waals functional (available as of
   * VASP.6.4.0).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSPIN_VDW
   */
  LSPIN_VDW?: boolean;

  /**
   * set LSPIRAL=.TRUE. to represent spin spirals by means of a generalized
   * Bloch condition.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSPIRAL
   */
  LSPIRAL?: boolean;

  /**
   * For direct optimization (`ALGO = All | Damped`), optimize the
   * occupied–unoccupied rotation matrix via a few SCF steps; mainly efficient
   * for hybrid functionals with small-gap systems or metals.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSUBROT
   */
  LSUBROT?: boolean;

  /**
   * LSYNCH5 determines whether the output in vaspout.h5 is always synchronized
   * with VASP while the calculation is running.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LSYNCH5
   */
  LSYNCH5?: boolean;

  /**
   * Request evaluation of the kinetic energy density.
   * @default false; true if the XC functional depends on the kinetic
   * energy density (see metaGGAs).
   * @see https://www.vasp.at/wiki/index.php/LTAU
   */
  LTAU?: boolean;

  /**
   * LTBOUNDLIBXC specifies whether or not the lower bound for the Kohn-Sham
   * kinetic-energy density tau_sigma (tau_sigma^textrmW<tau_sigma) is enforced
   * before tau_sigma is used in a METAGGA functional from Libxc.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTBOUNDLIBXC
   */
  LTBOUNDLIBXC?: boolean;

  /**
   * LTEMPER specified whether parallel tempering is used. The flag must be
   * used in combination with IMAGES.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTEMPER
   */
  LTEMPER?: boolean;

  /**
   * Use Thomas-Fermi exponential screening to split exchange into short- and
   * long-range parts (screening from {@link HFSCREEN}, mixing from
   * {@link AEXX}). Automatically sets `LHFCALC = .TRUE.` and `AEXX = 1`.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTHOMAS
   */
  LTHOMAS?: boolean;

  /**
   * LTRIPLET selects a triplet ansatz for Bethe-Salpeter-equations (BSE)
   * calculations. This is synonymous to LHARTREE = .FALSE.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTRIPLET
   */
  LTRIPLET?: boolean;

  /**
   * if set to .TRUE., the standard parametrization of the Tkatchenko-Scheffler
   * method is replaced by the one designed to enable reliable modeling of
   * structure and stability for a broad class of organic molecules adsorbed on
   * metal surfaces is activated.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTSSURF
   */
  LTSSURF?: boolean;

  /**
   * LTWO_CENTRE calculates off-center Coulomb integrals.
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LTWO_CENTRE
   */
  LTWO_CENTRE?: boolean;

  /**
   * Switches on a nonlocal vdW-DF functional (long-range dispersion
   * correlation depending on the density at two points).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LUSE_VDW
   */
  LUSE_VDW?: boolean;

  /**
   * LUSENCCL allows deactivating the NVIDIA Collective Communications Library
   * (NCCL) during runtime when the code was compiled with the -DUSENCCL
   * option. Category:INCAR tagCategory:PerformanceCategory:Parallelization.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LUSENCCL
   */
  LUSENCCL?: boolean;

  /**
   * Switch on determining the vacuum potential by averaging the local
   * potential over a field-free region.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVACPOTAV
   */
  LVACPOTAV?: boolean;

  /**
   * LVDW_EWALD decides whether the lattice summation in E_disp expression by
   * means of Ewald's summation is computed.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVDW_EWALD
   */
  LVDW_EWALD?: boolean;

  /**
   * can be used to disable vdW interaction with mirror image in X Y Z
   * direction. This is advisable for molecular calculations in the gas phase.
   * In all other cases, use the default.
   * @default false false false
   * @see https://www.vasp.at/wiki/index.php/LVDW_ONECELL
   */
  LVDW_ONECELL?: boolean[];

  /**
   * decides whether to write the two- to six- body contributions to MBD
   * dispersion energy in the OUTCAR file.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVDWEXPANSION
   */
  LVDWEXPANSION?: boolean;

  /**
   * activates the self-consistent screening in Tkatchenko-Scheffler method.
   * @default true if IVDW=202 (MBD@rsSCS method); false otherwise
   * @see https://www.vasp.at/wiki/index.php/LVDWSCS
   */
  LVDWSCS?: boolean;

  /**
   * LVGVAPPL determines whether the vGv orbital magnetic susceptibility is
   * applied in the calculation of the CSA tensor.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVGVAPPL
   */
  LVGVAPPL?: boolean;

  /**
   * LVGVCALC switches on calculation of the vGv expression for the orbital
   * magnetic susceptibility.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LVGVCALC
   */
  LVGVCALC?: boolean;

  /**
   * Whether the ionic + Hartree potential (in eV) is written to LOCPOT.
   * Setting it to `.TRUE.` sets {@link LVTOT} to `.FALSE.`.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVHAR
   */
  LVHAR?: boolean;

  /**
   * Whether the total local potential (ionic + Hartree + semilocal xc, in eV)
   * is written to LOCPOT (and POT). `LVHAR = .TRUE.` changes LOCPOT's content.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LVTOT
   */
  LVTOT?: boolean;

  /**
   * LWANNIER90=.TRUE. switches on the interface between VASP and WANNIER90.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWANNIER90
   */
  LWANNIER90?: boolean;

  /**
   * LWANNIER90_RUN executes wannier_setup (see LWANNIER90=.TRUE.) and
   * subsequently runs WANNIER90 in library mode (wannier_run).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWANNIER90_RUN
   */
  LWANNIER90_RUN?: boolean;

  /**
   * Whether the wavefunctions are written at the end of a run (to WAVECAR,
   * or to vaspwave.h5 when `LH5 = .TRUE.`).
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LWAVE
   */
  LWAVE?: boolean;

  /**
   * Determines whether the wavefunctions are written to vaspwave.h5 file at
   * the end of a run.
   * @default LH5
   * @deprecated Deprecated as of VASP 6.4.3 and not read by the code.
   * @see https://www.vasp.at/wiki/index.php/LWAVEH5
   */
  LWAVEH5?: boolean;

  /**
   * LWEIGHTED selects the weighted-cRPA method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWEIGHTED
   */
  LWEIGHTED?: boolean;

  /**
   * LWRITE_MMN_AMN=.TRUE. tells the VASP2WANNIER90 interface to write the
   * wannier90.mmn and wannier90.amn files.
   * @default true if LWANNIER90=true; false otherwise
   * @see https://www.vasp.at/wiki/index.php/LWRITE_MMN_AMN
   */
  LWRITE_MMN_AMN?: boolean;

  /**
   * Write wannier90.spn file for noncollinear calculations.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWRITE_SPN
   */
  LWRITE_SPN?: boolean;

  /**
   * LWRITE_UNK decides whether the cell-periodic part of the relevant Bloch
   * functions is written.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWRITE_UNK
   */
  LWRITE_UNK?: boolean;

  /**
   * LWRITE_WANPROJ determines whether the Wannier projection file WANPROJ is
   * written.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LWRITE_WANPROJ
   */
  LWRITE_WANPROJ?: boolean;

  /**
   * Switch for WRT_DENSITY to write without augmentation (compensation
   * charge=0).
   * @default true
   * @see https://www.vasp.at/wiki/index.php/LWRT_AUGMENTED_DENSITY
   */
  LWRT_AUGMENTED_DENSITY?: boolean;

  /**
   * for LZEROZ=.TRUE. the z-component of the spin-spiral magnetisation density
   * will be forced to be and to remain zero.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LZEROZ
   */
  LZEROZ?: boolean;

  /**
   * LZORA = .True. yields ZORA scalar-relativistic chemical shieldings in NMR.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/LZORA
   */
  LZORA?: boolean;

  /**
   * Desired local magnetic moment (size and/or direction) for the constrained
   * local moments approach, in Cartesian coordinates: three values (x y z) per
   * ion, in POSCAR order. `0 0 0` imposes no constraint on that ion.
   * @default 3*NIONS*0.0
   * @see https://www.vasp.at/wiki/index.php/M_CONSTR
   */
  M_CONSTR?: number[];

  /**
   * Initial magnetic moment of each atom, used if no magnetization density is
   * present; also lowers the symmetry. Collinear (`ISPIN = 2`): one value per
   * ion, in POSCAR order. Noncollinear: three values (x y z) per ion, in POSCAR
   * order (in the {@link SAXIS} spinor basis when `LSORBIT = .TRUE.`).
   * @default NIONS * 1.0 for `ISPIN = 2`; 3 * NIONS * 1.0 for `LNONCOLLINEAR = true`
   * @see https://www.vasp.at/wiki/index.php/MAGMOM
   */
  MAGMOM?: number[];

  /**
   * This tag sets the maximum distance that an atom is allowed to travel (in
   * Angstrom) between two ab-initio steps before the charge density is reset
   * to atomic an atomic charge density.
   * @default 0.0 (switched off)
   * @see https://www.vasp.at/wiki/index.php/MAXDIS
   */
  MAXDIS?: number;

  /**
   * MAXMEM specifies the maximum memory one MPI rank will attempt to allocate
   * (in MByte). Since, the default varies somewhat between VASP versions, it
   * is safer to set this flag manually. Currently the flag is only inspected
   * in few selected routines, such as the GW or RPA routines that can use
   * excessive amounts of memory. It is recommended to set MAXMEM to the
   * available memory per core minus 200 Mbyte. For instance, if one node is
   * equipped with 12 Gbyte, and 6 MPI ranks share this memory, the recommended
   * setting is 12*1024/6-200 = 1848.
   * @default 2800 (VASP.5.4.4. and older), automatically set as of VASP.6
   * @see https://www.vasp.at/wiki/index.php/MAXMEM
   */
  MAXMEM?: number;

  /**
   * Maximum number of steps stored in the Broyden/Pulay mixer (`IMIX = 4`).
   * Negative: mixer reset after each ionic step or after |MAXMIX| electronic
   * steps. Positive: history reused across ionic steps (VASP ≥ 4.4).
   * @default -45
   * @see https://www.vasp.at/wiki/index.php/MAXMIX
   */
  MAXMIX?: number;

  /**
   * Thermostat and lattice dynamics for MD (`IBRION = 0`):
   * - `0`: Nosé-Hoover thermostat controlled by {@link SMASS} (deprecated)
   * - `1`: Andersen thermostat (see {@link ANDERSEN_PROB})
   * - `2`: Nosé-Hoover thermostat (see {@link SMASS})
   * - `3`: Langevin thermostat (see {@link LANGEVIN_GAMMA})
   * - `4`: Nosé-Hoover chain thermostat
   * - `5`: CSVR thermostat (VASP ≥ 6.4.3)
   * - `11`: Andersen thermostat in VASP 5.x (deprecated; use 1)
   * - `13`: multiple Andersen thermostats
   * - `21`: Nosé-Hoover thermostat in VASP 5.x (deprecated; use 2)
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/MDALGO
   */
  MDALGO?: number;

  /**
   * Meta-GGA exchange-correlation functional ("_X"/"_C" suffix = exchange- or
   * correlation-only, VASP ≥ 6.4.3). Use with `LASPH = .TRUE.`:
   * - `"LIBXC"`: any meta-GGA from Libxc (VASP ≥ 6.3.0; needs LIBXC1/LIBXC2)
   * - `"TPSS"`, `"RTPSS"` (revTPSS), `"M06L"` (M06-L)
   * - `"MS0"`, `"MS1"`, `"MS2"`: made-simple family (VASP ≥ 5.4.1)
   * - `"SCAN"` (VASP ≥ 5.4.4), `"RSCAN"`, `"R2SCAN"` (VASP ≥ 6.2.0)
   * - `"SREGTM1"`, `"SREGTM2"`, `"SREGTM3"`: regularized Tao-Mo (VASP ≥ 6.4.3)
   * - `"TASK_X"`: TASK exchange (VASP ≥ 6.5.0)
   * - `"LAK"`: LAK (VASP ≥ 6.5.0)
   * - `"MSPBEL"`, `"MSRPBEL"`, `"MSB86BL"`, `"RMSPBEL"`, `"RMSRPBEL"`,
   *   `"RMSB86BL"`: MS-*l* and rMS-*l* families (VASP ≥ 6.5.0)
   * - `"SCANL"`, `"RSCANL"`, `"R2SCANL"`, `"OFR2"`, `"SREGTM2L"`: deorbitalized,
   *   Laplacian-dependent (VASP ≥ 6.4.0)
   * - `"MBJ"`, `"LMBJ"`: (local) modified Becke-Johnson potentials (potential-only)
   * @default the functional given by LEXCH in the POTCAR, if GGA and XC are also unset
   * @see https://www.vasp.at/wiki/index.php/METAGGA
   */
  METAGGA?:
    | "LIBXC"
    | "TPSS"
    | "TPSS_X"
    | "TPSS_C"
    | "RTPSS"
    | "RTPSS_X"
    | "RTPSS_C"
    | "M06L"
    | "M06L_X"
    | "M06L_C"
    | "MS0"
    | "MS0_X"
    | "MS0_C"
    | "MS1"
    | "MS1_X"
    | "MS1_C"
    | "MS2"
    | "MS2_X"
    | "MS2_C"
    | "SCAN"
    | "SCAN_X"
    | "SCAN_C"
    | "RSCAN"
    | "RSCAN_X"
    | "RSCAN_C"
    | "R2SCAN"
    | "R2SCAN_X"
    | "R2SCAN_C"
    | "SREGTM1"
    | "SREGTM2"
    | "SREGTM3"
    | "TASK_X"
    | "LAK"
    | "LAK_X"
    | "LAK_C"
    | "MSPBEL"
    | "MSRPBEL"
    | "MSB86BL"
    | "RMSPBEL"
    | "RMSRPBEL"
    | "RMSB86BL"
    | "SCANL"
    | "RSCANL"
    | "R2SCANL"
    | "OFR2"
    | "SREGTM2L"
    | "MBJ"
    | "LMBJ"
    | (string & {});

  /**
   * The flag MINROT defines the value for which the dimer is rotated only if
   * the predicted rotation angle is greater than MINROT (rad.) in the Improved
   * Dimer Method.
   * @default 0.01
   * @see https://www.vasp.at/wiki/index.php/MINROT
   */
  MINROT?: number;

  /**
   * Metric in the Broyden mixing scheme (`IMIX = 4`):
   * - `0`: no preconditioning (metric = 1)
   * - `1`: "inverse Kerker" metric, BMIX chosen automatically (weights span a
   *   factor 20)
   * - `2`: "inverse Kerker" metric, BMIX chosen automatically (factor 200)
   * - `3`: "inverse Kerker" metric with BMIX from INCAR (test only, not
   *   recommended)
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/MIXPRE
   */
  MIXPRE?: number;

  /**
   * This tag sets the filtering parameter for the angular filtering for
   * ML_IAFILT2 in the machine learning force field method.
   * @default 0.002
   * @see https://www.vasp.at/wiki/index.php/ML_AFILT2
   */
  ML_AFILT2?: number;

  /**
   * Chooses error estimation type for on-the-fly training or reselection of
   * local referenc configurations.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ML_CALGO
   */
  ML_CALGO?: number;

  /**
   * This tag controls the criterion for "enforced" DFT calculations within the
   * machine learning force field method.
   * @default 4.0 for ML_MODE = select; 2.0 else
   * @see https://www.vasp.at/wiki/index.php/ML_CDOUB
   */
  ML_CDOUB?: number;

  /**
   * Parameter used in the automatic determination of threshold ML_CTIFOR for
   * error estimation in the machine learning force field method.
   * @default 0.4
   * @see https://www.vasp.at/wiki/index.php/ML_CSIG
   */
  ML_CSIG?: number;

  /**
   * Parameter used in the automatic determination of threshold for error
   * estimation in the machine learning force field method.
   * @default 0.2
   * @see https://www.vasp.at/wiki/index.php/ML_CSLOPE
   */
  ML_CSLOPE?: number;

  /**
   * This flag sets the threshold for the error estimation in the machine
   * learning force field method.
   * @default 0.002 if ML_CALGO = 0; 0.02 if ML_CALGO = 1
   * @see https://www.vasp.at/wiki/index.php/ML_CTIFOR
   */
  ML_CTIFOR?: number;

  /**
   * The parameter determines to which value the threshold (ML_CTIFOR) is
   * updated within the machine learning force field methods.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ML_CX
   */
  ML_CX?: number;

  /**
   * Selects the descriptor type of the three-body descriptor used in machine
   * learning force fields.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ML_DESC_TYPE
   */
  ML_DESC_TYPE?: number;

  /**
   * Reference total energies of isolated atoms used in the machine learning
   * force field method.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ML_EATOM_REF
   */
  ML_EATOM_REF?: number[];

  /**
   * Sets the cutoff radius for the empirical potentials.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/ML_EMPPOT_RCUT
   */
  ML_EMPPOT_RCUT?: number;

  /**
   * Threshold for the CUR algorithm used in the sparsification of local
   * reference configurations within the machine learning force fields.
   * @default 1E-11 for ML_MODE = SELECT, REFIT; 1E-9 else (vasp.6.3.0 default
   * was 1E-10, see comments below)
   * @see https://www.vasp.at/wiki/index.php/ML_EPS_LOW
   */
  ML_EPS_LOW?: number;

  /**
   * Initial value for the threshold of the eigenvalues of the covariance
   * matrix in the evidence approximation.
   * @default 1E-15
   * @see https://www.vasp.at/wiki/index.php/ML_EPS_REG
   */
  ML_EPS_REG?: number;

  /**
   * Calculation and output frequency of error estimates for ML_MODE=RUN
   * computations.
   * @default ML_OUTBLOCK
   * @see https://www.vasp.at/wiki/index.php/ML_ESTBLOCK
   */
  ML_ESTBLOCK?: number;

  /**
   * String-based tag specifying the GRACE force field name or path.
   * Available as of VASP 6.6.0.
   * @default ./SavedModel
   * @see https://www.vasp.at/wiki/index.php/ML_GRACE_MODEL
   */
  ML_GRACE_MODEL?: string;

  /**
   * This tag specifies the type of angular filtering used in the machine
   * learning force field method.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/ML_IAFILT2
   */
  ML_IAFILT2?: number;

  /**
   * This tag determines the algorithm that is employed to solve the system of
   * linear equations in the ridge regression method for machine learning.
   * @default 4 if ML_MODE=refit; 1 otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_IALGO_LINREG
   */
  ML_IALGO_LINREG?: number;

  /**
   * This tag specifies the atoms where the coupling parameter is introduced to
   * calculate the chemical potential within the machine learning force field
   * method.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/ML_ICOUPLE
   */
  ML_ICOUPLE?: number[];

  /**
   * Decides how the error threshold (ML_CTIFOR) is updated within the machine
   * learning force field method. ML_CTIFOR determines whether a first-
   * principles calculation is performed.
   * @default 3 if ML_MODE = SELECT and ML_CALGO = 0; 1 if and ML_CALGO = 0; 0
   * if ML_CALGO = 1
   * @see https://www.vasp.at/wiki/index.php/ML_ICRITERIA
   */
  ML_ICRITERIA?: number;

  /**
   * This tag specifies whether the regularization parameters are kept constant
   * or not in the machine learning force field method.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/ML_IREG
   */
  ML_IREG?: number;

  /**
   * This tag specifies how to scale the energy data in the machine learning
   * force field method.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/ML_ISCALE_TOTEN
   */
  ML_ISCALE_TOTEN?: number;

  /**
   * This tag selects the mode of operation (e.g. start from scratch,
   * prediction-only,...) of the machine learning force fields method.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ML_ISTART
   */
  ML_ISTART?: number;

  /**
   * This tag controls which procedure is used for normalizing and weighting
   * the energies, forces, and stresses in the machine learning force field
   * method.
   * @default 3
   * @see https://www.vasp.at/wiki/index.php/ML_IWEIGHT
   */
  ML_IWEIGHT?: number;

  /**
   * This tag specifies whether angular filtering is applied or not within the
   * machine learning force field method.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/ML_LAFILT2
   */
  ML_LAFILT2?: boolean;

  /**
   * Controls whether calculation is continued or stopped after the maximum
   * number of local reference configurations ML_MB for a given species is
   * reached.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/ML_LBASIS_DISCARD
   */
  ML_LBASIS_DISCARD?: boolean;

  /**
   * This tag specifies whether thermodynamic integration is activated in order
   * to calculate the chemical potentials within the machine learning force
   * field method.
   * @default true if ML_LEMPPOT=true; false otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_LCOUPLE
   */
  ML_LCOUPLE?: boolean;

  /**
   * This term specifies whether the total atomic energy is written out or not.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LEATOM
   */
  ML_LEATOM?: boolean;

  /**
   * Enables the use of auxiliary empirical potentials for thermodynamic
   * integration using VCAIMAGES.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LEMPPOT
   */
  ML_LEMPPOT?: boolean;

  /**
   * Decides whether the Bayesian error estimates are calculated and written
   * out or not.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/ML_LERR
   */
  ML_LERR?: boolean;

  /**
   * This tag switches on the descriptors for refitting in the fast execution
   * mode within machine learning force fields. This tag is usually switched on
   * by ML_MODE = refit and doesn't need to be set explicitely.
   * @default true for ML_MODE = refit; false else
   * @see https://www.vasp.at/wiki/index.php/ML_LFAST
   */
  ML_LFAST?: boolean;

  /**
   * This tag specifies whether the heat flux is calculated or not in the
   * machine learning force field method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LHEAT
   */
  ML_LHEAT?: boolean;

  /**
   * ML_LIB enables/disables the use of the VASPml C++ library for machine-
   * learning features.
   * Available as of VASP 6.5.0.
   * @default true if compiled with VASPml library (precompiler flag
   * -Dlibvaspml); false else
   * @see https://www.vasp.at/wiki/index.php/ML_LIB
   */
  ML_LIB?: boolean;

  /**
   * This tag specifies the maximum angular momentum quantum number L_max of
   * spherical harmonics used to expand atomic distributions within the machine
   * learning force field method.
   * @default 3 for ML_LAFILT2 = true; 6 else
   * @see https://www.vasp.at/wiki/index.php/ML_LMAX2
   */
  ML_LMAX2?: number;

  /**
   * Main control tag which enables/disables the use of machine learning force
   * fields.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LMLFF
   */
  ML_LMLFF?: boolean;

  /**
   * Specifies whether angular-descriptor sparsification is enabled within the
   * machine learning force field method.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LSPARSDES
   */
  ML_LSPARSDES?: boolean;

  /**
   * Decides whether training structures are additionally subdivided into
   * groups internally due to their structure name.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ML_LUSE_NAMES
   */
  ML_LUSE_NAMES?: boolean;

  /**
   * This tag sets the maximum number of local reference configurations (i.e.
   * basis functions in the kernel) in the machine learning force field method.
   * @default see below
   * @see https://www.vasp.at/wiki/index.php/ML_MB
   */
  ML_MB?: number;

  /**
   * ML_MB_MIN sets the minimum number of local reference configurations
   * required for generation of a machine-learned force field.
   * @default 3
   * @see https://www.vasp.at/wiki/index.php/ML_MB_MIN
   */
  ML_MB_MIN?: number;

  /**
   * This tag sets the maximum number of structures stored in memory that are
   * used for training in the machine learning force field method.
   * @default see below
   * @see https://www.vasp.at/wiki/index.php/ML_MCONF
   */
  ML_MCONF?: number;

  /**
   * This tag sets the number of configurations that are stored temporarily as
   * candidates for the training data in the machine learning force field
   * method.
   * @default 5
   * @see https://www.vasp.at/wiki/index.php/ML_MCONF_NEW
   */
  ML_MCONF_NEW?: number;

  /**
   * This tag sets the number of estimated errors stored in memory to determine
   * the threshold for error estimation in the machine learning force field
   * method for ML_ICRITERIA=1. For ML_ICRITERIA=2, the history length is 50 x
   * ML_MHIS (or hard coded to 400).
   * @default 10
   * @see https://www.vasp.at/wiki/index.php/ML_MHIS
   */
  ML_MHIS?: number;

  /**
   * String-based tag selecting operation mode for machine learning force
   * fields.
   * Values: train, select, refit, refitbayesian, run, delta, none.
   * @default none
   * @see https://www.vasp.at/wiki/index.php/ML_MODE
   */
  ML_MODE?:
    | "train"
    | "select"
    | "refit"
    | "refitbayesian"
    | "run"
    | "delta"
    | "none"
    | (string & {});

  /**
   * Specifies the well depth of the Morse potentials used as auxiliary
   * potentials in thermodynamic integration (VCAIMAGES).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/ML_MOPOT_DM
   */
  ML_MOPOT_DM?: number;

  /**
   * Specifies the list of Morse potential pairs used as auxiliary potentials
   * in thermodynamic integration (VCAIMAGES).
   * @default none
   * @see https://www.vasp.at/wiki/index.php/ML_MOPOT_IJM
   */
  ML_MOPOT_IJM?: number[];

  /**
   * Specifies the number of Morse-potential pairs used as auxiliary potentials
   * in thermodynamic integration (VCAIMAGES).
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ML_MOPOT_NM
   */
  ML_MOPOT_NM?: number;

  /**
   * Specifies the width parameter of the Morse potentials used as auxiliary
   * potentials in thermodynamic integration (VCAIMAGES).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/ML_MOPOT_RKM
   */
  ML_MOPOT_RKM?: number;

  /**
   * Specifies the equilibrium bond distance of the Morse potentials used as
   * auxiliary potentials in thermodynamic integration (VCAIMAGES).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/ML_MOPOT_RM
   */
  ML_MOPOT_RM?: number;

  /**
   * This tag sets the number N_textR^0 of radial basis functions used to
   * expand the radial descriptor rho^(2)_i(r) within the machine learning
   * force field method.
   * @default 12
   * @see https://www.vasp.at/wiki/index.php/ML_MRB1
   */
  ML_MRB1?: number;

  /**
   * This tag sets the number N_textR^l (for all l) of radial basis functions
   * used to expand the angular descriptor within the machine learning force
   * field method.
   * @default 8
   * @see https://www.vasp.at/wiki/index.php/ML_MRB2
   */
  ML_MRB2?: number;

  /**
   * This tag specifies the number of atoms for which a coupling parameter is
   * introduced to calculate the chemical potential within the machine learning
   * force field method.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/ML_NATOM_COUPLED
   */
  ML_NATOM_COUPLED?: number;

  /**
   * Specifies the number of MPI ranks that share a single shared memory
   * segment.
   * @default komplex see below VASP.6.6.0 or higher; Number of available ranks
   * per computational node else
   * @see https://www.vasp.at/wiki/index.php/ML_NCSHMEM
   */
  ML_NCSHMEM?: number;

  /**
   * This tag specifies the polynomial power zeta of the kernel within the
   * machine learning force field method (see this section).
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/ML_NHYP
   */
  ML_NHYP?: number;

  /**
   * Tag to control the minimum interval to get training samples in the machine
   * learning force field method.
   * @default 1 for ML_MODE = SELECT; 10 else
   * @see https://www.vasp.at/wiki/index.php/ML_NMDINT
   */
  ML_NMDINT?: number;

  /**
   * This tag sets the number of highest eigenvalues to which the correlation
   * is measured within the angular descriptor sparsification (within the
   * machine learning force field method).
   * @default 5
   * @see https://www.vasp.at/wiki/index.php/ML_NRANK_SPARSDES
   */
  ML_NRANK_SPARSDES?: number;

  /**
   * Output distance in number of steps for molecular-dynamics simulations with
   * machine-learned force fields in prediction-only mode (ML_MODE = run).
   * @default 1 if 0<=VCAIMAGES<=1 and ML_LMLFF=false in one of the two
   * images; 10 else
   * @see https://www.vasp.at/wiki/index.php/ML_OUTBLOCK
   */
  ML_OUTBLOCK?: number;

  /**
   * This tag allows to disable certain file output which helps to increase
   * performance in molecular-dynamics simulations with machine-learned force
   * fields in prediction-only mode (ML_MODE = run).
   * @default 0 if ML_MODE = run; 1 else
   * @see https://www.vasp.at/wiki/index.php/ML_OUTPUT_MODE
   */
  ML_OUTPUT_MODE?: number;

  /**
   * This tag specifies the value of the coupling parameter for the calculation
   * of the chemical potential within the machine learning force field method.
   * @default 0.0 if ML_LEMPPOT=true; 1.0 otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_RCOUPLE
   */
  ML_RCOUPLE?: number;

  /**
   * Sets the cutoff radius R_textcut for the radial descriptor rho^(2)_i(r) in
   * AA.
   * @default 8.0
   * @see https://www.vasp.at/wiki/index.php/ML_RCUT1
   */
  ML_RCUT1?: number;

  /**
   * This flag sets the cutoff radius R_textcut for the angular descriptor
   * rho^(3)_i(r) in the machine learning force field method. The unit of the
   * cut-off radius is AA.
   * @default 5.0
   * @see https://www.vasp.at/wiki/index.php/ML_RCUT2
   */
  ML_RCUT2?: number;

  /**
   * Sets the ratio of descriptors kept during angular-descriptor
   * sparsification.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/ML_RDES_SPARSDES
   */
  ML_RDES_SPARSDES?: number;

  /**
   * Sets fraction by which the error threshold for the maximum forces is
   * lowered in the selection of local reference calculations.
   * @default 0.6
   * @see https://www.vasp.at/wiki/index.php/ML_SCLC_CTIFOR
   */
  ML_SCLC_CTIFOR?: number;

  /**
   * This flag sets the noise parameter s_mathrmv (see here for definition) for
   * the fitting in the machine learning force field method.
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/ML_SIGV0
   */
  ML_SIGV0?: number;

  /**
   * This flag sets the precision parameter s_mathrmw (see here for definition)
   * for the fitting in the machine learning force field method.
   * @default 1E-7 for ML_MODE = REFIT; 1.0 else
   * @see https://www.vasp.at/wiki/index.php/ML_SIGW0
   */
  ML_SIGW0?: number;

  /**
   * This tag specifies the width sigma_textatom of the Gaussian functions used
   * for broadening the atomic distributions of the radial descriptor
   * rho^(2)_i(r) within the machine learning force field method.
   * @default 0.5
   * @see https://www.vasp.at/wiki/index.php/ML_SION1
   */
  ML_SION1?: number;

  /**
   * This tag specifies the width sigma_textatom of the Gaussian functions used
   * for broadening the atomic distributions of the angular descriptor
   * rho^(3)_i(r) within the machine learning force field method.
   * @default ML_SION1
   * @see https://www.vasp.at/wiki/index.php/ML_SION2
   */
  ML_SION2?: number;

  /**
   * Specifies the height of a soft repulsive exponential potential used as an
   * auxiliary potential in thermodynamic integration (VCAIMAGES).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/ML_SRPOT_B0
   */
  ML_SRPOT_B0?: number;

  /**
   * Specifies the exponent of a soft repulsive exponential potential used as
   * an auxiliary potential in thermodynamic integration (VCAIMAGES).
   * @default 10
   * @see https://www.vasp.at/wiki/index.php/ML_SRPOT_N0
   */
  ML_SRPOT_N0?: number;

  /**
   * Specifies the broadening of a soft repulsive exponential potential used as
   * an auxiliary potential in thermodynamic integration (VCAIMAGES).
   * @default 2.0
   * @see https://www.vasp.at/wiki/index.php/ML_SRPOT_S0
   */
  ML_SRPOT_S0?: number;

  /**
   * String-based tag selecting type of machine-learned force field to use.
   * Values: kernel, vasp, grace.
   * Available as of VASP 6.6.0.
   * @default kernel
   * @see https://www.vasp.at/wiki/index.php/ML_TYPE
   */
  ML_TYPE?: "kernel" | "vasp" | "grace" | (string & {});

  /**
   * This tag defines the weight beta for the radial (and angular) descriptor
   * within the machine learning force field method (see this section).
   * @default 0.1
   * @see https://www.vasp.at/wiki/index.php/ML_W1
   */
  ML_W1?: number;

  /**
   * This tag sets the weight for the scaling of the forces in the training
   * data within the machine learning force field method.
   * @default 0.05 if ML_IWEIGHT=1; 1.0 otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_WTIFOR
   */
  ML_WTIFOR?: number;

  /**
   * Sets a scaling of the fitted potential energy.
   * @default 0.005 if ML_IWEIGHT=1; 1.0 otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_WTOTEN
   */
  ML_WTOTEN?: number;

  /**
   * This tag sets the weight for the scaling of the stress in the training
   * data within the machine learning force field method.
   * @default 5.0 if ML_IWEIGHT=1; 1.0 otherwise
   * @see https://www.vasp.at/wiki/index.php/ML_WTSIF
   */
  ML_WTSIF?: number;

  /**
   * A positive value of MSDGW_F triggers the mixed stochastic-deterministic
   * compression algorithm of Altman and co-workers.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/MSDGW_F
   */
  MSDGW_F?: number;

  /**
   * calculate RPA natural orbitals.
   * @default 0; for low scaling GW type calculations the default is 4
   * @see https://www.vasp.at/wiki/index.php/NATURALO
   */
  NATURALO?: number;

  /**
   * Total number of Kohn-Sham (or quasiparticle) orbitals. VASP may increase
   * it for parallelization; the default is increased for spin-polarized runs
   * and doubled for noncollinear runs.
   * @default max(nint(NELECT + 2)/2 + max(NIONS/2, 3), int(0.6 × NELECT))
   * @see https://www.vasp.at/wiki/index.php/NBANDS
   */
  NBANDS?: number;

  /**
   * NBANDS_WAVE specifies the number of bands written to WAVECAR in the all-
   * in-one mode of many-body perturbation theory calculations, i.e.,
   * ALGO=ACFDT[R], [[Practical_guide_to_GW_calculations|[EV]GW0[R]]], GWR.
   * @default NBANDSGW for LALL_IN_ONE=true and NBANDS<1; NBANDS for
   * LALL_IN_ONE=true and NBANDS>0; NBANDSEXACT for LALL_IN_ONE=false and
   * NBANDS<1; NBANDS for LALL_IN_ONE=false and NBANDS>0
   * @see https://www.vasp.at/wiki/index.php/NBANDS_WAVE
   */
  NBANDS_WAVE?: number;

  /**
   * NBANDSEXACT specifies the number of bands used in the all-in-one mode of
   * many-body perturbation theory calculations.
   * @default -1 for LALL_IN_ONE=false; maximum number of plane waves for
   * LALL_IN_ONE=true
   * @see https://www.vasp.at/wiki/index.php/NBANDSEXACT
   */
  NBANDSEXACT?: number;

  /**
   * The flag determines how many QP energies are calculated and updated in GW
   * type calculations.
   * @default twice the number of occupied states
   * @see https://www.vasp.at/wiki/index.php/NBANDSGW
   */
  NBANDSGW?: number;

  /**
   * NBANDSO determines how many occupied orbitals are included in the
   * Casida/BSE calculations or time propagation (ALGO=TIMEEV.
   * @default number of occupied orbitals
   * @see https://www.vasp.at/wiki/index.php/NBANDSO
   */
  NBANDSO?: number;

  /**
   * NBANDSV determines how many unoccupied orbitals are included in the
   * Casida/BSE calculations or timepropagation.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NBANDSV
   */
  NBANDSV?: number;

  /**
   * NBLK determines the blocking factor in many BLAS level 3 routines.
   * @default -1 VASP.4.6; 256 in VASP.5.2, if dfast
   * @see https://www.vasp.at/wiki/index.php/NBLK
   */
  NBLK?: number;

  /**
   * Every NBLOCK ionic steps the pair-correlation function and DOS are
   * calculated and the configuration is written to XDATCAR; also sets how
   * often velocities are rescaled for `SMASS = -1`.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NBLOCK
   */
  NBLOCK?: number;

  /**
   * Sets the number of orbitals that are processed simultaneously when
   * computing the action of the Fock potential.
   * @default 64 CPU build; 32 GPU build (OpenACC/OpenMP offload));
   * OMP_NUM_THREADS CPU build that is compiled with OpenMP support and
   * threading is active (OMP_NUM_THREADS > 1)
   * @see https://www.vasp.at/wiki/index.php/NBLOCK_FOCK
   */
  NBLOCK_FOCK?: number;

  /**
   * NBMOD controls how bands are selected when computing partial charge
   * densities.
   * Values: -3, -2, -1, 0, [positive integer].
   * @default n if IBAND is set and contains n values; -2 if EINT is set and
   * IBAND is not set; -1 if neither EINT nor IBAND are set
   * @see https://www.vasp.at/wiki/index.php/NBMOD
   */
  NBMOD?: number;

  /**
   * NBSEBLOCKO specifies the blocking factor for the occupied states when
   * setting up the BSE Hamiltonian.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/NBSEBLOCKO
   */
  NBSEBLOCKO?: number;

  /**
   * NBSEBLOCKV specifies the blocking factor for the unoccupied states when
   * setting up the BSE Hamiltonian.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/NBSEBLOCKV
   */
  NBSEBLOCKV?: number;

  /**
   * NBSEEIG sets the number of BSE eigenvectors written to the BSEFATBAND
   * file. If BSEHOLE or BSEELECTRON is set, NBSEEIG exciton wavefunctions are
   * written to the CHG.XX files.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/NBSEEIG
   */
  NBSEEIG?: number;

  /**
   * Number of MPI ranks that work together on a single band, parallelizing
   * its FFTs (VASP ≥ 5.2.13). Inverse of {@link NPAR}; do not set both (NPAR
   * takes precedence). Reset to 1 with OpenMP threading or GPU code paths.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NCORE
   */
  NCORE?: number;

  /**
   * This tag specifies the number of cores in the first image.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/NCORE_IN_IMAGE1
   */
  NCORE_IN_IMAGE1?: number;

  /**
   * Controls which bands are excluded in the constrained random-phase
   * approximation. Check also NTARGET_STATES.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NCRPA_BANDS
   */
  NCRPA_BANDS?: number[];

  /**
   * Number of grid points for the DOS (between {@link EMIN} and
   * {@link EMAX}) and for the frequency grid of the dielectric function.
   * @default 301
   * @see https://www.vasp.at/wiki/index.php/NEDOS
   */
  NEDOS?: number;

  /**
   * Total number of electrons. Only set for charged calculations; a mismatch
   * with the POTCAR valence is compensated by a homogeneous background charge.
   * @default number of valence electrons (from POTCAR ZVAL and POSCAR counts)
   * @see https://www.vasp.at/wiki/index.php/NELECT
   */
  NELECT?: number;

  /**
   * Maximum number of electronic SC steps. For `ALGO = TIMEEV` a user value
   * must exceed 100, otherwise it is ignored.
   * @default 60
   * @see https://www.vasp.at/wiki/index.php/NELM
   */
  NELM?: number;

  /**
   * Number of non-self-consistent steps at the beginning (fixed initial
   * Hamiltonian). Negative: delay only in the first ionic step; positive:
   * delay after every ionic step.
   * @default -12 if ISTART = 0, INIWAV = 1 and IALGO = 48 or 50; 0 if a
   * WAVECAR is present; -5 otherwise
   * @see https://www.vasp.at/wiki/index.php/NELMDL
   */
  NELMDL?: number;

  /**
   * NELMGW sets the number of self-consistent GW steps. Available as of 6.3.0.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NELMGW
   */
  NELMGW?: number;

  /**
   * Minimum number of electronic SC steps (4–8 recommended for MD and ionic
   * relaxations).
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/NELMIN
   */
  NELMIN?: number;

  /**
   * For `IBRION = 1`, the number of ionic steps kept in the iteration
   * history; for `IBRION = 5, 6`, the number of displacements per direction
   * and ion (1, 2 for central differences, or 4).
   * @default 1 if `IBRION = 2`, else 0
   * @see https://www.vasp.at/wiki/index.php/NFREE
   */
  NFREE?: number;

  /**
   * Number of FFT grid points along the first lattice vector.
   * @default set in accordance with PREC and ENCUT
   * @see https://www.vasp.at/wiki/index.php/NGX
   */
  NGX?: number;

  /**
   * Number of points along the first lattice vector of the "fine" FFT grid
   * (augmentation charges; local potentials for USPPs).
   * @default set in accordance with PREC, NGX, ENCUT and ENAUG
   * @see https://www.vasp.at/wiki/index.php/NGXF
   */
  NGXF?: number;

  /**
   * Number of FFT grid points along the second lattice vector.
   * @default set in accordance with PREC and ENCUT
   * @see https://www.vasp.at/wiki/index.php/NGY
   */
  NGY?: number;

  /**
   * Number of points along the second lattice vector of the "fine" FFT grid.
   * @default set in accordance with PREC, NGY, ENCUT and ENAUG
   * @see https://www.vasp.at/wiki/index.php/NGYF
   */
  NGYF?: number;

  /**
   * NGYROMAG specifies the nuclear gyromagnetic ratios (in MHz, for H_0 = 1 T)
   * for the atomic types on the POTCAR file.
   * @default NTYP*1.0
   * @see https://www.vasp.at/wiki/index.php/NGYROMAG
   */
  NGYROMAG?: number[];

  /**
   * Number of FFT grid points along the third lattice vector.
   * @default set in accordance with PREC and ENCUT
   * @see https://www.vasp.at/wiki/index.php/NGZ
   */
  NGZ?: number;

  /**
   * Number of points along the third lattice vector of the "fine" FFT grid.
   * @default set in accordance with PREC, NGZ, ENCUT and ENAUG
   * @see https://www.vasp.at/wiki/index.php/NGZF
   */
  NGZF?: number;

  /**
   * Length of the Nosé-Hoover chain.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/NHC_NCHAINS
   */
  NHC_NCHAINS?: number;

  /**
   * The number of subdivisions of the integration step used in propagation of
   * thermostat variables in the Nosé-Hoover chain thermostat.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NHC_NRESPA
   */
  NHC_NRESPA?: number;

  /**
   * The number of subdivisions of each RESPA step used in the integration step
   * used in propagation of thermostat variables in the Nosé-Hoover chain
   * thermostat.
   * Values: [integer] 1, 3, 7.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NHC_NS
   */
  NHC_NS?: number;

  /**
   * Uniform reduction factor of the q-point grid for the exact-exchange
   * potential (and the correlation part in GW/RPA).
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NKRED
   */
  NKRED?: number;

  /**
   * Reduction factor of the exact-exchange q-point grid along b1.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NKREDX
   */
  NKREDX?: number;

  /**
   * Reduction factor of the exact-exchange q-point grid along b2.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NKREDY
   */
  NKREDY?: number;

  /**
   * Reduction factor of the exact-exchange q-point grid along b3.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NKREDZ
   */
  NKREDZ?: number;

  /**
   * construct the PAW projectors in reciprocal space using spline
   * interpolation so that they are k-differentiable.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/NLSPLINE
   */
  NLSPLINE?: boolean;

  /**
   * Sets the number of shape-restoring functions used for each angular
   * momentum quantum number L in shape restoration.
   * Values: 1, 2.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/NMAXFOCKAE
   */
  NMAXFOCKAE?: number;

  /**
   * NOMEGA specifies the number of (imaginary) frequency and imaginary time
   * grid points.
   * @default 100 for GW calculations; 12 for ACFDT calculations
   * @see https://www.vasp.at/wiki/index.php/NOMEGA
   */
  NOMEGA?: number;

  /**
   * NOMEGA_DUMP selects the imaginary frequency point of screened potential in
   * low-scaling GW calculations that is written to file.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/NOMEGA_DUMP
   */
  NOMEGA_DUMP?: number;

  /**
   * NOMEGAPAR available as of VASP.6, specifies the number of processor groups
   * sharing the same imaginary frequency grid points.
   * @default NOMEGA used in low scaling GW and RPA/ACFDT calculations.
   * @see https://www.vasp.at/wiki/index.php/NOMEGAPAR
   */
  NOMEGAPAR?: number;

  /**
   * NOMEGAR specifies the number of frequency grid points along the real axis.
   * @default NOMEGA for GW calculations; 0 for ACFDT calculations
   * @see https://www.vasp.at/wiki/index.php/NOMEGAR
   */
  NOMEGAR?: number;

  /**
   * NPACO sets the number of slots in the pair-correlation function written to
   * PCDAT.
   * @default 256
   * @see https://www.vasp.at/wiki/index.php/NPACO
   */
  NPACO?: number;

  /**
   * Number of bands treated in parallel (legacy; use {@link NCORE} instead).
   * NPAR × NCORE = available ranks; takes precedence over NCORE if both set.
   * @default available ranks (total MPI ranks / KPAR), i.e. NCORE = 1
   * @see https://www.vasp.at/wiki/index.php/NPAR
   */
  NPAR?: number;

  /**
   * NPPSTR specifies the number of k-points on the strings in the IGPAR
   * direction.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NPPSTR
   */
  NPPSTR?: number;

  /**
   * Maximum number of iterative steps for RMM-DIIS (IALGO=4X) or Davidson
   * algorithms (IALGO=3X).
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/NRMM
   */
  NRMM?: number;

  /**
   * Number of bands optimized simultaneously by RMM-DIIS; also controls
   * blocking in parts of blocked Davidson and in the force calculation.
   * GPUs benefit from larger values.
   * @default 4
   * @see https://www.vasp.at/wiki/index.php/NSIM
   */
  NSIM?: number;

  /**
   * NSTORB specifies the number of stochastic orbitals per cycle in the
   * stochastic MP2 algorithm.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/NSTORB
   */
  NSTORB?: number;

  /**
   * NSUBSYS defines the atomic subsystems in calculations with multiple
   * Anderson thermostats (in case VASP was compiled with -Dtbdyn).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NSUBSYS
   */
  NSUBSYS?: number[];

  /**
   * Maximum number of ionic steps. For MD (`IBRION = 0`) it is the number of
   * steps and must be supplied; for minimizations it is the maximum number
   * of ionic steps.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/NSW
   */
  NSW?: number;

  /**
   * Controls which Wannier states are excluded in constrained random-phase
   * approximation. Check also NCRPA_BANDS.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NTARGET_STATES
   */
  NTARGET_STATES?: number[];

  /**
   * NTAUPAR available as of VASP.6, specifies the number of MPI groups sharing
   * same imaginary time grid points. The default value of NTAUPAR is set to
   * the largest possible value supported on the compute nodes to speed up the
   * GW or RPA calculation.
   * @default depends on MAXMEM used in low scaling GW and RPA/ACFDT
   * calculations.
   * @see https://www.vasp.at/wiki/index.php/NTAUPAR
   */
  NTAUPAR?: number;

  /**
   * NTEMPER specifies how often temperature swaps are attempted during
   * parallel tempering. The flag must be used in combination with IMAGES and
   * LTEMPER. NTEMPER=0, allows to perform several completely independent
   * calculations.
   * @default 200
   * @see https://www.vasp.at/wiki/index.php/NTEMPER
   */
  NTEMPER?: number;

  /**
   * Allows the nucleus-independent chemical shielding (NICS) to be calculated.
   * Available as of VASP 6.6.0.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/NUCIND
   */
  NUCIND?: boolean;

  /**
   * Controls the number of Wannier orbitals to be constructed.
   * @default NBANDS
   * @see https://www.vasp.at/wiki/index.php/NUM_WANN
   */
  NUM_WANN?: number;

  /**
   * Fixed difference between the number of up- and down-spin electrons
   * (targets a specific spin multiplet). Unset or `-1` performs a full,
   * unconstrained relaxation of the moment.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/NUPDOWN
   */
  NUPDOWN?: number;

  /**
   * Verbosity of the OUTCAR file:
   * - `0`, `1`: minimal output (recommended for long MD runs)
   * - `2`: standard output (recommended for short runs)
   * - `3`: per-electronic-step eigenvalues, DOS and symmetry operations
   *   (useful when something goes wrong)
   * - `4`: debugging only
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/NWRITE
   */
  NWRITE?: number;

  /**
   * ODDONLY=.TRUE. selects a subset of k-points for the representation of the
   * Fock exchange potential, with C_1=C_2=C_3=1, and n_1+n_2+n_3 odd.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ODDONLY
   */
  ODDONLY?: boolean;

  /**
   * ODDONLYGW allows to avoid the inclusion of the Gamma point in the
   * evaluation of response functions (in GW calculations).
   * @default false
   * @see https://www.vasp.at/wiki/index.php/ODDONLYGW
   */
  ODDONLYGW?: boolean;

  /**
   * The tag OFIELD_A sets the desired order parameter Q_6 in the Interface
   * pinning method.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/OFIELD_A
   */
  OFIELD_A?: number;

  /**
   * The tag OFIELD_KAPPA sets the strength of the bias potential in the
   * Interface pinning method.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/OFIELD_KAPPA
   */
  OFIELD_KAPPA?: number;

  /**
   * OFIELD_Q6_FAR sets the far fading distance for the computation of a
   * continuous Q_6 parameter in the interface-pinning method.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/OFIELD_Q6_FAR
   */
  OFIELD_Q6_FAR?: number;

  /**
   * OFIELD_Q6_NEAR sets the near-fading distance (in AA) for the computation
   * of a continuous Q_6 parameter in the interface-pinning method.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/OFIELD_Q6_NEAR
   */
  OFIELD_Q6_NEAR?: number;

  /**
   * OMEGAMAX specifies the maximum frequency for the dense part of the
   * frequency grid for GW calculations (old GW code, does not apply to GWR).
   * For CRPA calculations, OMEGAMAX is the frequency point of the interaction.
   * For BSE calculations OMEGAMAX determines the maximum energy difference for
   * excitation pairs to be included. For calculations of the dielectric
   * function via LOPTICS OMEGAMAX determines the maximum frequency of the
   * calculated dielectric properties. Since the flag controls different
   * aspects of the code, be careful when setting it (and remember to remove
   * the tag, when you change the type of calculations).
   * @default outermost node in dielectric function epsilon(omega)/1.3
   * @see https://www.vasp.at/wiki/index.php/OMEGAMAX
   */
  OMEGAMAX?: number;

  /**
   * OMEGAMIN sets the minimum frequency in the frequency grid.
   * @default minimum transition energy (0.05 for metals)
   * @see https://www.vasp.at/wiki/index.php/OMEGAMIN
   */
  OMEGAMIN?: number;

  /**
   * OMEGATL specifies the maximum frequency for the coarse part of the
   * frequency grid.
   * @default 10 times outermost node in dielectric function epsilon(omega)
   * @see https://www.vasp.at/wiki/index.php/OMEGATL
   */
  OMEGATL?: number;

  /**
   * Exchange-functional parameter: μ for `GGA = MK` (optB86b, B86R,
   * DF3-opt2), β for `GGA = BO` (optB88; μ/κ for DF3-opt1).
   * @default 0.1234
   * @see https://www.vasp.at/wiki/index.php/PARAM1
   */
  PARAM1?: number;

  /**
   * Exchange-functional parameter: κ for `GGA = MK` (optB86b, B86R,
   * DF3-opt2), μ for `GGA = BO` (optB88, DF3-opt1).
   * @default 1.0
   * @see https://www.vasp.at/wiki/index.php/PARAM2
   */
  PARAM2?: number;

  /**
   * Control flag for the output of the profiling routines.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PFLAT
   */
  PFLAT?: boolean;

  /**
   * PHON_BORN_CHARGES sets the Born effective charges to be used for the
   * dipole-dipole corrections in the computation of the phonon dispersion.
   * This is only used when LPHON_POLAR=.TRUE.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/PHON_BORN_CHARGES
   */
  PHON_BORN_CHARGES?: number[];

  /**
   * PHON_DIELECTRIC sets the static dielectric tensor to be used for the
   * dipole-dipole corrections in the computation of the phonon dispersion.
   * This is only used when LPHON_POLAR=.TRUE.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/PHON_DIELECTRIC
   */
  PHON_DIELECTRIC?: number[];

  /**
   * Select the approach to use when computing the phonon density-of-states
   * (DOS).
   * Values: 0, 1, 2.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/PHON_DOS
   */
  PHON_DOS?: number;

  /**
   * PHON_G_CUTOFF sets the cutoff radius in reciprocal space used to determine
   * the number of mathbfG vectors involved in the Ewald sum in polar phonon
   * calculations.
   * @default 8.0
   * @see https://www.vasp.at/wiki/index.php/PHON_G_CUTOFF
   */
  PHON_G_CUTOFF?: number;

  /**
   * Determines whether structures in the sampling are created according to
   * Bose-Einstein or Maxwell-Boltzmann statistics.
   * @default true
   * @see https://www.vasp.at/wiki/index.php/PHON_LBOSE
   */
  PHON_LBOSE?: boolean;

  /**
   * Controls whether electron-phonon interactions from Monte-Carlo sampling
   * are calculated or not.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/PHON_LMC
   */
  PHON_LMC?: boolean;

  /**
   * Sets the number of frequency points to compute the phonon density of
   * states.
   * @default 2000
   * @see https://www.vasp.at/wiki/index.php/PHON_NEDOS
   */
  PHON_NEDOS?: number;

  /**
   * Sets the number of structures for electron-phonon interactions from Monte-
   * Carlo (MC) sampling.
   * @default none
   * @see https://www.vasp.at/wiki/index.php/PHON_NSTRUCT
   */
  PHON_NSTRUCT?: number;

  /**
   * PHON_NWRITE determines how much output is written to the OUTCAR file when
   * computing the phonon dispersion LPHON_DISPERSION=.TRUE.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/PHON_NWRITE
   */
  PHON_NWRITE?: number;

  /**
   * Set the width of the Gaussian function in eV to compute the phonon density
   * of states.
   * @default 0.0005 eV
   * @see https://www.vasp.at/wiki/index.php/PHON_SIGMA
   */
  PHON_SIGMA?: number;

  /**
   * Provides the list of temperatures for that the electron-phonon interaction
   * using the ZG configuration is evaluated.
   * @default none
   * @see https://www.vasp.at/wiki/index.php/PHON_TLIST
   */
  PHON_TLIST?: number[];

  /**
   * Control tag for the output of the profiling routines.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PLEVEL
   */
  PLEVEL?: number;

  /**
   * PLUGINS/FORCE_AND_STRESS calls the Python plugin for the force and stress
   * interface for each ionic relaxation step.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/FORCE_AND_STRESS
   */
  "PLUGINS/FORCE_AND_STRESS"?: boolean;

  /**
   * PLUGINS/LOCAL_POTENTIAL calls the Python plugin for the local potential
   * interface for each SCF step.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/LOCAL_POTENTIAL
   */
  "PLUGINS/LOCAL_POTENTIAL"?: boolean;

  /**
   * PLUGINS/MACHINE_LEARNING calls the Python plugin for the machine learning
   * interface for each ionic relaxation step.
   * @default false
   * @deprecated Not recommended anymore (ASE/VASP unit mismatch); use
   * PLUGINS/FORCE_AND_STRESS with PLUGINS/ML_MODE = run.
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/MACHINE_LEARNING
   */
  "PLUGINS/MACHINE_LEARNING"?: boolean;

  /**
   * String-based tag selecting operation mode for running
   * PLUGINS/FORCE_AND_STRESS plugins.
   * Values: none, run.
   * @default none
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/ML_MODE
   */
  "PLUGINS/ML_MODE"?: "none" | "run" | (string & {});

  /**
   * Equivalent to ML_OUTBLOCK for calculations run via plugins instead of
   * using VASP internal force fields.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/ML_OUTBLOCK
   */
  "PLUGINS/ML_OUTBLOCK"?: number;

  /**
   * Equivalent to ML_OUTPUT_MODE for calculations run via plugins instead of
   * using VASP internal force fields.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/ML_OUTPUT_MODE
   */
  "PLUGINS/ML_OUTPUT_MODE"?: number;

  /**
   * PLUGINS/NEIGHBOR_CUTOFF determines the cutoff up to which the neighbor
   * list is computed that is passed to the Python plugins. If not set, the
   * neighbor list will be empty.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/NEIGHBOR_CUTOFF
   */
  "PLUGINS/NEIGHBOR_CUTOFF"?: number;

  /**
   * PLUGINS/OCCUPANCIES calls the Python plugin for the occupancies interface
   * for each ionic relaxation step.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/OCCUPANCIES
   */
  "PLUGINS/OCCUPANCIES"?: boolean;

  /**
   * PLUGINS/STRUCTURE calls the Python plugin for the structure interface for
   * each ionic relaxation step.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/PLUGINS/STRUCTURE
   */
  "PLUGINS/STRUCTURE"?: boolean;

  /**
   * Fictitious mass in amu of the lattice degrees of freedom in
   * Parrinello-Rahman (NpT) dynamics.
   * @default 1000
   * @see https://www.vasp.at/wiki/index.php/PMASS
   */
  PMASS?: number;

  /**
   * Array of masses of the atoms in atomic units.
   * @default values read from POTCAR
   * @see https://www.vasp.at/wiki/index.php/POMASS
   */
  POMASS?: number[];

  /**
   * Time step in fs for MD (`IBRION = 0`, must be set), step-width scaling
   * for relaxations (`IBRION = 1, 2, 3`), or displacement width for finite
   * difference phonons (`IBRION = 5, 6`).
   * @default none (must be set) for `IBRION = 0`; 0.5 for `IBRION = 1, 2, 3`
   * (and 5 up to VASP.4.6); 0.015 for `IBRION = 5, 6` (as of VASP.5.1)
   * @see https://www.vasp.at/wiki/index.php/POTIM
   */
  POTIM?: number;

  /**
   * Precision mode; sets defaults for {@link ENCUT}, the FFT grids
   * ({@link NGX}…, {@link NGXF}…) and {@link ROPT}:
   * - `"Normal"`: routine calculations; fine grid twice the coarse grid
   * - `"Accurate"`: denser coarse grid, avoids wrap-around errors; for
   *   accurate forces, phonons, stress
   * - `"Single"`: no double grid (fine grid = coarse grid; VASP ≥ 5.1, updated
   *   in VASP 6)
   * - `"SingleN"`: as Single but with the Normal coarse grid (VASP 6)
   * - `"Low"`, `"Medium"`, `"High"`: deprecated, kept for backward compatibility
   * @default "Normal" (since VASP 5.X; "Medium" for VASP 4.X)
   * @see https://www.vasp.at/wiki/index.php/PREC
   */
  PREC?:
    | "Normal"
    | "Single"
    | "SingleN"
    | "Accurate"
    | "Low"
    | "Medium"
    | "High"
    | (string & {});

  /**
   * FFT grid used in the exact-exchange routines: `"Normal"` (recommended),
   * `"Accurate"` (alias-free, for high precision/phonons), `"Fast"` (smallest
   * grid), `"Single"`; `"Medium"` and `"Low"` are kept only for compatibility.
   * @default "Fast" for RPAR calculations; "Single" if `PREC = Single` or `SingleN`; else "Normal"
   * @see https://www.vasp.at/wiki/index.php/PRECFOCK
   */
  PRECFOCK?:
    | "Normal"
    | "Accurate"
    | "Fast"
    | "Medium"
    | "Single"
    | "Low"
    | (string & {});

  /**
   * Control flag for the output of the profiling routines.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PROUTINE
   */
  PROUTINE?: number;

  /**
   * External pressure in kB: adds V × PSTRESS to the energy in relaxations,
   * sets the target pressure of the Parrinello-Rahman barostat in NpT MD, or
   * corrects for Pulay stress.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/PSTRESS
   */
  PSTRESS?: number;

  /**
   * PSUBSYS sets the collision probabilities for the atoms in each atomic
   * subsystem in calculations with multiple Anderson thermostats (in case VASP
   * was compiled with -Dtbdyn).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PSUBSYS
   */
  PSUBSYS?: number[];

  /**
   * Control flag for the output of the profiling routines.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/PTHRESHOLD
   */
  PTHRESHOLD?: number;

  /**
   * Sets the wave vector at which the local augmentation charges are fitted to
   * restore the all-electron charge density on the plane-wave grid.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/QMAXFOCKAE
   */
  QMAXFOCKAE?: number[];

  /**
   * the QSPIRAL-tag specifies the spin spiral propagation vector.
   * @default 3*0.0
   * @see https://www.vasp.at/wiki/index.php/QSPIRAL
   */
  QSPIRAL?: number[];

  /**
   * nuclear quadrupole moment (in millbarn) for the atomic types on the POTCAR
   * file.
   * @default NTYP*1.0
   * @see https://www.vasp.at/wiki/index.php/QUAD_EFG
   */
  QUAD_EFG?: number[];

  /**
   * Specifies the random-number generator used to initialize the wavefunction
   * (see INIWAV) for electronic minimization, initialize atomic velocities for
   * molecular dynamics, etc.
   * Values: default, pcg_32.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/RANDOM_GENERATOR
   */
  RANDOM_GENERATOR?: "default" | "pcg_32" | (string & {});

  /**
   * RANDOM_SEED specifies the seed of the random-number generator (compile
   * VASP with -Dtbdyn).
   * @default based on the system clock
   * @see https://www.vasp.at/wiki/index.php/RANDOM_SEED
   */
  RANDOM_SEED?: number[];

  /**
   * Accuracy of the real-space projectors, one value per species, in POSCAR
   * species order. |ROPT| ≥ 0.1 sets ~1000 × ROPT grid points in the cutoff
   * sphere; |ROPT| < 0.1 targets an accuracy of ~ROPT eV/atom. Sign is
   * irrelevant.
   * @default depends on LREAL and PREC: for LREAL = Auto, -5E-4 (Normal,
   * Single, SingleN), -2.5E-4 (Accurate), -0.01 (Low), -0.002 (Medium),
   * -4E-4 (High); for LREAL = On, 2/3 (Low), 1.0 (Medium), 1.5 (High)
   * @see https://www.vasp.at/wiki/index.php/ROPT
   */
  ROPT?: number[];

  /**
   * sets the r_s^mathrmth parameter (in bohr) in the LMBJ potential.
   * @default 7
   * @see https://www.vasp.at/wiki/index.php/RSMBJ
   */
  RSMBJ?: number;

  /**
   * Wigner-Seitz radius in Å, one value per species, in POSCAR species order.
   * Required for `LORBIT < 10` (ignored for `LORBIT >= 10`) and for
   * constrained local moments ({@link I_CONSTRAINED_M}).
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/RWIGS
   */
  RWIGS?: number[];

  /**
   * Global spin-quantization axis `[sx, sy, sz]` in Cartesian coordinates.
   * Matters with spin-orbit coupling; values other than (0, 0, 1) are not
   * supported with `LHFCALC = .TRUE.` (unless `ISYM = -1`).
   * @default [0, 0, 1]
   * @see https://www.vasp.at/wiki/index.php/SAXIS
   */
  SAXIS?: number[];

  /**
   * This tag specifies the coupling parameter of the energies and forces
   * between a fully interacting system and a reference system.
   * @default 1
   * @see https://www.vasp.at/wiki/index.php/SCALEE
   */
  SCALEE?: number;

  /**
   * SCISSOR specifies the shift for the scissor operator in eV.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/SCISSOR
   */
  SCISSOR?: number;

  /**
   * SCSRAD defines the cutoff radius (in AA) used in the calculation of tau_ij
   * within the Tkatchenko-Scheffler method Self-consistent screening in
   * Tkatchenko-Scheffler method.
   * @default 120
   * @see https://www.vasp.at/wiki/index.php/SCSRAD
   */
  SCSRAD?: number;

  /**
   * SDFTD3_DAMPING sets the type of damping function in the DFT-D3 method
   * implemented in the simple-DFT-D3 package.
   * Values: zero, rational, mzero, mrational, optimizedpower.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/SDFTD3_DAMPING
   */
  SDFTD3_DAMPING?:
    | "zero"
    | "rational"
    | "mzero"
    | "mrational"
    | "optimizedpower"
    | (string & {});

  /**
   * SDFTD3_XC sets the exchange-correlation functional which determines the
   * van der Waals parameters used in the DFT-D3 method implemented in the
   * simple-DFT-D3 package.
   * @default The functional set by the GGA, METAGGA or XC tag.
   * @see https://www.vasp.at/wiki/index.php/SDFTD3_XC
   */
  SDFTD3_XC?: string;

  /**
   * SHAKEMAXITER specifies the maximum number of iterations in the SHAKE
   * algorithm (in case VASP was compiled with -Dtbdyn).
   * @default 1000
   * @see https://www.vasp.at/wiki/index.php/SHAKEMAXITER
   */
  SHAKEMAXITER?: number;

  /**
   * SHAKETOL specifies the tolerance for the SHAKE algorithm (in case VASP was
   * compiled with -Dtbdyn).
   * @default 10^-5
   * @see https://www.vasp.at/wiki/index.php/SHAKETOL
   */
  SHAKETOL?: number;

  /**
   * SHAKETOLSOFT specifies the soft tolerance for the SHAKE algorithm (in case
   * VASP was compiled with -Dtbdyn).
   * @default SHAKETOL
   * @see https://www.vasp.at/wiki/index.php/SHAKETOLSOFT
   */
  SHAKETOLSOFT?: number;

  /**
   * Width of the smearing, in eV.
   * @default 0.2
   * @see https://www.vasp.at/wiki/index.php/SIGMA
   */
  SIGMA?: number;

  /**
   * Controls the velocities during MD:
   * - `-3`: microcanonical (NVE) ensemble
   * - `-2`: initial velocities kept constant
   * - `-1`: velocities rescaled every {@link NBLOCK} steps to a temperature
   *   ramped from TEBEG to TEEND
   * - `≥ 0`: canonical ensemble with a Nosé thermostat of this mass
   *   (0 picks a mass giving a period of 40 time steps)
   * @default -3
   * @see https://www.vasp.at/wiki/index.php/SMASS
   */
  SMASS?: number;

  /**
   * sets the sigma parameter (in AA) in the LMBJ potential.
   * @default 2
   * @see https://www.vasp.at/wiki/index.php/SMBJ
   */
  SMBJ?: number;

  /**
   * (ISMEAR, SIGMA) pairs looped over when `ISMEAR = -3`:
   * `[ismear1, sigma1, ismear2, sigma2, ...]`, length 2 × NSW. Set NSW to the
   * number of smearings and do not combine with another IBRION relaxation.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/SMEARINGS
   */
  SMEARINGS?: number[];

  /**
   * SPRING gives the spring constant between the images as used in the elastic
   * band method.
   * @default -5
   * @see https://www.vasp.at/wiki/index.php/SPRING
   */
  SPRING?: number;

  /**
   * Force constant for harmonic bias potential.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/SPRING_K
   */
  SPRING_K?: number[];

  /**
   * Position of the minimum for a harmonic bias potential.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/SPRING_R0
   */
  SPRING_R0?: number[];

  /**
   * Rate at which the bias potential is shifted in uc/fs.
   * @default 0 for all coordinates with status=8 in ICONST.
   * @see https://www.vasp.at/wiki/index.php/SPRING_V0
   */
  SPRING_V0?: number[];

  /**
   * The flag STEP_MAX defines the trust radius (upper limit) for the
   * optimization step (in AA ) in the Improved Dimer Method.
   * @default 0.1
   * @see https://www.vasp.at/wiki/index.php/STEP_MAX
   */
  STEP_MAX?: number;

  /**
   * The flag STEP_SIZE defines the trial step size for the optimization step
   * (in AA ) in the Improved Dimer Method.
   * @default 0.01
   * @see https://www.vasp.at/wiki/index.php/STEP_SIZE
   */
  STEP_SIZE?: number;

  /**
   * STOP_ON defines if the code should stop on errors only or also on alerts.
   * Values: Error, Alert.
   * @default Error
   * @see https://www.vasp.at/wiki/index.php/STOP_ON
   */
  STOP_ON?: "Error" | "Alert" | (string & {});

  /**
   * Tolerance to which POSCAR positions must agree to be judged
   * symmetry-equivalent (VASP ≥ 4.4.4).
   * @default 1e-5
   * @see https://www.vasp.at/wiki/index.php/SYMPREC
   */
  SYMPREC?: number;

  /**
   * Free-form title string (may contain blanks) to help the user identify the
   * calculation; it is written to the OUTCAR.
   * @default "unknown system"
   * @see https://www.vasp.at/wiki/index.php/SYSTEM
   */
  SYSTEM?: string;

  /**
   * Starting temperature in K for an MD run; initial velocities are drawn
   * from a Maxwell-Boltzmann distribution at this temperature if POSCAR
   * contains none.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/TEBEG
   */
  TEBEG?: number;

  /**
   * Final temperature in K for an MD run.
   * @default TEBEG
   * @see https://www.vasp.at/wiki/index.php/TEEND
   */
  TEEND?: number;

  /**
   * TILAMBDA defines the coupling parameter lambda used in Thermodynamic
   * integration using a Hessian reference. The value of lambda must be from
   * the inverval langle 0, 1 rangle.
   * @default 0.0
   * @see https://www.vasp.at/wiki/index.php/TILAMBDA
   */
  TILAMBDA?: number;

  /**
   * Time step for `IALGO = 5X` and for the initial (steepest-descent) phase of
   * `IALGO = 4X`.
   * @default 0.4
   * @see https://www.vasp.at/wiki/index.php/TIME
   */
  TIME?: number;

  /**
   * Choose the number of points in the Gauss-Legendre integration grid for the
   * computation of the Onsager coefficients, which in turn are used to compute
   * the transport coefficients.
   * Available as of VASP 6.5.0.
   * @default 501
   * @see https://www.vasp.at/wiki/index.php/TRANSPORT_NEDOS
   */
  TRANSPORT_NEDOS?: number;

  /**
   * Value of the constant relaxation time in unit of seconds.
   * Available as of VASP 6.5.0.
   * @default 1E-14
   * @see https://www.vasp.at/wiki/index.php/TRANSPORT_RELAXATION_TIME
   */
  TRANSPORT_RELAXATION_TIME?: number;

  /**
   * TSUBSYS sets the temperatures for the atomic subsystems in calculations
   * with multiple Anderson thermostats (in case VASP was compiled with
   * -Dtbdyn).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/TSUBSYS
   */
  TSUBSYS?: number[];

  /**
   * Maximum permissible 2D-averaged electric field for a region considered to
   * be field-free in eV/Å.
   * @default 0.1
   * @see https://www.vasp.at/wiki/index.php/VACPOTFLAT
   */
  VACPOTFLAT?: number;

  /**
   * VALUE_MAX sets the upper limits for the monitoring of geometric parameters
   * (in case VASP was compiled with -Dtbdyn).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VALUE_MAX
   */
  VALUE_MAX?: number[];

  /**
   * VALUE_MIN sets the lower limits for the monitoring of geometric parameters
   * (in case VASP was compiled with -Dtbdyn).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VALUE_MIN
   */
  VALUE_MIN?: number[];

  /**
   * VCA is short for the virtual crystal approximation; the tag allows to
   * "weight" each species found in the POTCAR file.
   * @default read from the POTCAR file
   * @see https://www.vasp.at/wiki/index.php/VCA
   */
  VCA?: number[];

  /**
   * The tag VCAIMAGES allows to perform thermodynamic integrations (TI); it
   * defines the coupling parameter λ.
   * @default -1
   * @see https://www.vasp.at/wiki/index.php/VCAIMAGES
   */
  VCAIMAGES?: number;

  /**
   * The parameter VCUTOFF sets the energy cutoff for bare Coulomb matrix
   * elements and controls the basis set for the bare Coulomb interaction.
   * @default 1.1 ENCUTGW
   * @see https://www.vasp.at/wiki/index.php/VCUTOFF
   */
  VCUTOFF?: number;

  /**
   * Scaling a1 of the critical radii in the rational Becke-Johnson damping of
   * DFT-D3 (IVDW = 12, or 15 with rational/mrational/optimizedpower damping)
   * and DFT-D4 (IVDW = 13).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_A1
   */
  VDW_A1?: number;

  /**
   * Offset a2 of the critical radii in the rational Becke-Johnson damping of
   * DFT-D3 (IVDW = 12, or 15 with rational/mrational/optimizedpower damping)
   * and DFT-D4 (IVDW = 13).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_A2
   */
  VDW_A2?: number;

  /**
   * VDW_ALPHA defines the polarizability alpha_0 (bohr^3) for each species
   * defined in the POSCAR file.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_ALPHA
   */
  VDW_ALPHA?: number[];

  /**
   * VDW_BETA sets the offset for the damping radius or the power for the zero-
   * damping component in the DFT-D3 methods implemented in the simple-DFT-D3
   * package.
   * Available as of VASP 6.6.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_BETA
   */
  VDW_BETA?: number;

  /**
   * C6 parameters in J nm^6 mol^-1, one value per species, in POSCAR species
   * order. Used by DFT-D2, DFT-ulg, Tkatchenko-Scheffler and many-body
   * dispersion.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_C6
   */
  VDW_C6?: number[];

  /**
   * VDW_C6AU defines the C_6 parameters (mathrmHartree mathrmbohr^6) for each
   * species defined in the POSCAR file.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_C6AU
   */
  VDW_C6AU?: number[];

  /**
   * Coordination-number cutoff in Å for DFT-D3 (IVDW = 11, 12, 15) and DFT-D4
   * (IVDW = 13). Available for DFT-D4 and simple-DFT-D3 since VASP 6.6.0.
   * @default 21.17 if IVDW = 11, 12 or 15; 15.88 if IVDW = 13
   * @see https://www.vasp.at/wiki/index.php/VDW_CNRADIUS
   */
  VDW_CNRADIUS?: number;

  /**
   * Damping parameter d for DFT-D2, DFT-ulg, Tkatchenko-Scheffler and
   * many-body dispersion.
   * @default 20 for DFT-D2 and Tkatchenko-Scheffler; 0.6966 for DFT-ulg; 6 for
   * many-body dispersion
   * @see https://www.vasp.at/wiki/index.php/VDW_D
   */
  VDW_D?: number;

  /**
   * R0 parameters in Å, one value per species, in POSCAR species order. Used
   * by DFT-D2, DFT-ulg, Tkatchenko-Scheffler and many-body dispersion.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_R0
   */
  VDW_R0?: number[];

  /**
   * VDW_R0AU defines the R_0 parameters (bohr) for each species defined in the
   * POSCAR file.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_R0AU
   */
  VDW_R0AU?: number[];

  /**
   * Two-body interaction cutoff in Å for DFT-D2, DFT-D3, DFT-D4, DFT-ulg, dDsC
   * and Tkatchenko-Scheffler. Available for DFT-D4 and simple-DFT-D3 since
   * VASP 6.6.0.
   * @default 50 if IVDW = 1, 2, 3, 4 or 21; 50.20 if IVDW = 11, 12 or 15;
   * 31.75 if IVDW = 13
   * @see https://www.vasp.at/wiki/index.php/VDW_RADIUS
   */
  VDW_RADIUS?: number;

  /**
   * Damping-function parameter of vdW methods: the scaling s6 of the
   * dipole-dipole dispersion for DFT-D2, DFT-D3 (IVDW = 11, 12, 15), DFT-D4,
   * DFT-ulg and Tkatchenko-Scheffler (IVDW = 2, 21); the steepness factor a0
   * for dDsC (IVDW = 4). Settable for IVDW = 11/12 since VASP 6.6.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_S6
   */
  VDW_S6?: number;

  /**
   * Scaling s8 of the dipole-quadrupole dispersion for DFT-D3
   * (IVDW = 11, 12, 15) and DFT-D4 (IVDW = 13).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_S8
   */
  VDW_S8?: number;

  /**
   * VDW_S9 sets the contribution of the three-body term to the dispersion
   * energy.
   * @default 1 if IVDW=13 (DFT-D4 package); 0 if IVDW=15 (simple DFT-D3
   * package); 0 if IVDW=11 or 12 (cannot be changed)
   * @see https://www.vasp.at/wiki/index.php/VDW_S9
   */
  VDW_S9?: number;

  /**
   * Damping-function parameter of vdW methods: radii scaling s_r,6 of the
   * DFT-D3 zero damping (IVDW = 11, or 15 with zero/mzero damping); radii
   * scaling s_R for Tkatchenko-Scheffler (IVDW = 2, 21); radii scaling β for
   * MBD (IVDW = 202, 263); TT-damping factor b0 for dDsC (IVDW = 4).
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_SR
   */
  VDW_SR?: number;

  /**
   * VDW_SR8 sets the radii scaling s_r,8 in the dipole-quadrupole zero-damping
   * function of the DFT-D3 method.
   * Available as of VASP 6.6.0.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/VDW_SR8
   */
  VDW_SR8?: number;

  /**
   * Determines whether the ionic velocities are written to the vaspout.h5 file
   * during an MD run.
   * @default false
   * @see https://www.vasp.at/wiki/index.php/VELOCITY
   */
  VELOCITY?: boolean;

  /**
   * Determines whether Vosko-Wilk-Nusair interpolation is used or not.
   * Values: 0, 1.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/VOSKOWN
   */
  VOSKOWN?: number;

  /**
   * WANNIER90_WIN sets the content of the wannier90.win file.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/WANNIER90_WIN
   */
  WANNIER90_WIN?: string;

  /**
   * Weight factor for each step in the Broyden mixing scheme (`IMIX = 4`):
   * - `> 0`: all weights equal to WC (Pulay mixing)
   * - `0`: Broyden's 2nd method
   * - `< 0`: automatic weights (test only, not recommended)
   * @default 1000.
   * @see https://www.vasp.at/wiki/index.php/WC
   */
  WC?: number;

  /**
   * WEIMIN specifies the maximum weight for a band to be considered empty.
   * @default 0.001 for IBRION≥0; 0 for IBRION=−1
   * @see https://www.vasp.at/wiki/index.php/WEIMIN
   */
  WEIMIN?: number;

  /**
   * Select which densities associated to the local potential are written as a
   * post-processing step.
   * Available as of VASP 6.6.0.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/WRT_DENSITY
   */
  WRT_DENSITY?: string;

  /**
   * Allows to write the NMR current response in atomic units to file.
   * Values: 0, 1, 2, 3, 4.
   * Available as of VASP 6.6.0.
   * @default 0
   * @see https://www.vasp.at/wiki/index.php/WRT_NMRCUR
   */
  WRT_NMRCUR?: number;

  /**
   * Select which component of the local potential to be written as a post-
   * processing step.
   * @default None
   * @see https://www.vasp.at/wiki/index.php/WRT_POTENTIAL
   */
  WRT_POTENTIAL?: string;

  /**
   * Specifies a combination of exchange-correlation functionals.
   * @default GGA if the GGA tag is used; METAGGA if the METAGGA tag is used;
   * The functional specified by LEXCH in the POTCAR file if neither GGA nor
   * METAGGA is used
   * @see https://www.vasp.at/wiki/index.php/XC
   */
  XC?: string;

  /**
   * Multiplication factors for the components of the functional given by the
   * XC tag.
   * @default 1.0*NXC
   * @see https://www.vasp.at/wiki/index.php/XC_C
   */
  XC_C?: number[];

  /**
   * XCm_Pn, where m=1, 2, ldots and n=1, 2, ldots allows to modify the
   * parameters in a semilocal functional.
   * @default unset
   * @see https://www.vasp.at/wiki/index.php/XCm_Pn
   */
  [key: `XC${number}_P${number}`]: number;

  /**
   * Parameter Z_ab in the kernel of the nonlocal vdW-DF functional of Dion
   * et al. (the revised vdW-DF2 of Lee et al. uses -1.8867).
   * @default -0.8491
   * @see https://www.vasp.at/wiki/index.php/ZAB_VDW
   */
  ZAB_VDW?: number;
}
