import "../../tests/helpers/structureMatchers";
import { aiidaToCrystal } from "../../lib/io/aiida/StructureData";
import { crystalToAiida } from "../../lib/io/aiida/StructureData";

import { CrystalStructure } from "../../lib/main";
import { Site } from "../../lib/main";

import { aiidaObjects } from "../files/aiidaObjects";

describe("roundtrip tests", () => {
  test.each(aiidaObjects)("$name", ({ data }) => {
    const crystal = aiidaToCrystal(data);
    const back = crystalToAiida(crystal);
    const second = aiidaToCrystal(back);

    expect(crystal).toStructureNearlyEqual(second);
  });

  test.each(aiidaObjects)("preserves species consistency", ({ data }) => {
    const crystal = aiidaToCrystal(data);

    expect(crystal.species.length).toBe(
      new Set(data.kinds.map((k: any) => k.name)).size,
    );
  });
});

describe("validation and throws", () => {
  test("throws if cell is missing", () => {
    expect(() => aiidaToCrystal({ sites: [], kinds: [] } as any)).toThrow();
  });

  test("throws if cell is malformed", () => {
    expect(() =>
      aiidaToCrystal({
        cell: [
          [1, 0],
          [0, 1],
        ], // invalid
        kinds: [],
        sites: [],
      } as any),
    ).toThrow();
  });

  test("throws if sites missing", () => {
    expect(() =>
      aiidaToCrystal({
        cell: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        kinds: [],
      } as any),
    ).toThrow();
  });

  test("throws if unknown kind_name", () => {
    expect(() =>
      aiidaToCrystal({
        cell: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        kinds: [{ name: "Na", symbols: ["Na"] }],
        sites: [{ kind_name: "Cl", position: [0, 0, 0] }],
      } as any),
    ).toThrow();
  });

  const validBase = {
    cell: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    kinds: [{ name: "Na", symbols: ["Na"] }],
    sites: [{ kind_name: "Na", position: [0, 0, 0] }],
    pbc1: true,
    pbc2: true,
    pbc3: true,
  };

  test("throws if kinds is missing", () => {
    const bad = { ...validBase };
    delete (bad as any).kinds;

    expect(() => aiidaToCrystal(bad)).toThrow();
  });

  test("throws if kinds is not array", () => {
    const bad = { ...validBase, kinds: null };

    expect(() => aiidaToCrystal(bad)).toThrow();
  });

  test("throws if cell is malformed", () => {
    const bad = { ...validBase, cell: [[1, 0]] };

    expect(() => aiidaToCrystal(bad)).toThrow();
  });

  test("throws if sites missing", () => {
    const bad = { ...validBase };
    delete (bad as any).sites;

    expect(() => aiidaToCrystal(bad)).toThrow();
  });

  test("throws if unknown kind_name", () => {
    const bad = {
      ...validBase,
      sites: [{ kind_name: "Cl", position: [0, 0, 0] }],
    };

    expect(() => aiidaToCrystal(bad)).toThrow();
  });

  test("throws if unknown element symbol exists", () => {
    const crystal = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["Xx"], // fake element
      sites: [new Site(0, [0, 0, 0])],
    });

    expect(() => crystalToAiida(crystal)).toThrow();
  });

  test("throws on invalid speciesIndex", () => {
    const crystal = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["Na"],
      sites: [new Site(5, [0, 0, 0])], // invalid index
    });

    expect(() => crystalToAiida(crystal)).toThrow();
  });
});
