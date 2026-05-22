import { describe, it, expect } from "vitest";
import { monoclinic } from "@/core/lattice/create/monoclinic";

describe("monoclinic", () => {
  it("preserves beta angle between a and c", () => {
    const l = monoclinic(1, 1, 1, 100);

    const d = l.basis.data;

    const a = [d[0], d[1], d[2]];
    const c = [d[6], d[7], d[8]];

    const dot = a[0] * c[0] + a[1] * c[1] + a[2] * c[2];

    const cosBeta = Math.cos((100 * Math.PI) / 180);

    expect(dot).toBeCloseTo(cosBeta, 10);
  });
});
