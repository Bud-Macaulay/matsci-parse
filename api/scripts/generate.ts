/**
 * Generate the API from the library: every function exported from
 * lib/main.ts whose doc comment carries an `@api` tag becomes an endpoint.
 * Parameter and return types are read from the TypeScript source and written
 * as JSON type descriptions to src/generated.ts, along with the docs.
 *
 *   pnpm --filter matsci-api generate          # write src/generated.ts
 *   pnpm --filter matsci-api generate --check  # fail if it is out of date (CI)
 *
 * Runs on ts-morph, which bundles its own TypeScript for reading source; the
 * library itself still builds with the repo's TypeScript.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { Node, Project, type Symbol as TsSymbol, type Type } from "ts-morph";
import type { Desc, Endpoint, Prop } from "../src/codec";

const root = new URL("../../", import.meta.url).pathname;
const outFile = new URL("../src/generated.ts", import.meta.url).pathname;

/** Library types with a fixed JSON form (see src/codec.ts). */
const DOMAIN: Record<string, Desc["k"]> = {
  Structure: "structure",
  DisorderedStructure: "disordered",
  Lattice: "lattice",
  Matrix: "matrix",
  Float64Array: "vector",
  Vec3: "vector",
  Vector: "vector",
};

const types: Record<string, Desc> = {};

class Unsupported extends Error {}

function docOf(sym: TsSymbol): string | undefined {
  for (const d of sym.getDeclarations()) {
    if (Node.isJSDocable(d)) {
      const text = d.getJsDocs()[0]?.getDescription().trim();
      if (text) return text;
    }
  }
  return undefined;
}

/** A library domain type: matched by name, but only if declared under lib/
 * (dependencies have their own `Lattice` etc.). */
function domainOf(t: Type): Desc | undefined {
  const sym = t.getAliasSymbol() ?? t.getSymbol();
  const name = sym?.getName();
  if (!sym || !name || !DOMAIN[name]) return undefined;
  if (name === "Float64Array") return { k: "vector" };
  const fromLib = sym
    .getDeclarations()
    .some((d) => d.getSourceFile().getFilePath().startsWith(`${root}lib/`));
  return fromLib ? ({ k: DOMAIN[name] } as Desc) : undefined;
}

function nameOf(t: Type): string | undefined {
  const n = t.getAliasSymbol()?.getName() ?? t.getSymbol()?.getName();
  return n && !n.startsWith("__") ? n : undefined;
}

function describe(t: Type, at: Node, depth = 0): Desc {
  if (depth > 20) throw new Unsupported(`type nests too deeply: ${t.getText(at)}`);
  const domain = domainOf(t);
  if (domain) return domain;
  const name = nameOf(t);
  if (name === "ArrayLike" || name === "ReadonlyArray" || name === "Array") {
    const [el] = t.getTypeArguments();
    if (!el) throw new Unsupported(t.getText(at));
    // ArrayLike<number> accepts typed arrays; real arrays stay arrays.
    if (name === "ArrayLike" && el.isNumber()) return { k: "vector" };
    return { k: "array", of: describe(el, at, depth + 1) };
  }
  if (t.isAny() || t.isUnknown()) return { k: "unknown" };
  if (t.isString()) return { k: "string" };
  if (t.isNumber()) return { k: "number" };
  if (t.isBoolean()) return { k: "boolean" };
  if (t.isNull()) return { k: "null" };
  if (t.isStringLiteral() || t.isNumberLiteral()) {
    return { k: "literal", v: t.getLiteralValue() as string | number };
  }
  if (t.isBooleanLiteral()) return { k: "literal", v: t.getText() === "true" };

  if (t.isUnion()) {
    let parts = t.getUnionTypes().filter((u) => !u.isUndefined());
    const bools = parts.filter((u) => u.isBooleanLiteral());
    if (bools.length === 2) {
      parts = parts.filter((u) => !u.isBooleanLiteral());
      const rest = parts.map((u) => describe(u, at, depth + 1));
      return rest.length === 0 ? { k: "boolean" } : { k: "union", of: [{ k: "boolean" }, ...rest] };
    }
    const of = parts.map((u) => describe(u, at, depth + 1));
    return of.length === 1 ? of[0] : { k: "union", of };
  }
  if (t.isTuple()) return { k: "tuple", of: t.getTupleElements().map((e) => describe(e, at, depth + 1)) };
  if (t.isArray()) return { k: "array", of: describe(t.getArrayElementTypeOrThrow(), at, depth + 1) };

  // Intersections (e.g. `Options & { extra?: number }`) read as one object
  // with the merged properties.
  if (t.isObject() || t.isIntersection()) {
    if (t.getCallSignatures().length > 0) throw new Unsupported(`function type ${t.getText(at)}`);
    const index = t.getStringIndexType();
    const props = t.getProperties();
    if (index && props.length === 0) return { k: "record", of: describe(index, at, depth + 1) };

    const ref = name && name !== "Readonly" && name !== "Partial" ? name : undefined;
    if (ref && types[ref]) return { k: "ref", name: ref };
    if (ref) types[ref] = { k: "unknown" }; // reserve: recursive references resolve

    const desc: Desc = {
      k: "object",
      props: props.map((p): Prop => {
        const pt = p.getTypeAtLocation(at);
        return {
          name: p.getName(),
          optional: p.isOptional() || pt.isUndefined() || pt.getUnionTypes().some((u) => u.isUndefined()),
          doc: docOf(p),
          type: describe(pt, at, depth + 1),
        };
      }),
    };
    if (!ref) return desc;
    types[ref] = desc;
    return { k: "ref", name: ref };
  }
  throw new Unsupported(t.getText(at));
}

// ---------------------------------------------------------------- collect

const project = new Project({ tsConfigFilePath: `${root}tsconfig.json` });
const main = project.getSourceFileOrThrow(`${root}lib/main.ts`);

const endpoints: Endpoint[] = [];
const failures: string[] = [];

for (const [name, decls] of main.getExportedDeclarations()) {
  const fn = decls[0];
  if (!fn || !Node.isFunctionDeclaration(fn)) continue;
  const jsdoc = fn.getJsDocs().at(-1);
  if (!jsdoc?.getTags().some((t) => t.getTagName() === "api")) continue;

  try {
    if (fn.getOverloads().length > 0) throw new Unsupported("overloaded function");
    const paramDocs = new Map<string, string>();
    let returnsDoc: string | undefined;
    for (const tag of jsdoc.getTags()) {
      const text = (tag.getCommentText() ?? "").replace(/^[-\s]+/, "").trim();
      if (Node.isJSDocParameterTag(tag)) paramDocs.set(tag.getName(), text);
      else if (tag.getTagName() === "returns") returnsDoc = text;
    }

    const params = fn.getParameters().map((p): Prop => {
      if (!Node.isIdentifier(p.getNameNode())) {
        throw new Unsupported(`destructured parameter ${p.getText()}`);
      }
      return {
        name: p.getName(),
        optional: p.isOptional() || p.hasInitializer(),
        doc: paramDocs.get(p.getName()),
        type: describe(p.getType(), fn),
      };
    });

    let ret = fn.getReturnType();
    const isAsync = nameOf(ret) === "Promise";
    if (isAsync) ret = ret.getTypeArguments()[0]!;

    const file = relative(`${root}lib/core`, fn.getSourceFile().getFilePath());
    endpoints.push({
      name,
      tag: file.split("/")[0]!,
      doc: jsdoc.getDescription().trim(),
      params,
      returns: describe(ret, fn),
      returnsDoc,
      async: isAsync,
    });
  } catch (err) {
    if (!(err instanceof Unsupported)) throw err;
    failures.push(`  ${name}: cannot expose ${err.message}`);
  }
}

if (failures.length > 0) {
  console.error(`@api functions with types the API cannot carry:\n${failures.join("\n")}`);
  process.exit(1);
}

endpoints.sort((a, b) => a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name));
const names = endpoints.map((e) => e.name);

const output = `// GENERATED by api/scripts/generate.ts from the library's @api-tagged
// functions. Do not edit; run \`pnpm --filter matsci-api generate\`.
import type { Desc, Endpoint } from "./codec";
import {
${names.map((n) => `  ${n},`).join("\n")}
} from "../../lib/main";

export const functions: Record<string, (...args: any[]) => unknown> = {
${names.map((n) => `  ${n},`).join("\n")}
};

export const types: Record<string, Desc> = ${JSON.stringify(
  Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b))),
  null,
  2,
)};

export const endpoints: Endpoint[] = ${JSON.stringify(endpoints, null, 2)};
`;

if (process.argv.includes("--check")) {
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  if (current !== output) {
    console.error("src/generated.ts is out of date with the library; run `pnpm --filter matsci-api generate`.");
    process.exit(1);
  }
  console.log(`generated.ts is up to date (${endpoints.length} endpoints)`);
} else {
  writeFileSync(outFile, output);
  console.log(`wrote src/generated.ts: ${endpoints.length} endpoints, ${Object.keys(types).length} named types`);
}
