import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { kspacingToGrid } from "@/core/lattice/kspacingToGrid";

describe("kspacingToGrid", () => {
  it("cubic cell with default kspacing", () => {
    // a = 5 Å cubic
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    const grid = kspacingToGrid(lattice, 0.22);

    // |b| = 1/5 = 0.2 Å⁻¹
    // N = ceil(0.2 * 2π / 0.22) = ceil(5.712) = 6
    expect(grid).toEqual([6, 6, 6]);
  });

  it("copper-like cubic cell", () => {
    // a = 3.615 Å (copper)
    const lattice = createLattice([3.615, 0, 0, 0, 3.615, 0, 0, 0, 3.615]);
    const grid = kspacingToGrid(lattice, 0.22);

    // |b| = 1/3.615 = 0.2766 Å⁻¹
    // N = ceil(0.2766 * 2π / 0.22) = ceil(7.90) = 8
    expect(grid).toEqual([8, 8, 8]);
  });

  it("large cell gets minimum grid", () => {
    // a = 100 Å cubic — very large cell
    const lattice = createLattice([100, 0, 0, 0, 100, 0, 0, 0, 100]);
    const grid = kspacingToGrid(lattice, 0.22);

    // |b| = 0.01 Å⁻¹
    // N = ceil(0.01 * 2π / 0.22) = ceil(0.2856) = 1
    expect(grid).toEqual([1, 1, 1]);
  });

  it("orthorhombic cell produces asymmetric grid", () => {
    // a=3, b=5, c=10 Å
    const lattice = createLattice([3, 0, 0, 0, 5, 0, 0, 0, 10]);
    const grid = kspacingToGrid(lattice, 0.22);

    // |b₁| = 1/3 ≈ 0.333 → N₁ = ceil(0.333 * 2π / 0.22) = ceil(9.52) = 10
    // |b₂| = 1/5 = 0.2   → N₂ = ceil(0.2 * 2π / 0.22)  = ceil(5.71) = 6
    // |b₃| = 1/10 = 0.1   → N₃ = ceil(0.1 * 2π / 0.22)  = ceil(2.86) = 3
    expect(grid).toEqual([10, 6, 3]);
  });

  it("larger spacing produces smaller grid", () => {
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    const fine = kspacingToGrid(lattice, 0.22);
    const coarse = kspacingToGrid(lattice, 0.5);

    expect(coarse[0]).toBeLessThan(fine[0]);
    expect(coarse[1]).toBeLessThan(fine[1]);
    expect(coarse[2]).toBeLessThan(fine[2]);
  });

  it("throws on non-positive spacing", () => {
    const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    expect(() => kspacingToGrid(lattice, 0)).toThrow();
    expect(() => kspacingToGrid(lattice, -1)).toThrow();
  });

  it("hexagonal cell", () => {
    // a=b=3, c=5 Å, gamma=120°
    const a = 3;
    const c = 5;
    const g = (120 * Math.PI) / 180;
    const lattice = createLattice([
      a,
      0,
      0,
      a * Math.cos(g),
      a * Math.sin(g),
      0,
      0,
      0,
      c,
    ]);
    const grid = kspacingToGrid(lattice, 0.22);

    // all grid dimensions should be >= 1
    expect(grid.every((n) => n >= 1)).toBe(true);
    // hexagonal a → denser grid than c direction
    expect(grid[0]).toBeGreaterThan(grid[2]);
  });
});
