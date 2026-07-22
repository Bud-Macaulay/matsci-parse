import { describe, it, expect } from "vitest";
import { ibravToLattice } from "@/core/io/pw/ibrav";

function basis(lattice: { basis: { data: Float64Array } }): number[] {
  return Array.from(lattice.basis.data);
}

function approx(a: number, b: number, eps = 1e-8) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

describe("ibravToLattice", () => {
  it("ibrav=0 throws", () => {
    expect(() => ibravToLattice(0, [5.0])).toThrow("ibrav=0");
  });

  // ── Cubic ──────────────────────────────────────────────────

  it("ibrav=1: cubic P (sc)", () => {
    const lat = ibravToLattice(1, [5.0]);
    const b = basis(lat);
    // a = 5 Bohr
    approx(b[0], 5); approx(b[1], 0); approx(b[2], 0);
    approx(b[3], 0); approx(b[4], 5); approx(b[5], 0);
    approx(b[6], 0); approx(b[7], 0); approx(b[8], 5);
  });

  it("ibrav=2: cubic F (fcc)", () => {
    const lat = ibravToLattice(2, [6.0]);
    const b = basis(lat);
    const h = 3; // a/2
    approx(b[0], -h); approx(b[1], 0); approx(b[2], h);
    approx(b[3], 0); approx(b[4], h); approx(b[5], h);
    approx(b[6], -h); approx(b[7], h); approx(b[8], 0);
  });

  it("ibrav=3: cubic I (bcc)", () => {
    const lat = ibravToLattice(3, [6.0]);
    const b = basis(lat);
    const h = 3;
    approx(b[0], h); approx(b[1], h); approx(b[2], h);
    approx(b[3], -h); approx(b[4], h); approx(b[5], h);
    approx(b[6], -h); approx(b[7], -h); approx(b[8], h);
  });

  it("ibrav=-3: cubic I (bcc, symmetric)", () => {
    const lat = ibravToLattice(-3, [6.0]);
    const b = basis(lat);
    const h = 3;
    approx(b[0], -h); approx(b[1], h); approx(b[2], h);
    approx(b[3], h); approx(b[4], -h); approx(b[5], h);
    approx(b[6], h); approx(b[7], h); approx(b[8], -h);
  });

  // ── Hexagonal / Trigonal ───────────────────────────────────

  it("ibrav=4: hexagonal (c/a=1.6)", () => {
    const lat = ibravToLattice(4, [5.0, 0, 1.6]);
    const b = basis(lat);
    approx(b[0], 5); approx(b[1], 0); approx(b[2], 0);
    approx(b[3], -2.5); approx(b[4], 5 * Math.sqrt(3) / 2); approx(b[5], 0);
    approx(b[6], 0); approx(b[7], 0); approx(b[8], 8.0);
  });

  it("ibrav=5: trigonal R, 3fold c", () => {
    const lat = ibravToLattice(5, [5.0, 0, 0, 0.5]);
    const b = basis(lat);
    const tx = 5 * Math.sqrt(0.25);
    const ty = 5 * Math.sqrt(1 / 12);
    const tz = 5 * Math.sqrt(2 / 3);
    approx(b[0], tx);  approx(b[1], -ty); approx(b[2], tz);
    approx(b[3], 0);   approx(b[4], 2*ty); approx(b[5], tz);
    approx(b[6], -tx); approx(b[7], -ty); approx(b[8], tz);
  });

  // ── Tetragonal ─────────────────────────────────────────────

  it("ibrav=6: tetragonal P (st)", () => {
    const lat = ibravToLattice(6, [5.0, 0, 2.0]);
    const b = basis(lat);
    approx(b[0], 5); approx(b[1], 0); approx(b[2], 0);
    approx(b[3], 0); approx(b[4], 5); approx(b[5], 0);
    approx(b[6], 0); approx(b[7], 0); approx(b[8], 10);
  });

  it("ibrav=7: tetragonal I (bct)", () => {
    const lat = ibravToLattice(7, [5.0, 0, 2.0]);
    const b = basis(lat);
    const h = 2.5;
    const hh = 5;
    approx(b[0], h);  approx(b[1], -h); approx(b[2], hh);
    approx(b[3], h);  approx(b[4], h);  approx(b[5], hh);
    approx(b[6], -h); approx(b[7], -h); approx(b[8], hh);
  });

  // ── Orthorhombic ───────────────────────────────────────────

  it("ibrav=8: orthorhombic P", () => {
    const lat = ibravToLattice(8, [5.0, 1.5, 2.0]);
    const b = basis(lat);
    approx(b[0], 5);  approx(b[1], 0); approx(b[2], 0);
    approx(b[3], 0);  approx(b[4], 7.5); approx(b[5], 0);
    approx(b[6], 0);  approx(b[7], 0); approx(b[8], 10);
  });

  it("ibrav=9: orthorhombic BC", () => {
    const lat = ibravToLattice(9, [5.0, 1.5, 2.0]);
    const b = basis(lat);
    approx(b[0], 2.5);  approx(b[1], 3.75); approx(b[2], 0);
    approx(b[3], -2.5); approx(b[4], 3.75); approx(b[5], 0);
    approx(b[6], 0);    approx(b[7], 0);    approx(b[8], 10);
  });

  it("ibrav=10: orthorhombic FCC", () => {
    const lat = ibravToLattice(10, [5.0, 1.5, 2.0]);
    const b = basis(lat);
    approx(b[0], 2.5);  approx(b[1], 0);    approx(b[2], 5);
    approx(b[3], 2.5);  approx(b[4], 3.75); approx(b[5], 0);
    approx(b[6], 0);    approx(b[7], 3.75); approx(b[8], 5);
  });

  it("ibrav=11: orthorhombic BCC", () => {
    const lat = ibravToLattice(11, [5.0, 1.5, 2.0]);
    const b = basis(lat);
    approx(b[0], 2.5);  approx(b[1], 3.75); approx(b[2], 5);
    approx(b[3], -2.5); approx(b[4], 3.75); approx(b[5], 5);
    approx(b[6], -2.5); approx(b[7], -3.75); approx(b[8], 5);
  });

  // ── Monoclinic ─────────────────────────────────────────────

  it("ibrav=12: monoclinic P, unique c", () => {
    const lat = ibravToLattice(12, [5.0, 1.2, 1.5, Math.cos(110 * Math.PI / 180)]);
    const b = basis(lat);
    approx(b[0], 5); approx(b[1], 0); approx(b[2], 0);
    approx(b[3], 6 * Math.cos(110 * Math.PI / 180));
    approx(b[4], 6 * Math.sin(110 * Math.PI / 180));
    approx(b[5], 0);
    approx(b[6], 0); approx(b[7], 0); approx(b[8], 7.5);
  });

  it("ibrav=-12: monoclinic P, unique b", () => {
    const beta = 110 * Math.PI / 180;
    const lat = ibravToLattice(-12, [5.0, 1.2, 1.5, 0, Math.cos(beta)]);
    const b = basis(lat);
    approx(b[0], 5); approx(b[1], 0); approx(b[2], 0);
    approx(b[3], 0); approx(b[4], 6); approx(b[5], 0);
    approx(b[6], 7.5 * Math.cos(beta)); approx(b[7], 0); approx(b[8], 7.5 * Math.sin(beta));
  });

  // ── Triclinic ──────────────────────────────────────────────

  it("ibrav=14: triclinic", () => {
    const lat = ibravToLattice(14, [5.0, 1.2, 1.5, 0.3, 0.4, 0.5]);
    const b = basis(lat);
    expect(b).toHaveLength(9);
    expect(Math.abs(b[0])).toBeGreaterThan(0);
    expect(Math.abs(b[4])).toBeGreaterThan(0);
    expect(Math.abs(b[8])).toBeGreaterThan(0);
  });

  it("throws on unsupported ibrav", () => {
    expect(() => ibravToLattice(99, [5.0])).toThrow("Unsupported ibrav");
  });
});
