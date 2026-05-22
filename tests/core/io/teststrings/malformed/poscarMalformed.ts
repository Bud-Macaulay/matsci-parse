export const wrongLattice = `NaCl
1.0
3.0 0.0
0.0 3.0 0.0
0.0 0.0 3.0
Na Cl
1 1
Cartesian
0.0 0.0 0.0
1.5 1.5 1.5
`;

export const blankFirstLine = `
NaCl
1.0
3.0 0.0
0.0 3.0 0.0
0.0 0.0 3.0
Na Cl
1 1
Cartesian
0.0 0.0 0.0
1.5 1.5 1.5
`;

export const InvalidLineCount = `NaCl
1.0
3.0 0.0 0.0
0.0 3.0 0.0
0.0 0.0 3.0
FAKEINSERTEDLINE
Na Cl
1 1
Cartesian
0.0 0.0 0.0
1.5 1.5 1.5
`;
