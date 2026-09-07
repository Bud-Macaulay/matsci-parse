import { describe, expect, it } from "vitest";

import { toCrystalD3, fromCrystalD3 } from "@/core/io/kpoints";
import type { KPath } from "@/core/kpoints/kpoints";

// A realistic D3 BAND file (reciprocal coordinates in 2π/a units, one
// segment per line).
const d3Bands = `BAND
Si band structure
9 0 3 0 0 1
0 0 0 102700 102700 0 GAMMA -> C
-102700 161980 0 -132340 132340 0 C_2 -> Y_2
-132340 132340 0 0 0 0 Y_2 -> GAMMA
0 0 0 -132340 132340 132340 GAMMA -> M_2
-132340 132340 132340 -97219 167461 132340 M_2 -> D
97219 97219 132340 0 0 132340 D_2 -> A
0 0 132340 0 0 0 A -> GAMMA
0 132340 132340 0 0 0 L_2 -> GAMMA
0 0 0 0 132340 0 GAMMA -> V_2`;

describe("fromCrystalD3", () => {
  it("parses a BAND file into a KPath", () => {
    const path = fromCrystalD3(d3Bands);

    expect(path.kind).toBe("path");
    expect(path.segments).toEqual([
      ["GAMMA", "C"],
      ["C_2", "Y_2"],
      ["Y_2", "GAMMA"],
      ["GAMMA", "M_2"],
      ["M_2", "D"],
      ["D_2", "A"],
      ["A", "GAMMA"],
      ["L_2", "GAMMA"],
      ["GAMMA", "V_2"],
    ]);
    expect(path.points.GAMMA).toEqual([0, 0, 0]);
    expect(path.points.C).toEqual([102700, 102700, 0]);
    expect(path.points.V_2).toEqual([0, 132340, 0]);
  });

  it("auto-names segments without a comment", () => {
    const text = `BAND
title
2 0 0 0 0 1
0 0 0 0.5 0 0
0.5 0 0 0.5 0.5 0.5`;
    const path = fromCrystalD3(text);
    expect(path.segments).toEqual([
      ["k1", "k2"],
      ["k2", "k3"],
    ]);
  });

  it("throws when the header declares more segments than lines", () => {
    const text = `BAND
title
5 0 0 0 0 1
0 0 0 1 1 1`;
    expect(() => fromCrystalD3(text)).toThrow(
      "declares 5 segments but only 1 lines remain",
    );
  });

  it("throws when the file does not start with BAND", () => {
    expect(() => fromCrystalD3("K-POINTS\nx\n1 0 0 0 0 1\n0 0 0 1 1 1")).toThrow(
      "must start with 'BAND'",
    );
  });
});

describe("toCrystalD3", () => {
  it("serializes a KPath back to a BAND file", () => {
    const path = fromCrystalD3(d3Bands);
    const text = toCrystalD3(path, "round trip");
    const lines = text.split("\n");

    expect(lines[0]).toBe("BAND");
    expect(lines[1]).toBe("round trip");
    expect(lines[2]).toBe("9 1 360 1 0 1 0");
    expect(lines[3]).toContain("0 0 0 102700 102700 0");
    expect(lines[3]).toContain("GAMMA -> C");
    expect(lines[11]).toContain("0 0 0 0 132340 0");
    expect(lines[11]).toContain("GAMMA -> V_2");
  });

  it("writes the total k-point count as segments × points per segment", () => {
    const path = fromCrystalD3(d3Bands);
    const text = toCrystalD3(path, "", 15);
    expect(text.split("\n")[2]).toBe("9 1 135 1 0 1 0");
  });

  it("uses the path density when no explicit point count is given", () => {
    const path: KPath = {
      kind: "path",
      points: { G: [0, 0, 0], X: [0.5, 0, 0.5] },
      segments: [["G", "X"], ["X", "G"]],
      density: 20,
    };
    const text = toCrystalD3(path, "density");
    expect(text.split("\n")[2]).toBe("2 1 40 1 0 1 0");
  });

  it("round-trips", () => {
    const path = fromCrystalD3(d3Bands);
    expect(fromCrystalD3(toCrystalD3(path))).toEqual(path);
  });

  it("rejects non-path k-point data", () => {
    expect(() =>
      toCrystalD3({
        kind: "grid",
        mesh: [4, 4, 4],
        origin: [0, 0, 0],
        scheme: "gamma-centered",
      }),
    ).toThrow("only supports KPath");
  });
});