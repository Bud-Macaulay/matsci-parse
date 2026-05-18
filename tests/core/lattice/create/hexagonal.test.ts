import { describe, it, expect } from "vitest";
import { hexagonal } from "@/core/lattice/create/hexagonal";

describe("hexagonal", () => {
  it("has 120 degree structure in plane", () => {
    const l = hexagonal(1, 2);

    const a = l.basis.data.slice(0, 3);
    const b = l.basis.data.slice(3, 6);

    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    expect(dot).toBeLessThan(0);
  });
});
