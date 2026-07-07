import { describe, it, expect } from "vitest";
import { fromParameters } from "@/core/lattice/create/fromParameters";
import { parameters } from "@/core/lattice/parameters";

describe("fromParameters", () => {
  it("round trips parameters exactly for orthogonal lattice", () => {
    const original = [2, 3, 4, 90, 90, 90] as const;

    const lat = fromParameters(...original);
    const back = parameters(lat);

    for (let i = 0; i < 6; i++) {
      expect(back[i]).toBeCloseTo(original[i]);
    }
  });

  it("produces valid finite lattice", () => {
    const lat = fromParameters(2, 2, 2, 70, 80, 60);

    for (const v of lat.basis.data) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

it("throws for gamma close to 180 degrees", () => {
  expect(() => fromParameters(2, 2, 2, 90, 90, 180)).toThrow(
    "Invalid lattice: gamma too close to 0 or 180 degrees",
  );
});
