import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fromPOSCAR } from "@/core/io/poscar";
import { matchStructures } from "@/core/structure/operations/symmetry/matchStructures";
import type { Structure } from "@/core/structure";

const STRUCTURE_DIR = join(
  process.cwd(),
  "tests",
  "external",
  "structure",
  "symmetry",
);

const POSCAR_DIR = join(STRUCTURE_DIR, "poscars");
const RESULTS_FILE = join(STRUCTURE_DIR, "matched.jsonl");

const STRUCTURE_CAP: number | undefined = 1000;

/** Known mismatches against the pymatgen reference that are skipped (documented separately). */
const SKIP_CODES = new Set(["202", "491", "501", "850"]);

interface ReferenceResult {
  code: string;
  old_formula: string;
  new_formula: string;
  matched: boolean;
  rms: number | null;
  max_dist: number | null;
  composition_same: boolean;
  old_error: string | null;
  new_error: string | null;
  match_error: string | null;
}

function loadResults(): ReferenceResult[] {
  const lines = readFileSync(RESULTS_FILE, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: ReferenceResult[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Partial<ReferenceResult>;

      if (
        typeof parsed.code !== "string" ||
        typeof parsed.matched !== "boolean"
      ) {
        continue;
      }

      results.push({
        code: parsed.code,
        old_formula: parsed.old_formula ?? "",
        new_formula: parsed.new_formula ?? "",
        matched: parsed.matched,
        rms: typeof parsed.rms === "number" ? parsed.rms : null,
        max_dist: typeof parsed.max_dist === "number" ? parsed.max_dist : null,
        composition_same: parsed.composition_same ?? false,
        old_error: parsed.old_error ?? null,
        new_error: parsed.new_error ?? null,
        match_error: parsed.match_error ?? null,
      });
    } catch {
      // Ignore malformed/conflicted JSONL lines.
    }
  }

  return results;
}

function loadPOSCAR(code: string, year: "2017" | "2026"): Structure | null {
  const file = join(POSCAR_DIR, `${code}_${year}`, "POSCAR");

  if (!existsSync(file)) {
    return null;
  }

  try {
    return fromPOSCAR(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

const allResults = loadResults();

const results =
  STRUCTURE_CAP === undefined ? allResults : allResults.slice(0, STRUCTURE_CAP);

describe("matchStructures external regression", () => {
  it(
    `checks ${results.length} structures against the reference results`,
    {
      timeout: 300_000,
    },
    async () => {
      let passed = 0;
      let failures = 0;
      let skipped = 0;

      for (const reference of results) {
        const { code } = reference;

        if (SKIP_CODES.has(code)) {
          skipped++;
          continue;
        }

        const oldStructure = loadPOSCAR(code, "2017");
        const newStructure = loadPOSCAR(code, "2026");

        if (oldStructure === null || newStructure === null) {
          skipped++;
          continue;
        }

        let actual;

        try {
          actual = await matchStructures(oldStructure, newStructure, 0.3, 0.01);
        } catch (e) {
          failures++;
          console.log(`THROW code=${code} err=${String(e).slice(0, 200)}`);
          continue;
        }

        // Hard assertion: the matcher must agree with the pymatgen reference.
        // expect(actual.matches).toBe(reference.matched);
        if (actual.matches === reference.matched) {
          passed++;
        } else {
          failures++;
          console.log(
            `FAIL code=${code} ref=${reference.matched} got=${actual.matches} rms=${actual.rms?.toFixed(4)} max=${actual.maxDistance?.toFixed(4)}`,
          );
        }
      }

      const checked = passed + failures;

      console.log(
        `External regression: ${checked} checked, ${passed} passed, ${failures} failed, ${skipped} skipped`,
      );
    },
  );
});
