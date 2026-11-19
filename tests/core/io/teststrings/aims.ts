// FHI-aims geometry.in fixtures.

/** Si diamond, fractional coordinates, comments. */
export const siFracAims = `# Si, diamond structure
lattice_vector   0.0000  2.7150  2.7150
lattice_vector   2.7150  0.0000  2.7150
lattice_vector   2.7150  2.7150  0.0000
atom_frac 0.00 0.00 0.00 Si
atom_frac 0.25 0.25 0.25 Si   # second atom
`;

/** NaCl rock salt (cubic cell), Cartesian coordinates. */
export const naclAims = `lattice_vector 5.64 0.00 0.00
lattice_vector 0.00 5.64 0.00
lattice_vector 0.00 0.00 5.64
atom 0.00 0.00 0.00 Na
atom 2.82 2.82 2.82 Cl
`;

/** A water molecule: no lattice vectors. */
export const waterAims = `atom  0.0000  0.0000  0.1173 O
atom  0.0000  0.7572 -0.4692 H
atom  0.0000 -0.7572 -0.4692 H
`;

/** Per-atom keywords and a non-element species name. */
export const fe2Aims = `lattice_vector 2.87 0 0
lattice_vector 0 2.87 0
lattice_vector 0 0 2.87
atom 0 0 0 Fe_up
    initial_moment 2.0
    constrain_relaxation .true.
atom 1.435 1.435 1.435 Fe
    initial_moment -2.0
    initial_charge 0.1
    constrain_relaxation z
    velocity 0 0 0
`;
