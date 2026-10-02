import { describe, it, expect } from "vitest";

import {
  PeriodicTable,
  getElement,
  SymbolToAtomicNumber,
  elementGroups,  getElementGroup,
  getElementPeriod,
  getElementBlock,
  getElementCategory,
  getElectronConfiguration,
  getElectronConfigSemantic,
  electronShells,
  getElectronShells,
  electronegativity,
  getElementAbundance,
  getIonizationEnergy,
  getElectronAffinity,
  getAtomicRadius,
  getCovalentRadius,
  getDensity,
  getMeltingPoint,
  getBoilingPoint,
  getMolarHeat,
  getElementPhase,
  getDiscoveryYear,
  getDiscoverer,
  getElementGroupBlock,
  parseSpeciesSymbol,
  elementSymbolOf,
  atomicNumberOf,
  sortSpeciesPtOrder,
  getElementDetails,
  getXrayScatteringParams,
  getNeutronScatteringLength,
  ATOMIC_SCATTERING_PARAMS,
  NEUTRON_SCATTERING_LENGTHS,
} from "@/core/data/periodictable";

describe("periodic table core data", () => {
  it("covers all 118 elements", () => {
    expect(Object.keys(PeriodicTable)).toHaveLength(118);
  });

  it("stays minimal (number, symbol, name, mass only)", () => {
    expect(getElement("Fe")).toEqual({
      atomicNumber: 26,
      symbol: "Fe",
      name: "Iron",
      mass: 55.845,
    });
    // Values mirror mc-periodic-table (the source of truth).
    expect(getElement("Al")).toMatchObject({ name: "Aluminium" });
    expect(getElement("H")).toMatchObject({ mass: 1.00794 });
    expect(getElement("Xx")).toBeUndefined();
    expect(SymbolToAtomicNumber.get("Si")).toBe(14);
  });
});

describe("per-field property modules", () => {
  it("exposes structural fields per element", () => {
    expect(getElementGroup("Fe")).toBe(8);
    // mc-periodic-table groups the whole f-block as group 3.
    expect(getElementGroup("U")).toBe(3);
    expect(getElementGroup("Xx")).toBeUndefined();
    expect(getElementPeriod("Fe")).toBe(4);
    expect(getElementBlock("Fe")).toBe("d");
    expect(getElementBlock("La")).toBe("f");
    expect(getElementCategory("Fe")).toBe("transition metal");
    expect(getElementCategory("H")).toBe("diatomic nonmetal");
    expect(getElementCategory("C")).toBe("polyatomic nonmetal");
    expect(getElectronConfiguration("Fe")).toBe(
      "1s2 2s2 2p6 3s2 3p6 4s2 3d6",
    );
    expect(getElectronConfigSemantic("Fe")).toBe("[Ar] 3d6 4s2");
    expect(getElectronShells("Fe")).toEqual([2, 8, 14, 2]);
    expect(electronegativity["O"]).toBe(3.44);
    expect(electronegativity["Am"]).toBe(1.3);
    expect(electronegativity["Kr"]).toBe(3.0);
  });

  it("exposes numeric and provenance fields per element", () => {
    expect(getElementAbundance("Fe")).toBe(63000);
    expect(getElementAbundance("Og")).toBeNull();
    expect(getIonizationEnergy("H")).toBe(13.598);
    expect(getElectronAffinity("H")).toBe(0.754);
    expect(getAtomicRadius("H")).toBe(120);
    expect(getCovalentRadius("H")).toBe(0.31);
    expect(getDensity("Fe")).toBe(7.874);
    expect(getMeltingPoint("Fe")).toBe(1811);
    expect(getBoilingPoint("Fe")).toBe(3134);
    expect(getMolarHeat("Fe")).toBe(25.1);
    expect(getElementPhase("Fe")).toBe("Solid");
    expect(getElementPhase("Hg")).toBe("Liquid");
    expect(getDiscoveryYear("H")).toBe(1766);
    expect(getDiscoveryYear("Fe")).toBeNull();
    expect(getDiscoverer("H")).toBe("Henry Cavendish");
    expect(getElementGroupBlock("Fe")).toBe("Transition metal");
  });

  it("covers every element with shells summing to Z", () => {
    for (const el of Object.values(PeriodicTable)) {
      expect(elementGroups[el.symbol]).not.toBeUndefined();

      const shells = electronShells[el.symbol] as readonly number[];
      const total = shells.reduce((a, b) => a + b, 0);

      expect(total).toBe(el.atomicNumber);
    }
  });
});

describe("element details join", () => {
  it("joins core and property fields, tolerating isotopes", () => {
    expect(getElementDetails("Fe")).toEqual({
      atomicNumber: 26,
      symbol: "Fe",
      name: "Iron",
      mass: 55.845,
      group: 8,
      period: 4,
      block: "d",
      category: "transition metal",
      electronConfiguration: "1s2 2s2 2p6 3s2 3p6 4s2 3d6",
      electronConfigSemantic: "[Ar] 3d6 4s2",
      shells: [2, 8, 14, 2],
      electronegativity: 1.83,
      abundance: 63000,
      ionizationEnergy: 7.902,
      electronAffinity: 0.163,
      atomicRadius: 194,
      covalentRadius: 1.52,
      density: 7.874,
      meltingPoint: 1811,
      boilingPoint: 3134,
      molarHeat: 25.1,
      phase: "Solid",
      discoveryYear: null,
      discoverer: "5000 BC",
      groupBlock: "Transition metal",
    });
    expect(getElementDetails("13C")?.symbol).toBe("C");
    expect(getElementDetails("Xx")).toBeUndefined();
  });
});

describe("species symbols and PT ordering", () => {
  it("parses elements, isotopes, and hydrogen aliases", () => {
    expect(parseSpeciesSymbol("Fe")).toMatchObject({
      element: "Fe",
      atomicNumber: 26,
    });
    expect(parseSpeciesSymbol("Fe").massNumber).toBeUndefined();
    expect(parseSpeciesSymbol("13C")).toMatchObject({
      element: "C",
      massNumber: 13,
      atomicNumber: 6,
    });
    expect(parseSpeciesSymbol("D")).toMatchObject({
      element: "H",
      massNumber: 2,
      atomicNumber: 1,
    });
    expect(parseSpeciesSymbol("T")).toMatchObject({
      element: "H",
      massNumber: 3,
      atomicNumber: 1,
    });
    expect(parseSpeciesSymbol("Xx").atomicNumber).toBeUndefined();
  });

  it("sorts symbols into periodic-table order", () => {
    expect(sortSpeciesPtOrder(["Si", "O", "H"])).toEqual(["H", "O", "Si"]);
    expect(sortSpeciesPtOrder(["13C", "C", "12C"])).toEqual([
      "12C",
      "13C",
      "C",
    ]);
    // Unknown symbols sort after known elements.
    expect(sortSpeciesPtOrder(["Xx", "H"])).toEqual(["H", "Xx"]);
    expect(elementSymbolOf("13C")).toBe("C");
    expect(elementSymbolOf("D")).toBe("H");
    expect(atomicNumberOf("D")).toBe(1);
  });
});

describe("scattering resolvers", () => {
  it("resolves X-ray params with element fallback", () => {
    expect(getXrayScatteringParams("C")).toBe(ATOMIC_SCATTERING_PARAMS["C"]);
    expect(getXrayScatteringParams("13C")).toBe(ATOMIC_SCATTERING_PARAMS["C"]);
    expect(getXrayScatteringParams("Xx")).toBeUndefined();
  });

  it("resolves neutron lengths with isotope fallback", () => {
    expect(getNeutronScatteringLength("1H")).toBe(
      NEUTRON_SCATTERING_LENGTHS["1H"],
    );
    expect(getNeutronScatteringLength("D")).toBe(
      NEUTRON_SCATTERING_LENGTHS["2H"],
    );
    expect(getNeutronScatteringLength("14C")).toBe(
      NEUTRON_SCATTERING_LENGTHS["C"],
    );
    expect(getNeutronScatteringLength("Xx")).toBeUndefined();
  });
});
