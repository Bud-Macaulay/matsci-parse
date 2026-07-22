/**
 * Minimal GTH test fixtures.
 *
 * Hand-crafted minimal GTH_POTENTIALS entries for unit testing.
 * Based on the GTH/PBE format.
 */

/** Minimal Hydrogen GTH entry (no non-local projectors). */
export const hGth = `# H  GTH-PBE-q1
 H  GTH-PBE  H
 1  0
 0.2000000000000000  1  -1.0000000000000000
 0
`;

/** Minimal Carbon GTH entry (s and p projectors). */
export const cGth = `# C  GTH-PBE-q4
 C  GTH-PBE  C
 2  2
 0.3500000000000000  2  -4.2000000000000000  2.1000000000000000
 2
 0.3000000000000000  1
 -1.2000000000000000
 0.3500000000000000  1
 -0.8000000000000000
`;

/** Two-element GTH file (H and C). */
export const multiGth = `# GTH pseudopotentials
 H  GTH-PBE-q1
 1  0
 0.2000000000000000  1  -1.0000000000000000
 0
 C  GTH-PBE-q4
 2  2
 0.3500000000000000  2  -4.2000000000000000  2.1000000000000000
 2
 0.3000000000000000  1
 -1.2000000000000000
 0.3500000000000000  1
 -0.8000000000000000
`;
