import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";

import {
  loadEntriesFromZip,
  buildOutputZip,
  basename,
  stem,
  uniqueName,
} from "../pseudo-webapp/src/zip";
import { parse, serialize } from "@/core/io/pseudo/registry";

const heUpf = readFileSync(
  join(process.cwd(), "tests/external/pseudopotentials/upf-v2/sources/1/files/He.nc.pbe.z_2.oncvpsp4.sg15.v0.upf"),
  "utf-8",
);
const hPsp8 = readFileSync(
  join(process.cwd(), "tests/external/pseudopotentials/psp8/sources/1/files/H.psp8"),
  "utf-8",
);

async function makeFixtureZip(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("He.upf", heUpf);
  zip.file("nested/H.psp8", hPsp8);
  zip.file("__MACOSX/._He.upf", "junk");
  zip.file(".DS_Store", "junk");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("pseudo-webapp zip helpers", () => {
  it("loads text entries, skips dirs and OS metadata", async () => {
    const entries = await loadEntriesFromZip(await makeFixtureZip());
    expect(entries.map((e) => e.name)).toEqual(["He.upf", "nested/H.psp8"]);
    expect(entries[0].text).toBe(heUpf);
    expect(entries[1].text).toBe(hPsp8);
  });

  it("round-trips an output zip byte-exactly", async () => {
    const files = [
      { name: "He.upf", content: heUpf },
      { name: "H.psp8", content: hPsp8 },
    ];
    const reloaded = await loadEntriesFromZip(await buildOutputZip(files));
    // Loader returns entries sorted by name, shaped as { name, text }.
    expect(reloaded).toEqual([
      { name: "H.psp8", text: hPsp8 },
      { name: "He.upf", text: heUpf },
    ]);
  });

  it("computes basenames, stems and unique names", () => {
    expect(basename("dir/sub/file.upf")).toBe("file.upf");
    expect(basename("file.upf")).toBe("file.upf");
    expect(stem("file.upf")).toBe("file");
    expect(stem("noext")).toBe("noext");
    const used = new Set<string>();
    expect(uniqueName(used, "He.upf")).toBe("He.upf");
    expect(uniqueName(used, "He.upf")).toBe("He-2.upf");
    expect(uniqueName(used, "He.upf")).toBe("He-3.upf");
    expect(uniqueName(used, "other.cpi")).toBe("other.cpi");
  });

  it("batch-converts loaded entries through the registry", async () => {
    const entries = await loadEntriesFromZip(await makeFixtureZip());
    const converted = entries.map((e) => {
      const pp = parse(e.text);
      return { name: e.name, element: pp.header.element, upf: serialize(pp, "UPF2") };
    });
    expect(converted[0].element).toBe("He");
    expect(converted[1].element).toBe("H");
    const reloaded = await loadEntriesFromZip(
      await buildOutputZip(
        converted.map((c) => ({ name: `${c.name}.upf`, content: c.upf })),
      ),
    );
    expect(reloaded.map((e) => e.name)).toEqual(["He.upf.upf", "nested/H.psp8.upf"]);
    for (const e of reloaded) {
      expect(() => parse(e.text, "UPF2")).not.toThrow();
    }
  });
});
