import { describe, it, expect } from "vitest";
import { canonicalize } from "@/core/structure/operations/canonicalize";

import { expectArrayClose } from "../../../helpers/closeUtils";

describe("canonicalize", () => {
  it("wraps fractional coordinates into [0, 1)", () => {
    const structure = {
      lattice: {} as any,
      sites: [{ species: "A", frac: new Float64Array([1.2, -0.3, 2.0]) }],
    };

    const result = canonicalize(structure);

    expect(result.sites[0].frac[0]).toBeCloseTo(0.2);
    expect(result.sites[0].frac[1]).toBeCloseTo(0.7);
    expect(result.sites[0].frac[2]).toBeCloseTo(0);
  });

  it("removes numerical noise", () => {
    const structure = {
      lattice: {} as any,
      sites: [
        {
          species: "A",
          frac: new Float64Array([1.0000000000001, 0, -1e-13]),
        },
      ],
    };

    const result = canonicalize(structure);

    expect(result.sites[0].frac[0]).toBe(0);
    expect(result.sites[0].frac[1]).toBe(0);
    expect(result.sites[0].frac[2]).toBe(0);
  });

  it("is idempotent", () => {
    const structure = {
      lattice: {} as any,
      sites: [
        { species: "A", frac: new Float64Array([1.3, -0.2, 0.5]) },
        { species: "B", frac: new Float64Array([0.1, 0.9, 1.0]) },
      ],
    };

    const once = canonicalize(structure);
    const twice = canonicalize(once);

    expect(twice.sites[0].frac).toEqual(once.sites[0].frac);
    expect(twice.sites[1].frac).toEqual(once.sites[1].frac);
  });

  it("treats equivalent structures as identical after wrapping", () => {
    const base = {
      lattice: {} as any,
      sites: [{ species: "A", frac: new Float64Array([0.1, 0.2, 0.3]) }],
    };

    const shifted = {
      lattice: {} as any,
      sites: [{ species: "A", frac: new Float64Array([1.1, 1.2, 1.3]) }],
    };

    const a = canonicalize(base);
    const b = canonicalize(shifted);

    expectArrayClose(a.sites[0].frac, b.sites[0].frac);
  });

  it("does not mutate input structure", () => {
    const structure = {
      lattice: {} as any,
      sites: [{ species: "A", frac: new Float64Array([1.5, -0.5, 0]) }],
    };

    const copy = structure.sites[0].frac.slice();

    canonicalize(structure);

    expect(structure.sites[0].frac).toEqual(copy);
  });
});
