import { CrystalStructure } from "../crystal";
import { Site, CartesianCoords } from "../common";
import { elementBySymbol } from "../../AtomicData";

export function aiidaToStructure(aiida: any): CrystalStructure {
  if (!Array.isArray(aiida?.cell) || aiida.cell.length !== 3) {
    throw new Error("Invalid AIIDA: cell must be 3x3 matrix");
  }

  if (!Array.isArray(aiida?.sites)) {
    throw new Error("Invalid AIIDA: missing sites");
  }

  if (!Array.isArray(aiida?.kinds)) {
    throw new Error("Invalid AIIDA: missing kinds");
  }

  // ---- 1. Species from kinds (authoritative source) ----
  const species = aiida.kinds.map((k: any) => k.name);

  const speciesIndex = new Map<string, number>();
  species.forEach((name: string, i: number) => {
    speciesIndex.set(name, i);
  });

  // ---- 2. Build sites ----
  const sites = aiida.sites.map((s: any) => {
    const idx = speciesIndex.get(s.kind_name);

    if (idx === undefined) {
      throw new Error(`Unknown kind_name: ${s.kind_name}`);
    }

    return new Site(idx, s.position as CartesianCoords);
  });

  // ---- 3. Construct crystal ----
  return new CrystalStructure({
    lattice: aiida.cell as CartesianCoords[],
    species,
    sites,
  });
}

export function structureToAiida(crystal: CrystalStructure) {
  const { lattice, species, sites } = crystal;

  // ---- 1. Rebuild kinds ----
  const kinds = species.map((symbol) => {
    const el = elementBySymbol[symbol];

    if (!el) {
      throw new Error(`Unknown element symbol: ${symbol}`);
    }

    return {
      name: symbol,
      symbols: [symbol],
      mass: el.mass,
      atomic_number: el.atomicNumber,
    };
  });

  const speciesIndexToName = new Map(species.map((name, i) => [i, name]));

  // ---- 2. Rebuild sites ----
  const aiidaSites = sites.map((site) => {
    const kind_name = speciesIndexToName.get(site.speciesIndex);

    if (kind_name === undefined) {
      throw new Error(`Invalid speciesIndex: ${site.speciesIndex}`);
    }

    return {
      kind_name,
      position: site.cart,
    };
  });

  return {
    cell: lattice,
    kinds,
    sites: aiidaSites,

    pbc1: true,
    pbc2: true,
    pbc3: true,
  };
}
