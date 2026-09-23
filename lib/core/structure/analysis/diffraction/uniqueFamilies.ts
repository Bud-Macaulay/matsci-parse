/** A unique Miller-index family with its multiplicity. */
export interface MillerFamily {
  hkl: number[];
  multiplicity: number;
}

function sortedAbs(hkl: readonly number[]): number[] {
  return hkl.map((v) => Math.abs(v)).sort((a, b) => a - b);
}

function isPermutation(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const sa = sortedAbs(a);
  const sb = sortedAbs(b);

  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) {
      return false;
    }
  }

  return true;
}

function lexicographicallyGreater(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i];
    }
  }

  return a.length > b.length;
}

/** Group Miller indices into unique families. Families must be permutations
 * of each other (same sorted absolute values).
 * @param hkls - Miller indices contributing to a single diffraction peak.
 * @returns Unique families with the lexicographically largest index as
 * representative and the family size as multiplicity. */
export function getUniqueFamilies(hkls: readonly (readonly number[])[]): MillerFamily[] {
  const groups: number[][][] = [];

  for (const hkl of hkls) {
    let found = false;

    for (const group of groups) {
      if (isPermutation(hkl, group[0])) {
        group.push([...hkl]);
        found = true;
        break;
      }
    }

    if (!found) {
      groups.push([[...hkl]]);
    }
  }

  return groups.map((group) => {
    let rep = group[0];

    for (let i = 1; i < group.length; i++) {
      if (lexicographicallyGreater(group[i], rep)) {
        rep = group[i];
      }
    }

    return { hkl: rep, multiplicity: group.length };
  });
}
