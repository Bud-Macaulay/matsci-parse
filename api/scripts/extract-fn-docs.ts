/**
 * Extract TSDoc comments from the library source into `src/fn-docs.ts`.
 *
 * Only functions reachable through the top-level entry point (`lib/main.ts`)
 * are included: the export closure is resolved textually (`export *`,
 * `export { a, b as c }`, local declarations, `@/` alias paths), so internal
 * helpers that are never re-exported can never end up in the docs — and a
 * doc always comes from the declaration that actually wins the export.
 *
 * Deliberately a small line-based parser rather than the TypeScript compiler
 * API: the repo is on TypeScript 7 (native), whose programmatic API no longer
 * exposes the classic `ts.*` surface that extraction tools rely on.
 *
 * No runtime cost: the server statically imports the generated map.
 * Regenerate after library doc changes with:
 *
 *   pnpm --filter matsci-api docs:extract
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libDir = resolve(apiDir, "..", "lib");
const entryFile = join(libDir, "main.ts");
const outFile = join(apiDir, "src", "fn-docs.ts");

interface FnDocParam {
  name: string;
  description: string;
}
interface FnDoc {
  description: string;
  params: FnDocParam[];
  returns?: string;
}

const FN_DECL = /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;
const CONST_DECL = /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=/;
const CLASS_ENUM_DECL = /^\s*export\s+(?:abstract\s+)?(?:class|enum)\s+([A-Za-z_$][\w$]*)/;
const STAR_EXPORT = /^\s*export\s+\*\s+from\s*["']([^"']+)["'];?\s*(?:\/\/.*)?$/;
const NS_EXPORT = /^\s*export\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\s*["'][^"']+["'];?\s*(?:\/\/.*)?$/;
const NAMED_EXPORT = /^\s*export\s*\{([^}]*)\}\s*(?:from\s*["']([^"']+)["'])?;?\s*(?:\/\/.*)?$/;

function cleanBlock(lines: string[]): { body: string; tags: string[] } {
  const stripped = lines.map((l) => l.replace(/^\s*\*? ?/, "").trimEnd());
  while (stripped.length > 0 && stripped[0].trim() === "") stripped.shift();
  while (stripped.length > 0 && stripped[stripped.length - 1].trim() === "") stripped.pop();
  const body: string[] = [];
  const tags: string[] = [];
  for (const line of stripped) {
    if (line.trimStart().startsWith("@")) tags.push(line.trim());
    else body.push(line);
  }
  while (body.length > 0 && body[body.length - 1].trim() === "") body.pop();
  return { body: body.join("\n"), tags };
}

function parseDoc(lines: string[]): FnDoc | undefined {
  const { body, tags } = cleanBlock(lines);
  const params: FnDocParam[] = [];
  let returns: string | undefined;
  for (const tag of tags) {
    // Supports `@param name desc`, `@param {T} name desc`, `@param {T} name - desc`.
    const pm = tag.match(/^@param\s+(?:\{[^}]*\}\s+)?(\S+)\s*-?\s*([\s\S]*)$/);
    if (pm) {
      params.push({ name: pm[1].replace(/^\[|\]$/g, ""), description: (pm[2] ?? "").trim() });
      continue;
    }
    const rm = tag.match(/^@returns?\s+(?:\{[^}]*\}\s+)?([\s\S]*)$/);
    if (rm) returns = (rm[1] ?? "").trim() || undefined;
  }
  if (!body && params.length === 0 && !returns) return undefined;
  return { description: body, params, returns };
}

interface FileInfo {
  /** Locally declared, documented functions: local name -> doc. */
  docs: Map<string, FnDoc>;
  /** All locally declared value names (functions, consts, classes, enums), documented or not. */
  values: Set<string>;
  /** Star re-export targets (raw specifiers). */
  stars: string[];
  /** Named re-exports/aliases: exported name -> { specifier | null for local, local name }. */
  named: { exported: string; specifier: string | null; local: string }[];
}

function parseFile(file: string): FileInfo {
  const info: FileInfo = { docs: new Map(), values: new Set(), stars: [], named: [] };
  const fileLines = readFileSync(file, "utf8").split("\n");
  let block: string[] | null = null;
  let inBlock = false;
  let current: string[] = [];
  const takePending = (): string[] | null => {
    const p = block;
    block = null;
    return p;
  };
  for (const raw of fileLines) {
    const line = raw.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      current.push(end >= 0 ? line.slice(0, end) : line);
      if (end >= 0) {
        block = current;
        current = [];
        inBlock = false;
      }
      continue;
    }
    if (line.startsWith("/**")) {
      const rest = line.slice(3);
      const end = rest.indexOf("*/");
      if (end >= 0) block = [rest.slice(0, end)];
      else {
        inBlock = true;
        current = [rest];
      }
      continue;
    }
    if (NS_EXPORT.test(line)) {
      takePending();
      continue;
    }
    const star = line.match(STAR_EXPORT);
    if (star) {
      info.stars.push(star[1]);
      takePending();
      continue;
    }
    const named = line.match(NAMED_EXPORT);
    if (named) {
      const specifier = named[2] ?? null;
      for (const part of named[1].split(",")) {
        const p = part.trim();
        if (!p || p.startsWith("type ")) continue;
        const alias = p.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (alias) info.named.push({ exported: alias[2], specifier, local: alias[1] });
        else if (/^[A-Za-z_$][\w$]*$/.test(p)) info.named.push({ exported: p, specifier, local: p });
      }
      takePending();
      continue;
    }
    if (/^\s*export\s+type\b/.test(raw) || /^\s*export\s+(interface|type)\s/.test(line)) {
      takePending();
      continue;
    }
    const fnName = line.match(FN_DECL)?.[1];
    // Only function-valued consts (arrow / function expression), so data
    // constants like EPSILON never end up in the function docs.
    const constName =
      !fnName && /=/.test(line) && (/=\s*(async\s+)?(\(|function\b)/.test(line) || line.includes("=>"))
        ? line.match(CONST_DECL)?.[1]
        : undefined;
    const name = fnName ?? constName;
    const valueName = name ?? line.match(CLASS_ENUM_DECL)?.[1];
    if (valueName) info.values.add(valueName);
    if (name) {
      const pending = takePending();
      if (pending) {
        const doc = parseDoc(pending);
        if (doc && !info.docs.has(name)) info.docs.set(name, doc);
      }
      continue;
    }
    if (line !== "") takePending(); // comment belongs to nothing; drop it.
  }
  return info;
}

/** Resolve a relative or `@/` import specifier to a file, if it exists. */
function resolveSpecifier(fromFile: string, spec: string): string | null {
  const candidates: string[] = [];
  if (spec.startsWith("@/")) {
    const base = join(libDir, spec.slice(2));
    candidates.push(`${base}.ts`, join(base, "index.ts"));
  } else if (spec.startsWith(".")) {
    const base = resolve(dirname(fromFile), spec);
    candidates.push(`${base}.ts`, join(base, "index.ts"));
  } else {
    return null; // external package; not part of the export closure.
  }
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

const fileCache = new Map<string, FileInfo>();
function getFile(file: string): FileInfo {
  let info = fileCache.get(file);
  if (!info) {
    info = parseFile(file);
    fileCache.set(file, info);
  }
  return info;
}

interface ResolvedExport {
  file: string;
  local: string;
}

interface ModuleExports {
  /** Explicit names (local declarations + named re-exports): winner takes all. */
  explicit: Map<string, ResolvedExport>;
  /** Star-provided names: exported name -> provider list (length > 1 means excluded). */
  starred: Map<string, ResolvedExport[]>;
}

const exportsCache = new Map<string, ModuleExports>();

/**
 * Full export set of one module, mirroring TypeScript: explicit named
 * exports win over `export *`; a name provided by two or more stars (and no
 * explicit export) is excluded. Namespace re-exports (`export * as ns`) do
 * not contribute individual names.
 */
function exportsOf(file: string, seen: Set<string>): ModuleExports {
  const cached = exportsCache.get(file);
  if (cached) return cached;
  const out: ModuleExports = { explicit: new Map(), starred: new Map() };
  if (seen.has(file)) return out; // cycle guard
  seen.add(file);
  const info = getFile(file);

  // Own local declarations are explicit exports of this module.
  for (const name of info.values) {
    if (!out.explicit.has(name)) out.explicit.set(name, { file, local: name });
  }

  const lookup = (target: string, name: string): ResolvedExport | null => {
    const t = exportsOf(target, seen);
    const e = t.explicit.get(name);
    if (e) return e;
    const s = t.starred.get(name);
    return s && s.length === 1 ? s[0] : null;
  };

  for (const n of info.named) {
    if (out.explicit.has(n.exported)) continue;
    if (n.specifier) {
      const target = resolveSpecifier(file, n.specifier);
      if (!target) continue;
      const found = lookup(target, n.local);
      if (found) out.explicit.set(n.exported, found);
    } else if (info.values.has(n.local)) {
      out.explicit.set(n.exported, { file, local: n.local });
    }
  }

  const addStar = (name: string, ref: ResolvedExport) => {
    if (out.explicit.has(name)) return;
    const list = out.starred.get(name) ?? [];
    if (!list.some((r) => r.file === ref.file && r.local === ref.local)) list.push(ref);
    out.starred.set(name, list);
  };

  for (const spec of info.stars) {
    const target = resolveSpecifier(file, spec);
    if (!target) continue;
    const t = exportsOf(target, seen);
    for (const [name, ref] of t.explicit) addStar(name, ref);
    for (const [name, refs] of t.starred) for (const ref of refs) addStar(name, ref);
  }
  seen.delete(file);
  exportsCache.set(file, out);
  return out;
}

/** Top-level export closure of the entry file: name -> winning declaration. */
function resolveClosure(entry: string): Map<string, ResolvedExport> {
  const t = exportsOf(entry, new Set());
  const result = new Map<string, ResolvedExport>(t.explicit);
  for (const [name, refs] of t.starred) {
    if (!result.has(name) && refs.length === 1) result.set(name, refs[0]);
  }
  return result;
}

const closure = resolveClosure(entryFile);
const docs: [string, FnDoc][] = [];
const undocumented: string[] = [];
for (const [name, ref] of [...closure.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
  const doc = getFile(ref.file).docs.get(ref.local);
  if (doc) docs.push([name, doc]);
  else undocumented.push(name);
}

/**
 * Group each top-level export by the `lib/core/*` barrel it resolves
 * through (structure, io, site, ...), following the star order of
 * lib/core/index.ts (first barrel wins). Powers API_GROUPS filtering and
 * the /api/<group>/<name> subpaths.
 */
function resolveGroups(coreFile: string): Map<string, string> {
  const assigned = new Map<string, string>();
  const claim = (barrel: string, group: string) => {
    const t = exportsOf(barrel, new Set());
    const names = new Set<string>([
      ...t.explicit.keys(),
      ...[...t.starred.entries()].filter(([, refs]) => refs.length === 1).map(([n]) => n),
    ]);
    for (const name of names) {
      if (!assigned.has(name)) assigned.set(name, group);
    }
  };
  const coreInfo = getFile(coreFile);
  for (const spec of coreInfo.stars) {
    const barrel = resolveSpecifier(coreFile, spec);
    if (barrel) claim(barrel, basename(spec));
  }
  for (const n of coreInfo.named) {
    if (!n.specifier || n.exported.startsWith("type ")) continue;
    const barrel = resolveSpecifier(coreFile, n.specifier);
    if (!barrel) continue;
    const t = exportsOf(barrel, new Set());
    const hit = t.explicit.get(n.local) ?? t.starred.get(n.local)?.[0];
    if (hit && !assigned.has(n.exported)) assigned.set(n.exported, basename(n.specifier));
  }
  return assigned;
}

const coreFile = resolveSpecifier(entryFile, "./core") ?? join(libDir, "core", "index.ts");
const groupOf = resolveGroups(coreFile);
const groups: [string, string][] = [];
for (const name of [...closure.keys()].sort()) {
  const g = groupOf.get(name);
  if (g) groups.push([name, g]);
}

const header = `/**
 * GENERATED by scripts/extract-fn-docs.ts — do not edit.
 * Regenerate with: pnpm --filter matsci-api docs:extract
 *
 * Contains ONLY functions reachable through the top-level lib/main.ts
 * entry point. Internal helpers are never included.
 */
export interface FnDocParam {
  name: string;
  description: string;
}
export interface FnDoc {
  description: string;
  params: FnDocParam[];
  returns?: string;
}
`;
writeFileSync(
  outFile,
  header + `export const FN_DOCS: Record<string, FnDoc> = ${JSON.stringify(Object.fromEntries(docs), null, 2)};\n`,
);
console.log(
  `Top-level exports resolved: ${closure.size}; with docs: ${docs.length}; without docs: ${undocumented.length}.`,
);
if (undocumented.length > 0) console.log(`Undocumented: ${undocumented.join(", ")}`);

const groupsFile = join(apiDir, "src", "fn-groups.ts");
writeFileSync(
  groupsFile,
  `/**
 * GENERATED by scripts/extract-fn-docs.ts — do not edit.
 * Regenerate with: pnpm --filter matsci-api docs:extract
 *
 * Maps each top-level export to the lib/core/* barrel it resolves through
 * (structure, io, site, ...). Powers API_GROUPS filtering and the
 * /api/<group>/<name> subpaths.
 */
export const FN_GROUPS: Record<string, string> = ${JSON.stringify(Object.fromEntries(groups), null, 2)};
`,
);
const groupCounts = new Map<string, number>();
for (const [, g] of groups) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
console.log(
  `Grouped ${groups.length} exports: ${[...groupCounts.entries()].map(([g, n]) => `${g}(${n})`).join(", ")}`,
);
