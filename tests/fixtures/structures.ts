import { createLattice } from "@/core/lattice/lattice";
import type { Structure } from "@/core/structure/structure";

/**
 * Shared reference structures for structure-level tests.
 *
 * Geometries are textbook/experimental cells, generated with pymatgen and
 * cross-checked against spglib; known properties (space group, volume,
 * nearest-neighbour distance, ...) are asserted in `structures.test.ts`.
 * Expected outputs of a specific operation belong in that operation's test.
 *
 * Fixtures are shared constants and deep-frozen: library operations must not
 * mutate their inputs, and a write to a fixture throws. `frac` is a plain
 * frozen array for that reason; the lattice `Float64Array` cannot be frozen
 * and is guarded by the non-mutation test instead.
 */

type SiteSpec = [symbol: string, frac: [number, number, number]];

function build(basis: number[], sites: SiteSpec[]): Structure {
  const lattice = createLattice(basis);
  Object.freeze(lattice.basis);
  Object.freeze(lattice);

  return Object.freeze({
    lattice,
    sites: Object.freeze(
      sites.map(([symbol, frac]) =>
        Object.freeze({
          species: Object.freeze({ symbol }),
          frac: Object.freeze([...frac]) as [number, number, number],
        }),
      ),
    ) as Structure["sites"],
  });
}

/** Simple cubic α-Po, a = 3.359. Pm-3m (221), 1 site. */
export const poSC = build(
  [3.359, 0, 0, 0, 3.359, 0, 0, 0, 3.359],
  [["Po", [0, 0, 0]]],
);

/** bcc W conventional cell, a = 3.1653. Im-3m (229), 2 sites. */
export const wBCC = build(
  [3.1653, 0, 0, 0, 3.1653, 0, 0, 0, 3.1653],
  [
    ["W", [0, 0, 0]],
    ["W", [0.5, 0.5, 0.5]],
  ],
);

/** fcc Cu primitive cell, a = 3.615. Fm-3m (225), 1 site, non-orthogonal basis. */
export const cuFCCPrimitive = build(
  [0, 1.8075, 1.8075, 1.8075, 0, 1.8075, 1.8075, 1.8075, 0],
  [["Cu", [0, 0, 0]]],
);

/** fcc Cu conventional cell, a = 3.615. Fm-3m (225), 4 sites. */
export const cuFCC = build(
  [3.615, 0, 0, 0, 3.615, 0, 0, 0, 3.615],
  [
    ["Cu", [0, 0, 0]],
    ["Cu", [0.5, 0.5, 0]],
    ["Cu", [0.5, 0, 0.5]],
    ["Cu", [0, 0.5, 0.5]],
  ],
);

/** Diamond Si conventional cell, a = 5.431. Fd-3m (227), 8 sites. */
export const siDiamond = build(
  [5.431, 0, 0, 0, 5.431, 0, 0, 0, 5.431],
  [
    ["Si", [0, 0, 0]],
    ["Si", [0.5, 0.5, 0]],
    ["Si", [0.5, 0, 0.5]],
    ["Si", [0, 0.5, 0.5]],
    ["Si", [0.25, 0.25, 0.25]],
    ["Si", [0.75, 0.75, 0.25]],
    ["Si", [0.75, 0.25, 0.75]],
    ["Si", [0.25, 0.75, 0.75]],
  ],
);

/** CsCl (B2), a = 4.209. Pm-3m (221), 2 sites. */
export const csCl = build(
  [4.209, 0, 0, 0, 4.209, 0, 0, 0, 4.209],
  [
    ["Cs", [0, 0, 0]],
    ["Cl", [0.5, 0.5, 0.5]],
  ],
);

/** Rocksalt NaCl conventional cell, a = 5.64. Fm-3m (225), 8 sites. */
export const naCl = build(
  [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
  [
    ["Na", [0, 0, 0]],
    ["Na", [0.5, 0.5, 0]],
    ["Na", [0.5, 0, 0.5]],
    ["Na", [0, 0.5, 0.5]],
    ["Cl", [0.5, 0.5, 0.5]],
    ["Cl", [0, 0, 0.5]],
    ["Cl", [0, 0.5, 0]],
    ["Cl", [0.5, 0, 0]],
  ],
);

/** Cubic perovskite SrTiO3, a = 3.905. Pm-3m (221), 5 sites. */
export const srTiO3 = build(
  [3.905, 0, 0, 0, 3.905, 0, 0, 0, 3.905],
  [
    ["Sr", [0, 0, 0]],
    ["Ti", [0.5, 0.5, 0.5]],
    ["O", [0.5, 0.5, 0]],
    ["O", [0.5, 0, 0.5]],
    ["O", [0, 0.5, 0.5]],
  ],
);

/** Rutile TiO2, a = 4.594, c = 2.959, O at 4f with u = 0.3049. P4_2/mnm (136), 6 sites. */
export const tiO2Rutile = build(
  [4.594, 0, 0, 0, 4.594, 0, 0, 0, 2.959],
  [
    ["Ti", [0, 0, 0]],
    ["Ti", [0.5, 0.5, 0.5]],
    ["O", [0.3049, 0.3049, 0]],
    ["O", [0.6951, 0.6951, 0]],
    ["O", [0.8049, 0.1951, 0.5]],
    ["O", [0.1951, 0.8049, 0.5]],
  ],
);

/** α-U, a = 2.854, b = 5.869, c = 4.955, U at 4c with y = 0.1025. Cmcm (63), 4 sites. */
export const uAlpha = build(
  [2.854, 0, 0, 0, 5.869, 0, 0, 0, 4.955],
  [
    ["U", [0, 0.1025, 0.25]],
    ["U", [0, 0.8975, 0.75]],
    ["U", [0.5, 0.6025, 0.25]],
    ["U", [0.5, 0.3975, 0.75]],
  ],
);

/** Wurtzite ZnO, a = 3.25, c = 5.207, u = 0.382. P6_3mc (186), 4 sites. */
export const znOWurtzite = build(
  [3.25, 0, 0, -1.625, 2.8145825623, 0, 0, 0, 5.207],
  [
    ["Zn", [1 / 3, 2 / 3, 0]],
    ["Zn", [2 / 3, 1 / 3, 0.5]],
    ["O", [1 / 3, 2 / 3, 0.382]],
    ["O", [2 / 3, 1 / 3, 0.882]],
  ],
);

/** AB-stacked graphite, a = 2.47, c = 6.8. P6_3/mmc (194), 4 sites, layered. */
export const graphite = build(
  [2.47, 0, 0, -1.235, 2.1390827473, 0, 0, 0, 6.8],
  [
    ["C", [0, 0, 0.25]],
    ["C", [0, 0, 0.75]],
    ["C", [1 / 3, 2 / 3, 0.25]],
    ["C", [2 / 3, 1 / 3, 0.75]],
  ],
);

/**
 * Corundum Al2O3 rhombohedral primitive cell (hexagonal a = 4.759, c = 12.991;
 * Al z = 0.3522, O x = 0.3064). R-3c (167), 10 sites.
 */
export const al2O3Corundum = build(
  [
    0, 2.7476099311, 4.3303333333, -2.3795, -1.3738049655, 4.3303333333,
    2.3795, -1.3738049655, 4.3303333333,
  ],
  [
    ["Al", [0.3522, 0.3522, 0.3522]],
    ["Al", [0.8522, 0.8522, 0.8522]],
    ["Al", [0.1478, 0.1478, 0.1478]],
    ["Al", [0.6478, 0.6478, 0.6478]],
    ["O", [0.0564, 0.75, 0.4436]],
    ["O", [0.75, 0.4436, 0.0564]],
    ["O", [0.4436, 0.0564, 0.75]],
    ["O", [0.9436, 0.25, 0.5564]],
    ["O", [0.25, 0.5564, 0.9436]],
    ["O", [0.5564, 0.9436, 0.25]],
  ],
);

/** Baddeleyite (monoclinic) ZrO2, a = 5.1505, b = 5.2116, c = 5.3173, β = 99.23°. P2_1/c (14), 12 sites. */
export const zrO2Baddeleyite = build(
  [5.0838134695, 0, -0.8261300488, 0, 5.2116, 0, 0, 0, 5.3173],
  [
    ["Zr", [0.2754, 0.0395, 0.2083]],
    ["Zr", [0.7246, 0.9605, 0.7917]],
    ["Zr", [0.7246, 0.5395, 0.2917]],
    ["Zr", [0.2754, 0.4605, 0.7083]],
    ["O", [0.07, 0.3317, 0.3447]],
    ["O", [0.93, 0.6683, 0.6553]],
    ["O", [0.93, 0.8317, 0.1553]],
    ["O", [0.07, 0.1683, 0.8447]],
    ["O", [0.4496, 0.7569, 0.4792]],
    ["O", [0.5504, 0.2431, 0.5208]],
    ["O", [0.5504, 0.2569, 0.0208]],
    ["O", [0.4496, 0.7431, 0.9792]],
  ],
);

/** Arbitrary skewed triclinic cell (not a real material). P1 (1), 3 sites. */
export const triclinicP1 = build(
  [4.1, 0, 0, 1.3, 3.8, 0, 0.9, 1.1, 5.2],
  [
    ["Ga", [0.1, 0.2, 0.3]],
    ["As", [0.55, 0.45, 0.7]],
    ["N", [0.8, 0.9, 0.05]],
  ],
);

/** Isolated H2O (O–H 0.9572 Å, H–O–H 104.52°) centred in a 10 Å cube. Pmm2 (25), 3 sites. */
export const h2oBox = build(
  [10, 0, 0, 0, 10, 0, 0, 0, 10],
  [
    ["O", [0.5, 0.5, 0.5]],
    ["H", [0.5756950327, 0.5, 0.5585882277]],
    ["H", [0.4243049673, 0.5, 0.5585882277]],
  ],
);

/** Every fixture by name, for tests that run over the whole catalog. */
export const ALL_STRUCTURES = {
  poSC,
  wBCC,
  cuFCCPrimitive,
  cuFCC,
  siDiamond,
  csCl,
  naCl,
  srTiO3,
  tiO2Rutile,
  uAlpha,
  znOWurtzite,
  graphite,
  al2O3Corundum,
  zrO2Baddeleyite,
  triclinicP1,
  h2oBox,
} as const satisfies Record<string, Structure>;

export type StructureName = keyof typeof ALL_STRUCTURES;
