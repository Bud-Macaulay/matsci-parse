export const extendedXyz = `
2
Lattice="3 1 0.5 0 3 0 0 0 3" Properties=species:S:1:pos:R:3
Na 0 0 0
Cl 1.5 1.5 1.5
`;

export const extendedXyzSelective = `
2
Lattice="3 0 0 0 3 0 0 0 3" Properties=species:S:1:pos:R:3:selectiveDynamics:L:3
Na 0 0 0 T T F
Cl 1.5 1.5 1.5 F F F
`;

export const extendedXyzSimpleCubic = `
2
Lattice="3 0 0 0 3 0 0 0 3" Properties=species:S:1:pos:R:3
Si 0 0 0
Si 1.5 1.5 1.5
`;

export const extendedXyzOrthorhombic = `
4
Lattice="4 0 0 0 2.5 0 0 0 6" Properties=species:S:1:pos:R:3
Al 0 0 0
Al 2 1.2 3
Al 3 2.4 4.5
Al 1 0.5 2
`;
