import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { fromINCAR, toINCAR } from "@/core/io/vasp";
import { submoduleExists } from "../../../helpers/external";

// Real-world INCARs (see tests/external/inputs/incar/SOURCE.yaml).
const DIR = join(process.cwd(), "tests", "external", "inputs", "incar", "files");

const files = submoduleExists && existsSync(DIR) ? readdirSync(DIR).sort() : [];

describe.skipIf(files.length === 0)("INCAR round trip over external files", () => {
  it.each(files)("%s", (file) => {
    const parsed = fromINCAR(readFileSync(join(DIR, file), "utf-8"));

    expect(Object.keys(parsed).length).toBeGreaterThan(0);
    expect(fromINCAR(toINCAR({ extra: parsed }))).toEqual(parsed);
  });
});
