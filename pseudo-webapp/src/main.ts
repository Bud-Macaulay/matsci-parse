import {
  detectFormat,
  parse,
  serialize,
  canSerialize,
  type PseudopotentialFormat,
} from "@/core/io/pseudo/registry";
import { validate } from "@/core/pseudopotential/validate";
import type { Pseudopotential } from "@/core/pseudopotential/pseudopotential";
import {
  loadEntriesFromZip,
  buildOutputZip,
  basename,
  stem,
  uniqueName,
} from "./zip";

const EXT: Record<PseudopotentialFormat, string> = {
  UPF2: "upf",
  UPF1: "upf",
  PSP8: "psp8",
  PSML: "psml",
  CPI: "cpi",
  GTH: "gth",
  HGH: "hgh",
};

const PREVIEW_LINES = 300;

interface SourceEntry {
  name: string;
  text: string;
  format: PseudopotentialFormat | null;
  pp: Pseudopotential | null;
  error: string | null;
  output: string | null;
  outputError: string | null;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

const fileInput = el<HTMLInputElement>("fileInput");
const dropzone = el<HTMLDivElement>("dropzone");
const fileList = el<HTMLUListElement>("fileList");
const sourceMeta = el<HTMLDivElement>("sourceMeta");
const sourceIssues = el<HTMLDivElement>("sourceIssues");
const targetFormat = el<HTMLSelectElement>("targetFormat");
const targetWarnings = el<HTMLDivElement>("targetWarnings");
const convertBtn = el<HTMLButtonElement>("convertBtn");
const downloadBtn = el<HTMLButtonElement>("downloadBtn");
const outputMeta = el<HTMLDivElement>("outputMeta");
const preview = el<HTMLElement>("preview");

let sources: SourceEntry[] = [];
let selected = 0;

function rows(pairs: Array<[string, string]>): string {
  return `<table>${pairs
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("")}</table>`;
}

function describeError(err: unknown): string {
  return String(err instanceof Error ? err.message : err);
}

async function loadFiles(files: File[]): Promise<void> {
  sources = [];
  selected = 0;
  downloadBtn.disabled = true;
  preview.textContent = "Nothing converted yet.";
  outputMeta.innerHTML = "";
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      try {
        for (const entry of await loadEntriesFromZip(await file.arrayBuffer())) {
          sources.push({
            name: `${file.name}/${entry.name}`,
            text: entry.text,
            format: null,
            pp: null,
            error: null,
            output: null,
            outputError: null,
          });
        }
      } catch (err) {
        sources.push({
          name: file.name,
          text: "",
          format: null,
          pp: null,
          error: `unzip failed: ${describeError(err)}`,
          output: null,
          outputError: null,
        });
      }
    } else {
      sources.push({
        name: file.name,
        text: await file.text(),
        format: null,
        pp: null,
        error: null,
        output: null,
        outputError: null,
      });
    }
  }
  for (const entry of sources) {
    if (entry.error || !entry.text) {
      if (!entry.error) entry.error = "empty file";
      continue;
    }
    try {
      const format = detectFormat(entry.text);
      entry.format = format;
      entry.pp = parse(entry.text, format);
    } catch (err) {
      entry.error = describeError(err);
    }
  }
  renderList();
  renderDetail();
  refreshTargetWarnings();
  convertBtn.disabled = !sources.some((s) => s.pp);
}

function renderList(): void {
  fileList.innerHTML = "";
  sources.forEach((entry, i) => {
    const li = document.createElement("li");
    if (i === selected) li.classList.add("selected");
    const dot = entry.error
      ? `<span class="dot-err">●</span>`
      : `<span class="dot-ok">●</span>`;
    const badge = entry.format ? ` <span class="badge">${entry.format}</span>` : "";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.name;
    li.innerHTML = `${dot}`;
    li.appendChild(name);
    const badgeSpan = document.createElement("span");
    badgeSpan.innerHTML = badge;
    li.appendChild(badgeSpan);
    li.addEventListener("click", () => {
      selected = i;
      renderList();
      renderDetail();
      renderPreview();
    });
    fileList.appendChild(li);
  });
}

function renderDetail(): void {
  const entry = sources[selected];
  if (!entry) {
    sourceMeta.innerHTML = `<p class="hint">No file loaded.</p>`;
    sourceIssues.innerHTML = "";
    return;
  }
  if (!entry.pp) {
    sourceMeta.innerHTML =
      `<p><strong>${entry.name}</strong></p>` +
      `<p class="err">${entry.error ?? "could not parse"}</p>`;
    sourceIssues.innerHTML = "";
    return;
  }
  const pp: Pseudopotential = entry.pp;
  const issues = validate(pp);
  sourceMeta.innerHTML =
    `<p><strong>${entry.name}</strong> (${(entry.text.length / 1024).toFixed(1)} KB) ` +
    `detected as <span class="badge">${entry.format}</span></p>` +
    rows([
      ["element", pp.header.element || "(none)"],
      ["type", pp.header.pseudoType],
      ["z valence", String(pp.header.zValence)],
      ["functional", pp.header.functional || "(none)"],
      ["lMax", String(pp.header.lMax)],
      ["mesh points", String(pp.mesh.r.length)],
      ["projectors", String(pp.nonlocal.betas.length)],
      ["wavefunctions", String(pp.pswfc.length)],
      ["wfc cutoff (Ry)", String(pp.header.wfcCutoff)],
      ["units", `${pp.units.energy} / ${pp.units.length}`],
    ]);
  sourceIssues.innerHTML =
    issues.length === 0
      ? `<p class="ok">valid</p>`
      : `<p class="warn">${issues.length} issue(s):</p><ul class="issues">${issues
          .map((issue) => `<li>${issue}</li>`)
          .join("")}</ul>`;
}

function refreshTargetWarnings(): void {
  const parsed = sources.filter((s) => s.pp);
  if (parsed.length === 0) {
    targetWarnings.innerHTML = "";
    return;
  }
  const target = targetFormat.value as PseudopotentialFormat;
  const reasons = [...new Set(parsed.flatMap((s) => canSerialize(s.pp!, target).reasons))];
  targetWarnings.innerHTML =
    reasons.length === 0
      ? `<p class="ok">Safe conversion.</p>`
      : `<p class="warn">Lossy conversion:</p><ul class="issues">${reasons
          .map((r) => `<li>${r}</li>`)
          .join("")}</ul>`;
}

function renderPreview(): void {
  const entry = sources[selected];
  if (!entry?.pp) {
    preview.textContent = "Nothing converted yet.";
    return;
  }
  if (entry.outputError) {
    preview.textContent = "";
    outputMeta.innerHTML = `<p class="err">Conversion failed: ${entry.outputError}</p>`;
    return;
  }
  if (!entry.output) {
    preview.textContent = "Nothing converted yet.";
    return;
  }
  const lines = entry.output.split("\n");
  preview.textContent =
    lines.slice(0, PREVIEW_LINES).join("\n") +
    (lines.length > PREVIEW_LINES ? `\n… (${lines.length - PREVIEW_LINES} more lines)` : "");
}

function doConvert(): void {
  let ok = 0;
  for (const entry of sources) {
    if (!entry.pp) continue;
    try {
      entry.output = serialize(entry.pp, targetFormat.value as PseudopotentialFormat);
      entry.outputError = null;
      ok++;
    } catch (err) {
      entry.output = null;
      entry.outputError = describeError(err);
    }
  }
  const target = targetFormat.value as PseudopotentialFormat;
  outputMeta.innerHTML = rows([
    ["target", target],
    ["converted", `${ok} of ${sources.filter((s) => s.pp).length} parsed file(s)`],
  ]);
  downloadBtn.disabled = ok === 0;
  renderList();
  renderPreview();
}

async function doDownload(): Promise<void> {
  const target = targetFormat.value as PseudopotentialFormat;
  const used = new Set<string>();
  const files: Array<{ name: string; content: string }> = [];
  for (const entry of sources) {
    if (!entry.output) continue;
    files.push({
      name: uniqueName(used, `${stem(basename(entry.name))}.${EXT[target]}`),
      content: entry.output,
    });
  }
  if (files.length === 0) return;
  const blob = await buildOutputZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pseudos-${target.toLowerCase()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

fileInput.addEventListener("change", () => {
  void loadFiles([...(fileInput.files ?? [])]);
});

for (const evt of ["dragover", "dragenter"]) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("over");
  });
}
for (const evt of ["dragleave", "drop"]) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("over");
  });
}
dropzone.addEventListener("drop", (e) => {
  void loadFiles([...(e.dataTransfer?.files ?? [])]);
});

targetFormat.addEventListener("change", refreshTargetWarnings);
convertBtn.addEventListener("click", doConvert);
downloadBtn.addEventListener("click", () => void doDownload());
