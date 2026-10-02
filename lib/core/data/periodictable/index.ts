/**
 * Self-contained periodic-table data, lookups, and helpers.
 *
 * Element values mirror mc-periodic-table's `src/data` (the source of
 * truth); this package re-keys them by element symbol for ergonomic lookup.
 *
 * Each submodule is dependency-free (it only imports small sibling
 * `periodictable/` modules), so the whole package can be used standalone.
 *
 * The core {@link ./atomicData} table stays minimal (number, symbol, name,
 * mass) and every extra property lives in its own module, so importers only
 * bundle the fields they use. Prefer deep imports such as
 * `.../periodictable/electronegativity` when only one property is needed;
 * importing this barrel (or the opt-in {@link ./details} join) keeps every
 * field in the bundle.
 */
export * from "./atomicData";
export * from "./groups";
export * from "./periods";
export * from "./blocks";
export * from "./categories";
export * from "./electronConfigurations";
export * from "./electronConfigSemantic";
export * from "./electronShells";
export * from "./electronegativity";
export * from "./abundance";
export * from "./ionizationEnergy";
export * from "./electronAffinity";
export * from "./atomicRadius";
export * from "./covalentRadii";
export * from "./density";
export * from "./meltingPoint";
export * from "./boilingPoint";
export * from "./molarHeat";
export * from "./phase";
export * from "./yearDiscovered";
export * from "./discoveredBy";
export * from "./groupBlock";
export * from "./isotopes";
export * from "./details";
export * from "./xrayScattering";
export * from "./neutronScattering";
