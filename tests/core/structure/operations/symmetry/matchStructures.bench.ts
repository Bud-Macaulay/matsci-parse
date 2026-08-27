import { bench, describe } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fromPOSCAR } from "@/core/io/poscar";
import { matchStructures } from "@/core/structure/operations/symmetry/matchStructures";

const STRUCTURE_DIR = join(
  process.cwd(),
  "tests",
  "external",
  "structure",
  "symmetry",
);
const POSCAR_DIR = join(STRUCTURE_DIR, "poscars");
const RESULTS_FILE = join(STRUCTURE_DIR, "matched.jsonl");

function loadCodes(): string[] {
  const lines = readFileSync(RESULTS_FILE, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const codes: string[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { code?: string };
      if (typeof parsed.code === "string") codes.push(parsed.code);
    } catch {
      // Ignore malformed lines.
    }
  }
  return codes;
}

function loadPOSCAR(code: string, year: "2017" | "2026") {
  const file = join(POSCAR_DIR, `${code}_${year}`, "POSCAR");
  if (!existsSync(file)) return null;
  try {
    return fromPOSCAR(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

const codes = loadCodes();

const pairs = codes
  .map((code) => ({
    code,
    old: loadPOSCAR(code, "2017"),
    new: loadPOSCAR(code, "2026"),
  }))
  .filter((p) => p.old !== null && p.new !== null) as {
  code: string;
  old: Parameters<typeof matchStructures>[0];
  new: Parameters<typeof matchStructures>[0];
}[];

// Sizes (number of structures) to benchmark. Override with BENCH_NS=5,10 to
// do a quick run without processing the whole set.
const NS = process.env.BENCH_NS
  ? process.env.BENCH_NS.split(",").map((n) => Number(n))
  : [50, 100];

// Samples per benchmark. Lower this (e.g. BENCH_ITERS=2) for a fast comparison.
const ITERS = process.env.BENCH_ITERS ? Number(process.env.BENCH_ITERS) : 4;

describe(`matchStructures performance over N structures (${pairs.length} available)`, () => {
  for (const n of NS) {
    const count = Math.min(n, pairs.length);
    bench(
      `match ${count} structures`,
      async () => {
        for (let i = 0; i < count; i++) {
          const { old, new: nw } = pairs[i];
          await matchStructures(old, nw, 0.3, 0.01);
        }
      },
      { iterations: ITERS },
    );
  }
});
