export const classicXyz = `
2
NaCl molecule
Na 0 0 0
Cl 1.5 1.5 1.5
`;

export const extendedXyz = `
2
Lattice="3 0 0 0 3 0 0 0 3" Properties=species:S:1:pos:R:3
Na 0 0 0
Cl 1.5 1.5 1.5
`;

export const extendedXyzSelective = `
2
Lattice="3 0 0 0 3 0 0 0 3" Properties=species:S:1:pos:R:3:selectiveDynamics:L:3
Na 0 0 0 T T F
Cl 1.5 1.5 1.5 F F F
`;
