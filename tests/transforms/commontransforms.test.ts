import { CrystalStructure } from "../../lib/io/crystal";
import { Site, CartesianCoords } from "../../lib/io/common";

const structures = [
  {
    name: "Rock Salt NaCl",
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as CartesianCoords[],
    species: ["Na", "Cl"],
    sites: [new Site(0, [0, 0, 0]), new Site(1, [0.5, 0.5, 0.5])],
  },
  {
    name: "Diamond",
    lattice: [
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
    ] as CartesianCoords[],
    species: ["C"],
    sites: [new Site(0, [0, 0, 0]), new Site(0, [0.25, 0.25, 0.25])],
  },
  {
    name: "Cesium Chloride",
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as CartesianCoords[],
    species: ["Cs", "Cl"],
    sites: [new Site(0, [0, 0, 0]), new Site(1, [0.5, 0.5, 0.5])],
  },
  {
    name: "Simple Cubic A",
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as CartesianCoords[],
    species: ["A"],
    sites: [new Site(0, [0, 0, 0])],
  },
  {
    name: "Binary AB",
    lattice: [
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 3],
    ] as CartesianCoords[],
    species: ["A", "B"],
    sites: [new Site(0, [0, 0, 0]), new Site(1, [0.5, 1, 1.5])],
  },
];

structures.forEach(({ name, lattice, species, sites }) => {
  describe(`CrystalStructure dynamic site/species tests — ${name}`, () => {
    let cs: CrystalStructure;

    beforeEach(() => {
      cs = new CrystalStructure({ lattice, species, sites: [...sites] });
    });

    test("addSite with existing species works", () => {
      cs.addSite(species[0], [0.1, 0.2, 0.3]);
      expect(cs.sites.length).toBe(sites.length + 1);
      expect(cs.sites[cs.sites.length - 1].speciesIndex).toBe(0);
    });

    test("addSite with new species adds to species array", () => {
      cs.addSite("Xx", [0.2, 0.3, 0.4]);
      expect(cs.sites.length).toBe(sites.length + 1);
      expect(cs.species).toContain("Xx");
      const idx = cs.species.indexOf("Xx");
      expect(cs.sites[cs.sites.length - 1].speciesIndex).toBe(idx);
    });

    test("removeSite updates species array when unused", () => {
      cs.addSite("Yy", [0, 0, 0]);
      const newSpeciesIndex = cs.species.indexOf("Yy");
      cs.removeSite(cs.sites.length - 1);
      expect(cs.species).not.toContain("Yy");

      // Ensure other sites indices are unchanged
      cs.sites.forEach((site) => {
        expect(site.speciesIndex).toBeLessThan(cs.species.length);
      });
    });

    test("replaceSite keeps site coordinates and updates species", () => {
      const oldCart = [...cs.sites[0].cart];
      cs.replaceSite(0, species[species.length - 1]);
      expect(cs.sites[0].cart).toEqual(oldCart);
      const idx = cs.species.indexOf(species[species.length - 1]);
      expect(cs.sites[0].speciesIndex).toBe(idx);
    });

    test("replaceSite with new species adds it", () => {
      cs.replaceSite(0, "Zz");
      const idx = cs.species.indexOf("Zz");
      expect(cs.species).toContain("Zz");
      expect(cs.sites[0].speciesIndex).toBe(idx);
    });

    test("removeSite throws on out-of-bounds", () => {
      expect(() => cs.removeSite(100)).toThrow("out of bounds");
    });

    test("replaceSite throws on out-of-bounds", () => {
      expect(() => cs.replaceSite(100, "A")).toThrow("siteIndex out of bounds");
    });
  });
});
