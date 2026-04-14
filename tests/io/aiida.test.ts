import "../../tests/helpers/structureMatchers";
import { aiidaToStructure } from "../../lib/io/aiida/StructureData";
import { structureToAiida } from "../../lib/io/aiida/StructureData";

import { CrystalStructure } from "../../lib/main";
import { Site } from "../../lib/main";

import { aiidaObjects } from "../files/aiidaObjects";

describe("roundtrip tests", () => {
  test.each(aiidaObjects)("$name", ({ data }) => {
    const crystal = aiidaToStructure(data);
    const back = structureToAiida(crystal);
    const second = aiidaToStructure(back);

    expect(crystal).toStructureNearlyEqual(second);
  });

  test.each(aiidaObjects)("preserves species consistency", ({ data }) => {
    const crystal = aiidaToStructure(data);

    expect(crystal.species.length).toBe(
      new Set(data.kinds.map((k: any) => k.name)).size,
    );
  });
});

describe("validation and throws", () => {
  test("throws if cell is missing", () => {
    expect(() => aiidaToStructure({ sites: [], kinds: [] } as any)).toThrow();
  });

  test("throws if cell is malformed", () => {
    expect(() =>
      aiidaToStructure({
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
      aiidaToStructure({
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
      aiidaToStructure({
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

    expect(() => aiidaToStructure(bad)).toThrow();
  });

  test("throws if kinds is not array", () => {
    const bad = { ...validBase, kinds: null };

    expect(() => aiidaToStructure(bad)).toThrow();
  });

  test("throws if cell is malformed", () => {
    const bad = { ...validBase, cell: [[1, 0]] };

    expect(() => aiidaToStructure(bad)).toThrow();
  });

  test("throws if sites missing", () => {
    const bad = { ...validBase };
    delete (bad as any).sites;

    expect(() => aiidaToStructure(bad)).toThrow();
  });

  test("throws if unknown kind_name", () => {
    const bad = {
      ...validBase,
      sites: [{ kind_name: "Cl", position: [0, 0, 0] }],
    };

    expect(() => aiidaToStructure(bad)).toThrow();
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

    expect(() => structureToAiida(crystal)).toThrow();
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

    expect(() => structureToAiida(crystal)).toThrow();
  });
});
