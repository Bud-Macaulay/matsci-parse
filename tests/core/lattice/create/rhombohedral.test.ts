import { describe, it, expect } from "vitest";
import { rhombohedral } from "@/core/lattice/create/rhombohedral";

describe("rhombohedral", () => {
  it("produces non-orthogonal equal-edge lattice", () => {
    const l = rhombohedral(2, 60);

    expect(l.basis.data.length).toBe(9);
  });
});
