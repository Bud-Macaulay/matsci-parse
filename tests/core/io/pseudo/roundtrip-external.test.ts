import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fromFHI, toFHI } from "@/core/io/pseudo/fhi";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { fromGTH, toGTH } from "@/core/io/pseudo/gth";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromPSML, toPSML } from "@/core/io/pseudo/psml";

const EXTERNAL_DIR = join(process.cwd(), "tests", "external", "pseudopotentials");

function loadFile(...segments: string[]): string {
  return readFileSync(join(EXTERNAL_DIR, ...segments), "utf-8");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkRoundtrip<T>(parsed: T, reparsed: T) {
  expect(parsed).toBeDefined();
  expect(reparsed).toBeDefined();
}

// ---------------------------------------------------------------------------
// FHI round-trip
// ---------------------------------------------------------------------------

const fhiDirs = ["0", "1", "2"];

fhiDirs.forEach((dir) => {
  const dirPath = join(EXTERNAL_DIR, "fhi", "files", dir);
  if (!existsSync(dirPath)) return;
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".fhi"));

  describe(`FHI round-trip (dir ${dir})`, () => {
    files.forEach((file) => {
      it(`round-trips ${file}`, () => {
        const text = loadFile("fhi", "files", dir, file);
        const parsed = fromFHI(text);
        const cpi = toFHI(parsed);
        const reparsed = fromFHI(cpi);
        checkRoundtrip(parsed, reparsed);
        expect(reparsed.mesh.r.length).toBe(parsed.mesh.r.length);
        expect(reparsed.header.zValence).toBeCloseTo(parsed.header.zValence);
        expect(reparsed.header.element).toBe("");
      });
    });
  });
});

// ---------------------------------------------------------------------------
// UPF round-trip
// ---------------------------------------------------------------------------

const upfDir = join(EXTERNAL_DIR, "upf-v2", "sources", "1", "files");
if (existsSync(upfDir)) {
  const upfFiles = readdirSync(upfDir);

  describe("UPF round-trip", () => {
    upfFiles.forEach((file) => {
      it(`round-trips ${file}`, () => {
        const text = loadFile("upf-v2", "sources", "1", "files", file);
        const parsed = fromUPF(text);
        const serialized = toUPF(parsed);
        const reparsed = fromUPF(serialized);
        checkRoundtrip(parsed, reparsed);
        expect(reparsed.header.element).toBe(parsed.header.element);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// PSP8 round-trip
// ---------------------------------------------------------------------------

const psp8Dir = join(EXTERNAL_DIR, "psp8", "sources", "1", "files");
if (existsSync(psp8Dir)) {
  const psp8Files = readdirSync(psp8Dir);

  describe("PSP8 round-trip", () => {
    psp8Files.forEach((file) => {
      it(`round-trips ${file}`, { timeout: 30000 }, () => {
        const text = loadFile("psp8", "sources", "1", "files", file);
        const parsed = fromPSP8(text);
        const serialized = toPSP8(parsed);
        const reparsed = fromPSP8(serialized);
        checkRoundtrip(parsed, reparsed);
        expect(reparsed).toEqual(parsed);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// GTH round-trip
// ---------------------------------------------------------------------------

const gthDir = join(EXTERNAL_DIR, "gth", "sources", "1", "files");
if (existsSync(gthDir)) {
  const gthFiles = readdirSync(gthDir).filter((f) => !f.includes("copy"));

  describe("GTH round-trip", () => {
    gthFiles.forEach((file) => {
      it(`round-trips ${file}`, () => {
        const text = loadFile("gth", "sources", "1", "files", file);
        const parsed = fromGTH(text);
        const serialized = toGTH(parsed);
        const reparsed = fromGTH(serialized);
        checkRoundtrip(parsed, reparsed);
        expect(reparsed.header.zValence).toBeCloseTo(parsed.header.zValence);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// PSML round-trip
// ---------------------------------------------------------------------------

const psmlDir = join(EXTERNAL_DIR, "psml", "sources", "1", "files");
if (existsSync(psmlDir)) {
  const psmlFiles = readdirSync(psmlDir);

  describe("PSML round-trip", () => {
    psmlFiles.forEach((file) => {
      it(`round-trips ${file}`, () => {
        const text = loadFile("psml", "sources", "1", "files", file);
        const parsed = fromPSML(text);
        const serialized = toPSML(parsed);
        const reparsed = fromPSML(serialized);
        checkRoundtrip(parsed, reparsed);
        expect(reparsed.header.element).toBe(parsed.header.element);
      });
    });
  });
}
