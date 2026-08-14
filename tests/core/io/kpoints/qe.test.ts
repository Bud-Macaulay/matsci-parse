import { describe, expect, it } from "vitest";

import { fromPWKPoints, toPWKPoints } from "@/core/io/kpoints";
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
