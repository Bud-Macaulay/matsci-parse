import { describe, expect, it } from "vitest";

import {
  fromKPOINTS,
  kpointsFromPW,
  kpointsToPW,
  toKPOINTS,
} from "@/core/io/kpoints";
import type { KGrid } from "@/core/kpoints";

/**
 * Property tests: every conversion must preserve the physical set of k-points.
 * Expansion follows each code's documented formula, independently of the
 * library's own conversion helpers:
 *
 * - KGrid:              origin + i / n
 * - QE automatic:       (i + sk/2) / n,              sk in {0, 1}
 * - VASP Gamma:         (i + s) / N,                 s in grid steps
 * - VASP Monkhorst-Pack (i + s + (1 - N)/2) / N
 */

type Axis = (i: number, n: number) => number;

function expand(mesh: readonly number[], axis: readonly Axis[]): string[] {
  const wrap = (x: number) => {
    const r = Math.round((x - Math.floor(x)) * 1e8) / 1e8;
    return r === 1 ? 0 : r;
  };
  const out: string[] = [];
  for (let i = 0; i < mesh[0]; i++)
    for (let j = 0; j < mesh[1]; j++)
      for (let k = 0; k < mesh[2]; k++)
        out.push(
          [axis[0](i, mesh[0]), axis[1](j, mesh[1]), axis[2](k, mesh[2])]
            .map(wrap)
            .join(","),
        );
  return out.sort();
}

function expandGrid(grid: KGrid): string[] {
  return expand(
    grid.mesh,
    grid.origin.map((o) => (i: number, n: number) => o + i / n),
  );
}

function numbers(line: string): number[] {
  return line.trim().split(/\s+/).map(Number);
}

function expandQE(text: string): string[] {
  const v = numbers(text.split("\n")[1]);
  const mesh = v.slice(0, 3);
  const sk = v.slice(3, 6);
  return expand(
    mesh,
    sk.map((s) => (i: number, n: number) => (i + s / 2) / n),
  );
}

function expandVASP(text: string): string[] {
  const lines = text.trim().split("\n");
  const mp = lines[2].trim().toLowerCase().startsWith("m");
  const mesh = numbers(lines[3]);
  const shift = lines[4] ? numbers(lines[4]) : [0, 0, 0];
  return expand(
    mesh,
    shift.map((s) => (i: number, n: number) =>
      (i + s + (mp ? (1 - n) / 2 : 0)) / n,
    ),
  );
}

const MESHES = [
  [1, 1, 1],
  [2, 2, 2],
  [3, 3, 3],
  [4, 6, 5],
  [8, 8, 8],
];

const FLAGS = [0, 1].flatMap((a) =>
  [0, 1].flatMap((b) => [0, 1].map((c) => [a, b, c])),
);

const qeCard = (mesh: number[], sk: number[]) =>
  `K_POINTS automatic\n${mesh.join(" ")} ${sk.join(" ")}`;

const vaspFile = (scheme: "Gamma" | "Monkhorst-Pack", mesh: number[], s: number[]) =>
  `mesh\n0\n${scheme}\n${mesh.join(" ")}\n${s.join(" ")}\n`;

describe("k-point grids keep their physical k-points across codes", () => {
  for (const mesh of MESHES) {
    for (const sk of FLAGS) {
      const card = qeCard(mesh, sk);

      it(`QE ${mesh.join("x")} shift ${sk.join("")}: read, write QE, write VASP`, () => {
        const grid = kpointsFromPW(card) as KGrid;
        const points = expandQE(card);

        expect(expandGrid(grid)).toEqual(points);
        expect(expandQE(kpointsToPW(grid))).toEqual(points);
        expect(expandVASP(toKPOINTS(grid))).toEqual(points);
      });
    }

    for (const scheme of ["Gamma", "Monkhorst-Pack"] as const) {
      for (const s of [
        [0, 0, 0],
        [0.5, 0.5, 0.5],
        [0.5, 0, 0.5],
      ]) {
        const file = vaspFile(scheme, mesh, s);

        it(`VASP ${scheme} ${mesh.join("x")} shift ${s.join(" ")}: read, write VASP, write QE`, () => {
          const grid = fromKPOINTS(file) as KGrid;
          const points = expandVASP(file);

          expect(expandGrid(grid)).toEqual(points);
          expect(expandVASP(toKPOINTS(grid))).toEqual(points);
          // Half-step shifts are always expressible in QE.
          expect(expandQE(kpointsToPW(grid))).toEqual(points);
        });
      }
    }
  }

  it("keeps a non-half-step VASP shift when writing VASP", () => {
    const file = vaspFile("Gamma", [4, 4, 4], [0.25, 0, 0.1]);
    const grid = fromKPOINTS(file) as KGrid;

    expect(expandVASP(toKPOINTS(grid))).toEqual(expandVASP(file));
    expect(() => kpointsToPW(grid)).toThrow(
      "QE automatic grids can only be shifted by 0 or half a step",
    );
  });
});
