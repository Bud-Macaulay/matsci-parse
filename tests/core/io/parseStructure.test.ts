import { describe, it, expect } from "vitest";

import { parseStructure, type StructureFormat } from "@/core/io";
import { fromCIF } from "@/core/io/cif";
import { toJSON } from "@/core/io/json";
import { toPymatgen } from "@/core/io/pymatgen";
import { toASE } from "@/core/io/ase";
import { toOptimade } from "@/core/io/optimade";
import { toStructureData } from "@/core/io/structuredata";
import type { Structure } from "@/core/structure/structure";

import { rockSaltCif, diamondCif, liCoO2Cif } from "./cif/teststrings/cif";
import { simplePoscar, selectiveDynamicsPoscar } from "./teststrings/poscar";
import { simpleXsf, XsfNumbers } from "./teststrings/xsf";
import { extendedXyz } from "./teststrings/xyz";
import { siPw, testPw, ibravFcc } from "./teststrings/pw";
import { pdbExample, pdbExample2 } from "./teststrings/pdb";
import { gromacs, largeGromacs } from "./teststrings/gro";

const TEXT_FIXTURES: [string, StructureFormat, string][] = [
  ["rockSaltCif", "cif", rockSaltCif],
  ["diamondCif", "cif", diamondCif],
  ["liCoO2Cif", "cif", liCoO2Cif],
  ["simplePoscar", "poscar", simplePoscar],
  ["selectiveDynamicsPoscar", "poscar", selectiveDynamicsPoscar],
  ["simpleXsf", "xsf", simpleXsf],
  ["XsfNumbers", "xsf", XsfNumbers],
  ["extendedXyz", "xyz", extendedXyz],
  ["siPw", "pw", siPw],
  ["testPw", "pw", testPw],
  ["ibravFcc", "pw", ibravFcc],
  ["pdbExample", "pdb", pdbExample],
  ["pdbExample2", "pdb", pdbExample2],
  ["gromacs", "gro", gromacs],
  ["largeGromacs", "gro", largeGromacs],
];

const EXTENSION: Record<string, string> = {
  cif: "cif",
  poscar: "vasp",
  xsf: "xsf",
  xyz: "xyz",
  pw: "in",
  pdb: "pdb",
  gro: "gro",
};

describe("parseStructure: text formats", () => {
  for (const [name, format, text] of TEXT_FIXTURES) {
    it(`infers ${name} as ${format} from its content`, () => {
      const parsed = parseStructure(text);
      expect(parsed.format).toBe(format);
      expect(parsed.structure.sites.length).toBeGreaterThan(0);
    });

    it(`reads ${name} with a matching file name`, () => {
      const parsed = parseStructure(text, { fileName: `x.${EXTENSION[format]}` });
      expect(parsed.format).toBe(format);
    });

    it(`falls back to inference when ${name} has a wrong extension`, () => {
      const wrong = format === "cif" ? "x.xyz" : "x.cif";
      expect(parseStructure(text, { fileName: wrong }).format).toBe(format);
    });

    it(`falls back to inference when ${name} has a wrong format hint`, () => {
      const wrong = format === "poscar" ? "xsf" : "poscar";
      expect(parseStructure(text, { format: wrong }).format).toBe(format);
    });
  }

  it("reads VASP file names without an extension", () => {
    const parsed = parseStructure(simplePoscar, { fileName: "dir/CONTCAR_relaxed", strict: true });
    expect(parsed.format).toBe("poscar");
  });

  it("accepts aliases and any case as the format hint", () => {
    expect(parseStructure(simplePoscar, { format: "VASP" }).format).toBe("poscar");
    expect(parseStructure(siPw, { format: "pwi" }).format).toBe("pw");
  });

  it("ignores an unknown format hint", () => {
    expect(parseStructure(simpleXsf, { format: "nonsense" }).format).toBe("xsf");
  });

  it("tolerates Windows line endings", () => {
    expect(parseStructure(simplePoscar.replace(/\n/g, "\r\n")).format).toBe("poscar");
  });
});

describe("parseStructure: JSON formats", () => {
  const structure = fromCIF(rockSaltCif) as Structure;
  const docs: [StructureFormat, unknown][] = [
    ["json", toJSON(structure)],
    ["pymatgen", toPymatgen(structure)],
    ["ase", toASE(structure)],
    ["optimade", toOptimade(structure)],
    ["optimade", { data: toOptimade(structure) }],
    ["optimade", { data: [toOptimade(structure)] }],
    ["aiida", toStructureData(structure)],
  ];

  for (const [format, doc] of docs) {
    it(`infers ${format} (${JSON.stringify(doc).slice(0, 30)}...)`, () => {
      const text = JSON.stringify(doc);
      const parsed = parseStructure(text, { fileName: "structure.json" });
      expect(parsed.format).toBe(format);
      expect(parsed.structure.sites.length).toBe(structure.sites.length);
      for (let i = 0; i < structure.sites.length; i++) {
        for (let k = 0; k < 3; k++) {
          const a = parsed.structure.sites[i].frac[k];
          const b = structure.sites[i].frac[k];
          // fractional coordinates may wrap by a whole cell
          expect(Math.abs(((a - b + 0.5) % 1) - 0.5)).toBeLessThan(1e-6);
        }
      }
    });
  }
});

describe("parseStructure: strict", () => {
  it("reads the hinted format", () => {
    expect(parseStructure(simplePoscar, { format: "vasp", strict: true }).format).toBe("poscar");
    expect(parseStructure(simplePoscar, { fileName: "POSCAR", strict: true }).format).toBe("poscar");
  });

  it("does not fall back when the hinted format fails", () => {
    expect(() => parseStructure(simplePoscar, { format: "cif", strict: true })).toThrow(/Tried cif: /);
  });

  it("prefers the format hint over the file name", () => {
    expect(parseStructure(simpleXsf, { format: "xsf", fileName: "x.cif", strict: true }).format).toBe("xsf");
  });

  it("rejects an unknown hint instead of inferring", () => {
    expect(() => parseStructure(simpleXsf, { format: "nonsense", strict: true })).toThrow(
      /Unknown structure format 'nonsense'/,
    );
    expect(() => parseStructure(simpleXsf, { strict: true })).toThrow(/Unknown structure format/);
  });
});

describe("parseStructure: failures", () => {
  it("rejects text in no known format", () => {
    expect(() => parseStructure("hello\nworld\n")).toThrow(/Unrecognised structure format/);
  });

  it("rejects JSON that is not a structure", () => {
    expect(() => parseStructure('{"foo": 1}')).toThrow(/Unrecognised structure format/);
  });

  it("lists every format tried and why it failed", () => {
    const broken = "data_broken\n_cell_length_a 3\n";
    expect(() => parseStructure(broken, { fileName: "x.vasp" })).toThrow(
      /Tried poscar: .*; cif: /,
    );
  });

  it("does not accept a parse without atoms", () => {
    const empty = "data_empty\n_cell_length_a 3\n_cell_length_b 3\n_cell_length_c 3\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\n";
    expect(() => parseStructure(empty)).toThrow(/cif: /);
  });
});
