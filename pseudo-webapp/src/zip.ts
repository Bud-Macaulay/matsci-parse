import JSZip from "jszip";

/** A text file extracted from (or destined for) a zip archive. */
export interface ZipEntry {
  /** Full path within the archive. */
  name: string;
  /** Decoded text content. */
  text: string;
}

function isSkippable(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return (
    path.startsWith("__MACOSX/") || base === ".DS_Store" || base === "Thumbs.db"
  );
}

/**
 * Load text entries from zip data, skipping directories and OS metadata.
 * Binary entries decode as mojibake and are left for format detection to
 * reject downstream.
 */
export async function loadEntriesFromZip(
  data: ArrayBuffer | Uint8Array | Blob,
): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(data);
  const out: ZipEntry[] = [];
  for (const name of Object.keys(zip.files).sort()) {
    const entry = zip.files[name];
    if (entry.dir || isSkippable(name)) continue;
    out.push({ name, text: await entry.async("string") });
  }
  return out;
}

/** Build a zip blob from named text files. */
export async function buildOutputZip(
  files: Array<{ name: string; content: string }>,
): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.content);
  return zip.generateAsync({ type: "blob" });
}

/** Basename of an archive path (`dir/file.upf` → `file.upf`). */
export function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Strip the extension (`file.upf` → `file`). */
export function stem(name: string): string {
  return name.replace(/\.[^.]*$/, "") || name;
}

/** Deduplicate an output name, appending -2, -3, … as needed. */
export function uniqueName(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(`${base}-${i}${ext}`)) i++;
  const unique = `${base}-${i}${ext}`;
  used.add(unique);
  return unique;
}
