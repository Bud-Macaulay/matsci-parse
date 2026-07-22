/**
 * Minimal PSP8 test fixtures.
 *
 * Hand-crafted minimal PSP8 (ABINIT format 8) files for unit testing.
 */

/**
 * Minimal Hydrogen PSP8 (5 mesh points, lmax=0, lloc=0).
 * lloc=0 means the single block is the local potential.
 * PSP8 format: after extension_switch, each block has a header line
 * (l value only for local, l + ekb for projectors), then mmax data lines.
 */
export const hPsp8 = `Hydrogen PSP8 test
     1.00000     1.00000     0.00000
     8    11     0     0     5     0
 0.00000000  0.00000000  0.00000000
 1
     0
     0
     1  0.000000000000000E+000 -1.500000000000000E+000
     2  5.000000000000000E-001 -6.000000000000000E-001
     3  1.000000000000000E+000 -3.000000000000000E-001
     4  1.500000000000000E+000 -1.500000000000000E-001
     5  2.000000000000000E+000 -7.500000000000000E-002
`;

/**
 * Minimal Carbon PSP8 (5 mesh points, lmax=1, lloc=1, 1 s-projector).
 * lloc=1 means the p block is the local potential.
 * s-block is a projector block with ekb.
 * Block order: l=0 projector (nproj=1, ekb=-2.5), then l=1 local.
 */
export const cPsp8 = `Carbon PSP8 test
     6.00000     4.00000     0.00000
     8    11     1     1     5     0
 0.00000000  0.00000000  0.00000000
 1 0
     0
     0  -2.500000000000000E+000
     1  0.000000000000000E+000  1.000000000000000E+000
     2  5.000000000000000E-001  2.000000000000000E+000
     3  1.000000000000000E+000  1.500000000000000E+000
     4  1.500000000000000E+000  8.000000000000000E-001
     5  2.000000000000000E+000  3.000000000000000E-001
     1
     1  0.000000000000000E+000 -1.200000000000000E+001
     2  5.000000000000000E-001 -4.500000000000000E+000
     3  1.000000000000000E+000 -2.000000000000000E+000
     4  1.500000000000000E+000 -9.000000000000000E-001
     5  2.000000000000000E+000 -3.600000000000000E-001
`;
