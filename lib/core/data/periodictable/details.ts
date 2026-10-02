import { getElement, type ElementInfo } from "./atomicData";
import { elementGroups } from "./groups";
import { elementPeriods } from "./periods";
import { elementBlocks, type ElementBlock } from "./blocks";
import { elementCategories, type ElementCategory } from "./categories";
import { electronConfigurations } from "./electronConfigurations";
import { electronConfigSemantics } from "./electronConfigSemantic";
import { electronShells } from "./electronShells";
import { electronegativity } from "./electronegativity";
import { elementAbundances } from "./abundance";
import { ionizationEnergies } from "./ionizationEnergy";
import { electronAffinities } from "./electronAffinity";
import { atomicRadii } from "./atomicRadius";
import { covalentRadii } from "./covalentRadii";
import { densities } from "./density";
import { meltingPoints } from "./meltingPoint";
import { boilingPoints } from "./boilingPoint";
import { molarHeats } from "./molarHeat";
import { elementPhases, type ElementPhase } from "./phase";
import { discoveryYears } from "./yearDiscovered";
import { discoverers } from "./discoveredBy";
import { elementGroupBlocks } from "./groupBlock";
import { elementSymbolOf } from "./isotopes";

/**
 * Opt-in joined element record.
 *
 * Importing this module pulls in every property field; import the minimal
 * {@link ./atomicData} core or individual field modules instead when bundle
 * size matters.
 */

/** Combined element record: minimal core plus every opt-in property field. */
export interface ElementDetails extends ElementInfo {
  /** IUPAC group number (1-18). */
  group: number;
  /** Period (row) number, 1-7. */
  period: number;
  /** Block (subshell family). */
  block: ElementBlock;
  /** Chemical category. */
  category: ElementCategory;
  /** Ground-state electron configuration (full form). */
  electronConfiguration: string;
  /** Ground-state electron configuration (noble-gas shorthand). */
  electronConfigSemantic: string;
  /** Electrons per shell (principal quantum number). */
  shells: readonly number[];
  /** Pauling electronegativity, where tabulated. */
  electronegativity?: number;
  /** Earth's crust abundance in mg/kg (ppm), where known. */
  abundance: number | null;
  /** First ionization energy in eV, where known. */
  ionizationEnergy: number | null;
  /** Electron affinity in eV, where known. */
  electronAffinity: number | null;
  /** Van der Waals atomic radius in pm, where known. */
  atomicRadius: number | null;
  /** Covalent radius in angstrom, where known. */
  covalentRadius: number | null;
  /** Density at STP in g/cm³, where known. */
  density: number | null;
  /** Melting point in K, where known. */
  meltingPoint: number | null;
  /** Boiling point in K, where known. */
  boilingPoint: number | null;
  /** Molar heat capacity in J/(mol·K), where known. */
  molarHeat: number | null;
  /** Standard state at STP. */
  phase: ElementPhase;
  /** Year discovered (null for ancient elements). */
  discoveryYear: number | null;
  /** Credited discoverer(s), where known. */
  discoverer: string | null;
  /** PubChem-style group-block classification. */
  groupBlock: string;
}

/** Look up the joined element record, tolerating isotope labels.
 * @param symbol - Element or isotope symbol (e.g. `"Fe"`, `"13C"`, `"D"`).
 * @returns The combined record, or undefined for unknown symbols. */
export function getElementDetails(symbol: string): ElementDetails | undefined {
  const element = elementSymbolOf(symbol);
  const info = getElement(element);

  if (info === undefined) return undefined;

  const group = elementGroups[element];
  const period = elementPeriods[element];
  const block = elementBlocks[element];
  const category = elementCategories[element];
  const electronConfiguration = electronConfigurations[element];
  const electronConfigSemantic = electronConfigSemantics[element];
  const shells = electronShells[element];
  const abundance = elementAbundances[element];
  const ionizationEnergy = ionizationEnergies[element];
  const electronAffinity = electronAffinities[element];
  const atomicRadius = atomicRadii[element];
  const covalentRadius = covalentRadii[element];
  const density = densities[element];
  const meltingPoint = meltingPoints[element];
  const boilingPoint = boilingPoints[element];
  const molarHeat = molarHeats[element];
  const phase = elementPhases[element];
  const discoveryYear = discoveryYears[element];
  const discoverer = discoverers[element];
  const groupBlock = elementGroupBlocks[element];

  if (
    group === undefined ||
    period === undefined ||
    block === undefined ||
    category === undefined ||
    electronConfiguration === undefined ||
    electronConfigSemantic === undefined ||
    shells === undefined ||
    abundance === undefined ||
    ionizationEnergy === undefined ||
    electronAffinity === undefined ||
    atomicRadius === undefined ||
    covalentRadius === undefined ||
    density === undefined ||
    meltingPoint === undefined ||
    boilingPoint === undefined ||
    molarHeat === undefined ||
    phase === undefined ||
    discoveryYear === undefined ||
    discoverer === undefined ||
    groupBlock === undefined
  ) {
    return undefined;
  }

  return {
    ...info,
    group,
    period,
    block,
    category,
    electronConfiguration,
    electronConfigSemantic,
    shells,
    electronegativity: electronegativity[element],
    abundance,
    ionizationEnergy,
    electronAffinity,
    atomicRadius,
    covalentRadius,
    density,
    meltingPoint,
    boilingPoint,
    molarHeat,
    phase,
    discoveryYear,
    discoverer,
    groupBlock,
  };
}
