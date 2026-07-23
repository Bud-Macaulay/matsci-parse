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

// ---------------------------------------------------------------------------
// Real-world entries from CP2K's GTH_POTENTIALS file
// Source: https://github.com/cp2k/cp2k/blob/master/data/GTH_POTENTIALS
// ---------------------------------------------------------------------------

/** Real Hydrogen GTH-PBE entry from CP2K (no non-local projectors). */
export const realHGthPbe = [
  "H GTH-PBE-q1 GTH-PBE",
  "    1",
  "     0.20000000    2    -4.17890044     0.72446331",
  "    0",
].join("\n");

/** Real Helium GTH-PBE entry from CP2K (no non-local projectors). */
export const realHeGthPbe = [
  "He GTH-PBE-q2 GTH-PBE",
  "    2",
  "     0.20000000    2    -9.12214383     1.70270770",
  "    0",
].join("\n");

/** Real Carbon GTH-PBE entry from CP2K (s and p projectors). */
export const realCGthPbe = [
  "C GTH-PBE-q4 GTH-PBE",
  "    2    2",
  "     0.33847124    2    -8.80367398     1.33921085",
  "    2",
  "     0.30257575    1     9.62248665",
  "     0.29150694    0",
].join("\n");

/** Real Nitrogen GTH-PBE entry from CP2K (s and p projectors). */
export const realNGthPbe = [
  "N GTH-PBE-q5 GTH-PBE",
  "    2    3",
  "     0.28379051    2   -12.41522559     1.86809592",
  "    2",
  "     0.25540500    1    13.63026257",
  "     0.24549453    0",
].join("\n");

/** Real Oxygen GTH-PBE entry from CP2K (s and p projectors). */
export const realOGthPbe = [
  "O GTH-PBE-q6 GTH-PBE",
  "    2    4",
  "     0.24455430    2   -16.66721480     2.48731132",
  "    2",
  "     0.22095592    1    18.33745811",
  "     0.21133247    0",
].join("\n");

/** Multi-element GTH file: H, He, C (first 3 entries of GTH_POTENTIALS). */
export const realMultiGth = [
  "H GTH-PBE-q1 GTH-PBE",
  "    1",
  "     0.20000000    2    -4.17890044     0.72446331",
  "    0",
  "#",
  "He GTH-PBE-q2 GTH-PBE",
  "    2",
  "     0.20000000    2    -9.12214383     1.70270770",
  "    0",
  "#",
  "C GTH-PBE-q4 GTH-PBE",
  "    2    2",
  "     0.33847124    2    -8.80367398     1.33921085",
  "    2",
  "     0.30257575    1     9.62248665",
  "     0.29150694    0",
].join("\n");
