// Quantum ESPRESSO K_POINTS cards
export const qeAutomatic = `
K_POINTS automatic
4 4 4 0 0 0
`;

export const qeGamma = `
K_POINTS gamma
`;

export const qeCrystal = `
K_POINTS crystal
4
0.000000 0.000000 0.000000 1.000000
0.500000 0.000000 0.000000 1.000000
0.500000 0.500000 0.000000 1.000000
0.500000 0.500000 0.500000 1.000000
`;

export const qeTpiba = `
K_POINTS tpiba
2
0.0000000 0.0000000 0.0000000 1.0000000
0.2500000 0.2500000 0.2500000 1.0000000
`;

export const qeTpibaBands = `
K_POINTS tpiba_b
20
0.0000 0.0000 0.0000 1.0
0.5000 0.0000 0.0000 1.0
0.5000 0.5000 0.0000 1.0
0.5000 0.5000 0.5000 1.0
`;

export const qeCrystalBands = `
K_POINTS crystal_b
15
0.0000 0.0000 0.0000 1.0
0.5000 0.5000 0.0000 1.0
0.5000 0.5000 0.5000 1.0
`;

export const qeCrystalCovering = `
K_POINTS crystal_c
2
0.0000 0.0000 0.0000 1.0
0.5000 0.5000 0.5000 1.0
`;

export const qeInFile = `
&CONTROL
  calculation = 'scf'
  prefix = 'si'
/
&SYSTEM
  ibrav = 0
  nat = 2
  ntyp = 1
  ecutwfc = 30
/
&ELECTRONS
  conv_thr = 1e-8
/
K_POINTS automatic
6 6 6 1 1 1

CELL_PARAMETERS angstrom
5.431 0.000 0.000
0.000 5.431 0.000
0.000 0.000 5.431

ATOMIC_POSITIONS crystal
Si 0.000000 0.000000 0.000000
Si 0.250000 0.250000 0.250000
`;

// VASP KPOINTS files
export const vaspGammaGrid = `Automatic mesh
0
Gamma
4 4 4
0 0 0
`;

export const vaspMPGrid = `Automatic generation
0
Monkhorst-pack
 4 4 4
 0 0 0
`;

export const vaspList = `K-points list
4
Reciprocal
0 0 0 1
0 0 0.5 1
0 0.5 0.5 2
0.5 0.5 0.5 4
`;

export const vaspCartesianList = `
Cartesian list
2
Cartesian
0 0 0 1
0.1 0.2 0.3 2
`;

export const vaspLineMode = `
Band structure
40
Line-mode
Reciprocal
0 0 0 G
0.5 0.5 0 X

0.5 0.5 0 X
0.5 0.75 0.25 W
`;

// Real-world VASP KPOINTS files (VASP wiki examples). Note that the regular
// meshes below omit the optional fifth (shift) line.
export const vaspRealGamma = `Gamma centered
0
Gamma
4 4 4
`;

export const vaspRealMonkhorst = `Monkhorst-Pack
0
Monkhorst
4 4 4
`;

export const vaspRealAutomatic = `Fully automatic
0
Automatic
4
`;

export const vaspRealCartesian = `Explicit Cartesian
3
Cartesian
0.0 0.0 0.0 1
0.5 0.0 0.0 1
0.0 0.5 0.0 1
`;

export const vaspRealReciprocal = `Explicit reciprocal
3
Reciprocal
0.0 0.0 0.0 1
0.5 0.0 0.0 1
0.0 0.5 0.0 1
`;

// More real-world VASP KPOINTS files (formerly the kpoints_testdata corpus).
export const vaspGammaMesh1x1x1 = `Gamma 1x1x1
0
Gamma
1 1 1
`;

export const vaspGammaShifted = `Gamma shifted
0
Gamma
6 8 10
0.5 0.5 0.0
`;

export const vaspMPShifted = `Monkhorst Pack shifted
0
Monkhorst
5 7 9
0.5 0.5 0.5
`;

export const vaspLinePath = `Line mode reciprocal
20
Line_mode
Reciprocal
0.0 0.0 0.0 ! \\Gamma
0.5 -0.49999999999999994 0.5 ! P

0.5 -0.49999999999999994 0.5 ! P
0.5 -0.5 0.5 ! Z

0.5 -0.5 0.5 ! Z
0.5000000000000001 0.5000000000000001 0.5000000000000001 ! Q

0.5000000000000001 0.5000000000000001 0.5000000000000001 ! Q
0.0 0.0 0.0 ! \\Gamma

0.0 0.0 0.0 ! \\Gamma
0.5 -0.5 0.0 ! F

0.5 -0.5 0.0 ! F
0.49999999999999994 -0.5 -0.5 ! P_1

0.49999999999999994 -0.5 -0.5 ! P_1
0.4999999999999999 -0.5000000000000001 -0.5000000000000001 ! Q_1

0.4999999999999999 -0.5000000000000001 -0.5000000000000001 ! Q_1
0.5 0.0 0.0 ! L

0.5 0.0 0.0 ! L
0.5 -0.5 0.5 ! Z
`;

export const vaspListReciprocal = `Explicit reciprocal labeled
4
Reciprocal
0.0 0.0 0.0
0.5 0.0 0.0
0.0 0.5 0.0
0.0 0.0 0.5
`;

export const vaspListReciprocalWeighted = `Explicit reciprocal weighted
4
Reciprocal
0.0 0.0 0.0 2
0.5 0.0 0.0 1
0.0 0.5 0.0 1
0.0 0.0 0.5 1
`;

export const vaspListReciprocalWeightedLabeled = `Explicit reciprocal weighted labeled
4
Reciprocal
0.0 0.0 0.0 2 Gamma
0.5 0.0 0.0 1 X
0.0 0.5 0.0 1 Y
0.0 0.0 0.5 1 Z
`;

export const vaspListCartesian = `Explicit Cartesian labeled
4
Cartesian
0.0 0.0 0.0
0.5 0.0 0.0
0.0 0.5 0.0
0.0 0.0 0.5
`;

export const vaspListCartesianWeighted = `Explicit Cartesian weighted
4
Cartesian
0.0 0.0 0.0 2
0.5 0.0 0.0 1
0.0 0.5 0.0 1
0.0 0.0 0.5 1
`;

export const vaspTetrahedron = `Tetrahedron method
8
Reciprocal
0.0 0.0 0.0 1
0.5 0.0 0.0 1
0.0 0.5 0.0 1
0.0 0.0 0.5 1
0.5 0.5 0.0 1
0.5 0.0 0.5 1
0.0 0.5 0.5 1
0.5 0.5 0.5 1
Tetrahedron
1 1.000000
1.0 1 2 3 4
`;

export const vaspDensity1000 = `Automatic density
0
Gamma
7 7 7
`;

export const vaspDensity5000 = `Automatic density
0
Gamma
13 13 13
`;
