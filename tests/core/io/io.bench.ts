import { bench, describe } from "vitest";
import { supercell } from "@/core/structure/operations/supercell";
import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";
import { fromXYZ, toXYZ } from "@/core/io/xyz";
import { fromCIF, toCIF } from "@/core/io/cif";
import { fromXSF, toXSF } from "@/core/io/xsf";

const small = fromPOSCAR(`NaCl
1.0
5.6402 0.0000 0.0000
0.0000 5.6402 0.0000
0.0000 0.0000 5.6402
Na Cl
1 1
Direct
0.0 0.0 0.0
0.5 0.5 0.5
`);

const large = supercell(small, 20);

const poscarStr = toPOSCAR(large);
const xyzStr = toXYZ(large);
const cifStr = toCIF(large);
const xsfStr = toXSF(large);

const sizes = [
  ["POSCAR", poscarStr],
  ["XYZ", xyzStr],
  ["CIF", cifStr],
  ["XSF", xsfStr],
] as const;

for (const [name, text] of sizes) {
  describe(`io parse round-trip: ${name} (${large.sites.length} sites)`, () => {
    bench(`from${name}`, () => {
      switch (name) {
        case "POSCAR":
          fromPOSCAR(text);
          break;
        case "XYZ":
          fromXYZ(text);
          break;
        case "CIF":
          fromCIF(text);
          break;
        case "XSF":
          fromXSF(text);
          break;
      }
    });
  });
}
