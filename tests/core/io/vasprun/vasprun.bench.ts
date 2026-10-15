import { bench, describe } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { fromVasprun } from "@/core/io/vasprun";

// pymatgen's vasprun.xml test files (tests/external submodule). Skipped when
// the submodule is not checked out, e.g. in CI without submodules.
const FILES = join(
  process.cwd(),
  "tests/external/outputs/vasprun/sources/1/files",
);

if (existsSync(FILES)) {
  for (const file of readdirSync(FILES).filter((f) => f.endsWith(".xml.gz"))) {
    // Decompress once: the benches measure parsing only.
    const text = gunzipSync(readFileSync(join(FILES, file))).toString("latin1");
    const mb = (text.length / 1e6).toFixed(2);

    describe(`fromVasprun: ${file} (${mb} MB)`, () => {
      bench("full", () => {
        fromVasprun(text);
      });
      bench("without bands and DOS", () => {
        fromVasprun(text, { eigenvalues: false, dos: false });
      });
      bench("with projected DOS", () => {
        fromVasprun(text, { projectedDos: true });
      });
    });
  }
}
