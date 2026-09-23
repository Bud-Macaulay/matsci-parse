// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";

const html = readFileSync(join(process.cwd(), "pseudo-webapp", "index.html"), "utf-8");
const heUpf = readFileSync(join(process.cwd(), "tests/external/pseudopotentials/upf-v2/sources/1/files/He.nc.pbe.z_2.oncvpsp4.sg15.v0.upf"), "utf-8");
const hPsp8 = readFileSync(join(process.cwd(), "tests/external/pseudopotentials/psp8/sources/1/files/H.psp8"), "utf-8");

function id<T extends HTMLElement>(x: string): T {
  const n = document.getElementById(x);
  if (!n) throw new Error("missing #" + x);
  return n as T;
}

async function boot(): Promise<void> {
  document.documentElement.innerHTML = html
    .replace(/<link[^>]*>/, "")
    .replace(/<script[^>]*><\/script>/, "");
  // Re-execute the app so listeners bind to the fresh DOM.
  vi.resetModules();
  await import("../pseudo-webapp/src/main");
}

it("pseudo-webapp smoke: load, detect, convert, preview", async () => {
  await boot();
  const input = id<HTMLInputElement>("fileInput");
  const file = new File([heUpf], "He.upf", { type: "text/plain" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  expect(id("sourceMeta").textContent).toContain("He");
  expect(id("sourceMeta").textContent).toContain("UPF2");
  expect(id<HTMLButtonElement>("convertBtn").disabled).toBe(false);

  id<HTMLSelectElement>("targetFormat").value = "PSP8";
  id<HTMLSelectElement>("targetFormat").dispatchEvent(new Event("change", { bubbles: true }));
  id<HTMLButtonElement>("convertBtn").click();
  await new Promise((r) => setTimeout(r, 50));

  expect(id("preview").textContent).toContain("8 11");
  expect(id<HTMLButtonElement>("downloadBtn").disabled).toBe(false);
  expect(id("outputMeta").textContent).toContain("1 of 1");
});

it("pseudo-webapp smoke: zip upload, batch convert, zip download", async () => {
  await boot();
  const zip = new JSZip();
  zip.file("He.upf", heUpf);
  zip.file("sub/H.psp8", hPsp8);
  zip.file("__MACOSX/._junk", "junk");
  const buffer = await zip.generateAsync({ type: "uint8array" });

  const input = id<HTMLInputElement>("fileInput");
  const file = new File([buffer], "batch.zip", { type: "application/zip" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  const items = [...document.querySelectorAll("#fileList li")];
  expect(items.length).toBe(2);
  expect(id("sourceMeta").textContent).toContain("He");

  id<HTMLButtonElement>("convertBtn").click();
  await new Promise((r) => setTimeout(r, 50));
  expect(id("outputMeta").textContent).toContain("2 of 2");
  expect(id<HTMLButtonElement>("downloadBtn").disabled).toBe(false);

  let revoked = false;
  URL.createObjectURL = () => "blob:mock";
  URL.revokeObjectURL = () => {
    revoked = true;
  };
  let clickedHref = "";
  const origCreate = document.createElement.bind(document);
  document.createElement = ((tag: string) => {
    const node = origCreate(tag);
    if (tag === "a") {
      node.click = () => {
        clickedHref = (node as HTMLAnchorElement).href;
      };
    }
    return node;
  }) as typeof document.createElement;
  id<HTMLButtonElement>("downloadBtn").click();
  await new Promise((r) => setTimeout(r, 50));
  expect(clickedHref).toBe("blob:mock");
  expect(revoked).toBe(true);
});
