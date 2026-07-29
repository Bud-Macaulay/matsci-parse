import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EXTERNAL_DIR = join(process.cwd(), "tests", "external");

export const submoduleExists = existsSync(EXTERNAL_DIR);

export const upfDir = join(
  "pseudopotentials",
  "upf-v2",
  "sources",
  "1",
  "files",
);

export function loadExternal(...segments: string[]): string {
  const fullPath = join(EXTERNAL_DIR, ...segments);
  if (!existsSync(fullPath)) {
    throw new Error(
      `External test file not found: ${fullPath}\n` +
        "Did you forget to run `git submodule update --init`?",
    );
  }
  return readFileSync(fullPath, "utf-8");
}

export function loadUpf(filename: string): string {
  return loadExternal(upfDir, filename);
}

export function loadFhi(elementNum: number, elementSym: string, dir = "0"): string {
  const padded = String(elementNum).padStart(2, "0");
  const filename = `${dir}.${padded}-${elementSym}.LDA.fhi`;
  return loadExternal("pseudopotentials", "fhi", "files", dir, filename);
}

export const gthDir = join("pseudopotentials", "gth", "sources", "1", "files");

export function loadGth(filename: string): string {
  return loadExternal(gthDir, filename);
}

export function loadGthElement(element: string): string {
  const files = readdirSync(join(EXTERNAL_DIR, gthDir));
  const file = files.find((f) => f.startsWith(`${element}-`));
  if (!file) throw new Error(`No GTH file found for element ${element}`);
  return loadGth(file);
}

export const psp8Dir = join("pseudopotentials", "psp8", "sources", "1", "files");

export function loadPsp8(filename: string): string {
  return loadExternal(psp8Dir, filename);
}

export const psmlDir = join("pseudopotentials", "psml", "sources", "1", "files");

export function loadPsml(filename: string): string {
  return loadExternal(psmlDir, filename);
}
