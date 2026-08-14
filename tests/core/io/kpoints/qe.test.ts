import { describe, expect, it } from "vitest";

import {
  fromPWKPoints,
  toPWKPoints,
  kpointsFromPW,
  kpointsToPW,
} from "@/core/io/kpoints";
import { writeFile } from "../../../helpers/io";

import * as fixtures from "../teststrings/kpoints";

describe("fromPWKPoints", () => {
  it("parses an automatic Monkhorst-Pack grid", () => {
    const card = fromPWKPoints(fixtures.qeAutomatic);

    expect(card).toEqual({
      mode: "automatic",
      grid: [4, 4, 4],
      shift: [0, 0, 0],
    });
  });

  it("parses a gamma-only card", () => {
    expect(fromPWKPoints(fixtures.qeGamma)).toEqual({ mode: "gamma" });
  });

  it("parses a crystal list", () => {
    const card = fromPWKPoints(fixtures.qeCrystal);

    if (card.mode === "crystal") {
      expect(card.points).toHaveLength(4);
      expect(card.points[0]).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(card.points[3]).toEqual({ x: 0.5, y: 0.5, z: 0.5, w: 1 });
    } else {
      throw new Error("expected crystal mode");
    }
  });

  it("parses a tpiba list", () => {
    const card = fromPWKPoints(fixtures.qeTpiba);

    if (card.mode === "tpiba") {
      expect(card.points).toHaveLength(2);
    } else {
      throw new Error("expected tpiba mode");
    }
  });

  it("parses a tpiba_b band path", () => {
    const card = fromPWKPoints(fixtures.qeTpibaBands);

    if (card.mode === "tpiba_b") {
      expect(card.nks).toBe(20);
      expect(card.points).toHaveLength(4);
      expect(card.points[1]).toEqual({ x: 0.5, y: 0, z: 0, w: 1 });
    } else {
      throw new Error("expected tpiba_b mode");
    }
  });

  it("parses a crystal_b band path", () => {
    const card = fromPWKPoints(fixtures.qeCrystalBands);

    if (card.mode === "crystal_b") {
      expect(card.nks).toBe(15);
      expect(card.points).toHaveLength(3);
    } else {
      throw new Error("expected crystal_b mode");
    }
  });

  it("parses a crystal_c covering", () => {
    const card = fromPWKPoints(fixtures.qeCrystalCovering);

    expect(card.mode).toBe("crystal_c");
  });

  it("parses a K_POINTS block embedded in a full pw.in", () => {
    const card = fromPWKPoints(fixtures.qeInFile);

    expect(card).toEqual({
      mode: "automatic",
      grid: [6, 6, 6],
      shift: [1, 1, 1],
    });
  });

  it("ignores inline comments", () => {
    const card = fromPWKPoints("K_POINTS automatic\n6 6 6 0 0 0 ! MP grid");

    expect(card).toEqual({
      mode: "automatic",
      grid: [6, 6, 6],
      shift: [0, 0, 0],
    });
  });

  it("ignores hash comments", () => {
    const card = fromPWKPoints("K_POINTS crystal\n1\n0.5 0 0 1 # X point");

    expect(card).toEqual({
      mode: "crystal",
      points: [{ x: 0.5, y: 0, z: 0, w: 1 }],
    });
  });

  it("defaults to automatic when the mode is omitted", () => {
    const card = fromPWKPoints("K_POINTS\n2 2 2 0 0 0");

    expect(card).toEqual({
      mode: "automatic",
      grid: [2, 2, 2],
      shift: [0, 0, 0],
    });
  });

  it("throws when no K_POINTS card is present", () => {
    expect(() => fromPWKPoints("&SYSTEM\nibrav = 0\n/")).toThrow(
      "K_POINTS card not found",
    );
  });

  it("throws on a malformed automatic line", () => {
    expect(() => fromPWKPoints("K_POINTS automatic\n4 4 4")).toThrow();
  });

  it("throws on an automatic card with no data", () => {
    expect(() => fromPWKPoints("K_POINTS automatic\n")).toThrow(
      "K_POINTS automatic requires 6 numbers",
    );
  });

  it("throws on a mismatched list count", () => {
    expect(() => fromPWKPoints("K_POINTS crystal\n2\n0 0 0 1\n")).toThrow(
      "Expected 2 k-points",
    );
  });

  it("throws when a list has no count", () => {
    expect(() => fromPWKPoints("K_POINTS crystal\n")).toThrow(
      "K_POINTS list requires a point count",
    );
  });

  it("throws on a k-point line with too few values", () => {
    expect(() => fromPWKPoints("K_POINTS crystal\n1\n0 0 0\n")).toThrow(
      "Invalid K_POINTS line",
    );
  });

  it("throws when a band path has no nks", () => {
    expect(() => fromPWKPoints("K_POINTS tpiba_b\n")).toThrow(
      "K_POINTS band path requires nks",
    );
  });

  it("throws on an unsupported mode", () => {
    expect(() => fromPWKPoints("K_POINTS banana\n")).toThrow(
      "Unsupported K_POINTS mode",
    );
  });
});

describe("K_POINTS round-trips", () => {
  for (const [name, input] of Object.entries(fixtures)) {
    if (!name.startsWith("qe")) continue;

    it(`round-trips ${name}`, () => {
      const card = fromPWKPoints(input);
      const text1 = toPWKPoints(card);
      writeFile(`${name}.kpoints.in`, text1);

      const card2 = fromPWKPoints(text1);
      const text2 = toPWKPoints(card2);

      expect(text2).toBe(text1);
      expect(card2).toEqual(card);
    });
  }
});

describe("toPWKPoints", () => {
  it("serializes an automatic grid", () => {
    expect(
      toPWKPoints({ mode: "automatic", grid: [4, 4, 4], shift: [1, 1, 0] }),
    ).toBe("K_POINTS automatic\n4 4 4 1 1 0");
  });

  it("serializes gamma", () => {
    expect(toPWKPoints({ mode: "gamma" })).toBe("K_POINTS gamma");
  });

  it("serializes a crystal list", () => {
    const card = fromPWKPoints(fixtures.qeCrystal);
    const text = toPWKPoints(card);

    expect(text).toMatch(/^K_POINTS crystal\n4\n/);
    expect(text).toContain("0.5 0.5 0.5 1");
  });
});

describe("kpointsFromPW", () => {
  it("reads an automatic grid as a KGrid", () => {
    expect(kpointsFromPW(fixtures.qeAutomatic)).toEqual({
      mesh: [4, 4, 4],
      origin: [0, 0, 0],
    });
  });

  it("reads a gamma card as a 1x1x1 grid", () => {
    expect(kpointsFromPW(fixtures.qeGamma)).toEqual({
      mesh: [1, 1, 1],
      origin: [0, 0, 0],
    });
  });

  it("reads a crystal list as a reciprocal point set", () => {
    expect(kpointsFromPW(fixtures.qeCrystal)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0, 0] },
        { coordinate: [0.5, 0.5, 0] },
        { coordinate: [0.5, 0.5, 0.5] },
      ],
      weights: [1, 1, 1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("reads a tpiba list as a cartesian point set", () => {
    const set = kpointsFromPW(fixtures.qeTpiba);
    expect(set).toMatchObject({ coordinateSystem: "cartesian" });
    expect(set).toMatchObject({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.25, 0.25, 0.25] },
      ],
    });
  });

  it("reads a crystal_c covering as a point set", () => {
    expect(kpointsFromPW(fixtures.qeCrystalCovering)).toEqual({
      points: [
        { coordinate: [0, 0, 0] },
        { coordinate: [0.5, 0.5, 0.5] },
      ],
      weights: [1, 1],
      coordinateSystem: "reciprocal",
    });
  });

  it("reads a crystal_b band path as a KPath", () => {
    expect(kpointsFromPW(fixtures.qeCrystalBands)).toEqual({
      points: {
        k1: [0, 0, 0],
        k2: [0.5, 0.5, 0],
        k3: [0.5, 0.5, 0.5],
      },
      segments: [
        ["k1", "k2"],
        ["k2", "k3"],
      ],
    });
  });

  it("reads the K_POINTS card from a full pw.in file", () => {
    expect(kpointsFromPW(fixtures.qeInFile)).toEqual({
      mesh: [6, 6, 6],
      origin: [1, 1, 1],
    });
  });

  it("rejects tpiba_b band paths", () => {
    expect(() => kpointsFromPW(fixtures.qeTpibaBands)).toThrow(
      "tpiba_b band paths",
    );
  });
});

describe("kpointsToPW", () => {
  it("writes a grid as an automatic card", () => {
    expect(
      kpointsToPW({ mesh: [4, 4, 4], origin: [0.5, 0.5, 0] }),
    ).toBe("K_POINTS automatic\n4 4 4 0.5 0.5 0");
  });

  it("writes a reciprocal point set as a crystal list", () => {
    expect(
      kpointsToPW({
        points: [
          { coordinate: [0, 0, 0] },
          { coordinate: [0.5, 0.5, 0.5] },
        ],
        weights: [2, 1],
      }),
    ).toBe("K_POINTS crystal\n2\n0 0 0 2\n0.5 0.5 0.5 1");
  });

  it("writes a cartesian point set as a tpiba list", () => {
    expect(
      kpointsToPW({
        points: [{ coordinate: [0.25, 0.25, 0.25] }],
        coordinateSystem: "cartesian",
      }),
    ).toBe("K_POINTS tpiba\n1\n0.25 0.25 0.25 1");
  });

  it("writes a path as a crystal_b card with a default segment density", () => {
    const path = kpointsFromPW(fixtures.qeCrystalBands);
    const text = kpointsToPW(path);
    expect(text).toMatch(/^K_POINTS crystal_b\n40\n/);
    expect(text).toContain("0 0 0 1");
    expect(text).toContain("0.5 0.5 0.5 1");
  });

  it("honors the requested segment density", () => {
    const path = kpointsFromPW(fixtures.qeCrystalBands);
    expect(kpointsToPW(path, 12)).toMatch(/^K_POINTS crystal_b\n12\n/);
  });

  it("round-trips every canonical form", () => {
    const cases = [
      { mesh: [4, 4, 4], origin: [0, 0, 0] },
      { mesh: [6, 8, 10], origin: [0.5, 0.5, 0] },
      kpointsFromPW(fixtures.qeCrystal),
      kpointsFromPW(fixtures.qeTpiba),
      kpointsFromPW(fixtures.qeCrystalBands),
    ] as const;
    for (const input of cases) {
      const once = kpointsFromPW(kpointsToPW(input));
      expect(kpointsFromPW(kpointsToPW(once)), JSON.stringify(input)).toEqual(
        once,
      );
    }
  });
});
