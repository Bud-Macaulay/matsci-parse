import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice";
import { matchStructures } from "@/core/structure/operations/symmetry/matchStructures";
import type { Structure } from "@/core/structure";

import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import { supercell } from "@/core/structure/operations/supercell";
import { perturb } from "@/core/structure/operations/perturb";
import { sortSites } from "@/core/structure/operations/sortSites";

import { seededRandom } from "../../../../helpers/random";
import {
  csCl,
  cuFCC,
  cuFCCPrimitive,
  naCl,
  siDiamond,
  triclinicP1,
} from "../../../../fixtures/structures";

/** Rigidly shift every site by `t` (fractional). */
function translate(s: Structure, t: [number, number, number]): Structure {
  return {
    ...s,
    sites: s.sites.map((site) => ({
      ...site,
      frac: [site.frac[0] + t[0], site.frac[1] + t[1], site.frac[2] + t[2]],
    })),
  };
}

function relabel(s: Structure, from: string, to: string): Structure {
  return {
    ...s,
    sites: s.sites.map((site) =>
      site.species.symbol === from ? { ...site, species: { symbol: to } } : site,
    ),
  };
}

describe("matchStructures", () => {
  it("matches a structure shifted by a lattice vector", async () => {
    const result = await matchStructures(siDiamond, translate(siDiamond, [1, 0, 0]));

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
    expect(result.maxDistance).toBeCloseTo(0);
  });

  it("matches under an origin shift and site permutation", async () => {
    const moved = { ...naCl, sites: sortSites(translate(naCl, [0.5, 0, 0]).sites) };
    const result = await matchStructures(naCl, moved);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
  });

  it("does not match different compositions", async () => {
    const result = await matchStructures(siDiamond, relabel(siDiamond, "Si", "Ge"));

    expect(result.matches).toBe(false);
  });

  // Known bug: b's lattice is never compared with a's (b's fracs are measured
  // in a's lattice), so both 2-site primitives at (0,0,0)+(½,½,½) "match"
  // although one cell is fcc (60°) and the other simple cubic.
  it.fails("does not match polymorphs: rocksalt vs CsCl-type NaCl", async () => {
    const b2 = relabel(csCl, "Cs", "Na");
    const result = await matchStructures(naCl, b2);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  // Perturbed P1 cells: rms is the displacement in angstrom.
  it("matches within positional tolerance", async () => {
    const moved = perturb(triclinicP1, 0.005, { rng: seededRandom(1) });
    const result = await matchStructures(triclinicP1, moved, 0.01);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0.005, 8);
    expect(result.maxDistance).toBeCloseTo(0.005, 8);
  });

  it("rejects structures outside positional tolerance", async () => {
    const moved = perturb(triclinicP1, 0.02, { rng: seededRandom(1) });
    const result = await matchStructures(triclinicP1, moved, 0.01);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  it("standardizes equivalent structures consistently", async () => {
    const [a, b] = await Promise.all([
      getSymmetry(siDiamond),
      getSymmetry(translate(siDiamond, [0.1, 0.2, 0.3])),
    ]);

    expect(a.primitive.sites.length).toBe(b.primitive.sites.length);
    expect(a.conventional.sites.length).toBe(b.conventional.sites.length);
  });
});

describe("supercell equivalence", () => {
  it("matches the fcc primitive cell to the conventional cell", async () => {
    const result = await matchStructures(cuFCCPrimitive, cuFCC);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
  });

  it("matches a cell to its 2x2x2 supercell, in either order", async () => {
    const sc = supercell(siDiamond, 2);

    expect((await matchStructures(siDiamond, sc)).matches).toBe(true);
    expect((await matchStructures(sc, siDiamond)).matches).toBe(true);
  });

  it("matches two equivalent 2x2x2 supercells", async () => {
    const result = await matchStructures(supercell(siDiamond, 2), supercell(siDiamond, 2));

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
    expect(result.maxDistance).toBeCloseTo(0);
  });

  // Noise is added to the primitive cell before expanding, so the supercell
  // stays periodic with the same primitive cell.
  it("matches a slightly noisy supercell to the primitive cell", async () => {
    const noisy = supercell(perturb(triclinicP1, 0.005, { rng: seededRandom(3) }), 2);
    const result = await matchStructures(triclinicP1, noisy, 0.01);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0.005, 8);
  });

  it("does not match a significantly noisy supercell to the primitive cell", async () => {
    const noisy = supercell(perturb(triclinicP1, 0.05, { rng: seededRandom(3) }), 2);
    const result = await matchStructures(triclinicP1, noisy, 0.01);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  it("matches the noisy supercell with wider tolerance 0.1", async () => {
    const noisy = supercell(perturb(triclinicP1, 0.05, { rng: seededRandom(3) }), 2);
    const result = await matchStructures(triclinicP1, noisy, 0.1);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0.05, 8);
  });

  it("matches a noisy diamond supercell when the noise leaves it triclinic", async () => {
    const prim = (await getSymmetry(siDiamond)).primitive;
    // seed 3: perturbed cell is P-1 (2).
    const noisy = supercell(perturb(prim, 0.001, { rng: seededRandom(3) }), 2);

    expect((await matchStructures(prim, noisy, 0.01)).matches).toBe(true);
  });

  // Known bug: when the perturbed cell is detected as a centred subgroup
  // (here C2/m, 12) the standardized primitive bases differ and no match is
  // found at any tolerance, even without the supercell.
  it.fails("matches noisy diamond detected as a centred subgroup", async () => {
    const prim = (await getSymmetry(siDiamond)).primitive;
    const noisy = perturb(prim, 0.001, { rng: seededRandom(1) });

    expect((await matchStructures(prim, noisy, 0.3)).matches).toBe(true);
  });
});

describe("skewed-cell lattice rotations", () => {
  // a=(1,0,0), b=(-1/2,√3/2,0) (γ=120°), c=(0,0,2).
  const SKEWED = [1, 0, 0, -0.5, 0.8660254037844386, 0, 0, 0, 2];

  // det +1 rotation with Mᵀ·G·M = G but M·G·Mᵀ ≠ G: missed by the
  // transposed metric check, so this is a false negative without the fix.
  const M = [0, -1, 0, 1, -1, 0, 0, 0, 1];

  function rot(f: [number, number, number]): [number, number, number] {
    const wrap = (x: number) => x - Math.floor(x);
    return [
      wrap(M[0] * f[0] + M[1] * f[1] + M[2] * f[2]),
      wrap(M[3] * f[0] + M[4] * f[1] + M[5] * f[2]),
      wrap(M[6] * f[0] + M[7] * f[1] + M[8] * f[2]),
    ];
  }

  function skewedStructure(
    si: [number, number, number],
    o: [number, number, number],
  ): Structure {
    return {
      lattice: createLattice(SKEWED),
      species: [{ symbol: "Si" }, { symbol: "O" }],
      sites: [
        { species: { symbol: "Si" }, frac: new Float64Array(si) },
        { species: { symbol: "O" }, frac: new Float64Array(o) },
      ],
    };
  }

  it("matches structures related by a lattice rotation on a skewed cell", async () => {
    const a = skewedStructure([0.13, 0.27, 0.31], [0.61, 0.17, 0.72]);
    const b = skewedStructure(
      rot([0.13, 0.27, 0.31]),
      rot([0.61, 0.17, 0.72]),
    );
    // tight tolerance: only the true rotation (rms ~ 0) can satisfy this
    const result = await matchStructures(a, b, 0.01);
    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0, 10);
  });
});
