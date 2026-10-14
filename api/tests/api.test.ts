import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { FN_DOCS } from "../src/fn-docs";
import * as realLib from "../../lib/main";

const servers: import("node:http").Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
  );
});

async function serve(app: Express): Promise<string> {
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function post(base: string, name: string, body: unknown) {
  const res = await fetch(`${base}/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const fakeLib = {
  add: (a: number, b: number) => a + b,
  asyncDouble: async (x: number) => x * 2,
  boom: () => {
    throw new Error("kaput");
  },
  big: () => 10n,
  nothing: () => undefined,
  notAFunction: 42,
  MyClass: class MyClass {},
};

describe("discovery", () => {
  it("exposes real library functions and skips data exports", () => {
    const { discovery } = createApp(realLib as unknown as Record<string, unknown>);
    expect(discovery.functions.size).toBeGreaterThan(100);
    expect(discovery.functions.has("gcd")).toBe(true);
    // Non-function exports are never exposed.
    expect(discovery.functions.has("EPSILON")).toBe(false);
    expect(discovery.functions.has("PeriodicTable")).toBe(false);
    expect(discovery.functions.has("kpoints")).toBe(false);
    expect(discovery.skippedNonFunctions.length).toBeGreaterThan(0);
  });

  it("skips class constructors and non-functions", () => {
    const { discovery } = createApp(fakeLib as unknown as Record<string, unknown>);
    expect([...discovery.functions.keys()].sort()).toEqual([
      "add",
      "asyncDouble",
      "big",
      "boom",
      "nothing",
    ]);
    expect(discovery.skippedClasses).toEqual(["MyClass"]);
    expect(discovery.skippedNonFunctions).toEqual(["notAFunction"]);
  });

  it("never exposes internal (non-top-level) helpers", () => {
    // These exist in lib/ but are not re-exported through lib/main.ts.
    const { discovery } = createApp(realLib as unknown as Record<string, unknown>);
    for (const name of ["sampleLinear", "sampleNearest", "mul", "sub", "add", "clone", "scale"]) {
      expect(discovery.functions.has(name)).toBe(false);
    }
  });

  it("honours an allowlist", () => {
    const { discovery } = createApp(realLib as unknown as Record<string, unknown>, {
      allowlist: ["gcd"],
    });
    expect([...discovery.functions.keys()]).toEqual(["gcd"]);
  });

  it("generated docs only cover real top-level exports", () => {
    const topLevel = new Set(Object.keys(realLib));
    for (const name of Object.keys(FN_DOCS)) {
      expect(topLevel.has(name)).toBe(true);
    }
    expect(FN_DOCS["gcd"]?.description).toBe("Greatest common divisor.");
  });
});

const NACL_POSCAR = `NaCl
1.0
3.0 0.0 0.0
0.0 3.0 0.0
0.0 0.0 3.0
Na Cl
1 1
Cartesian
0.0 0.0 0.0
1.5 1.5 1.5
`;

describe("groups and subpaths", () => {
  it("group filter exposes only structure + io", () => {
    const { discovery } = createApp(realLib as unknown as Record<string, unknown>, {
      groups: ["structure", "io"],
    });
    expect(discovery.functions.has("fromPOSCAR")).toBe(true);
    expect(discovery.functions.has("hillFormula")).toBe(true);
    expect(discovery.functions.has("parseFormula")).toBe(true);
    expect(discovery.functions.has("gcd")).toBe(false);
    expect(discovery.functions.has("lcm")).toBe(false);
  });

  it("serves grouped subpaths and rejects the wrong group", async () => {
    const base = await serve(
      createApp(realLib as unknown as Record<string, unknown>, {
        groups: ["structure", "io"],
      }).app,
    );
    // IO readers take plain strings over JSON.
    const ok = await post(base, "io/fromPOSCAR", { args: [NACL_POSCAR] });
    expect(ok.status).toBe(200);
    const structure = (ok.json as { result: { sites: unknown[] } }).result;
    expect(structure.sites).toHaveLength(2);
    // Same call through the flat route also works while the group is enabled.
    const flat = await post(base, "fromPOSCAR", { args: [NACL_POSCAR] });
    expect(flat.status).toBe(200);
    // Right function, wrong group -> 404.
    const wrong = await post(base, "structure/fromPOSCAR", { args: [NACL_POSCAR] });
    expect(wrong.status).toBe(404);
    // Filtered-out group -> 404 on both shapes.
    expect((await post(base, "gcd", { args: [48, 18] })).status).toBe(404);
    expect((await post(base, "math/gcd", { args: [48, 18] })).status).toBe(404);
  });

  it("grouped-only mode drops the flat root routes", async () => {
    const base = await serve(
      createApp(realLib as unknown as Record<string, unknown>, {
        groups: ["structure", "io"],
        flatRoutes: false,
      }).app,
    );
    // /api/addVacuum is gone (JSON 404, not Express's HTML page).
    const flat = await post(base, "fromPOSCAR", { args: [NACL_POSCAR] });
    expect(flat.status).toBe(404);
    expect((flat.json as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    // Only the subpath serves it.
    const sub = await post(base, "io/fromPOSCAR", { args: [NACL_POSCAR] });
    expect(sub.status).toBe(200);
    // The spec mirrors the served surface.
    const spec = (await (await fetch(`${base}/openapi.json`)).json()) as {
      paths: Record<string, unknown>;
    };
    expect(spec.paths["/api/io/fromPOSCAR"]).toBeDefined();
    expect(spec.paths["/api/fromPOSCAR"]).toBeUndefined();
  });

  it("chained workflow: parse a string, then analyse the structure", async () => {
    const base = await serve(
      createApp(realLib as unknown as Record<string, unknown>, {
        groups: ["structure", "io"],
      }).app,
    );
    const parsed = await post(base, "io/fromPOSCAR", { args: [NACL_POSCAR] });
    expect(parsed.status).toBe(200);
    const structure = (parsed.json as { result: unknown }).result;
    const formula = await post(base, "structure/hillFormula", { args: [structure] });
    expect(formula.json).toEqual({ result: "ClNa" });
    const cif = await post(base, "io/toCIF", { args: [structure] });
    expect((cif.json as { result: string }).result).toContain("_cell_length_a");
  });
});

describe("single calls", () => {
  it("calls a multi-arg sync function (gcd)", async () => {
    const base = await serve(createApp(realLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "gcd", { args: [48, 18] });
    expect(status).toBe(200);
    expect(json).toEqual({ result: 6 });
  });

  it("returns TS objects as JSON (parseFormula)", async () => {
    const base = await serve(createApp(realLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "parseFormula", { args: ["H2O"] });
    expect(status).toBe(200);
    expect(json).toEqual({ result: { H: 2, O: 1 } });
  });

  it("supports async functions", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "asyncDouble", { args: [21] });
    expect(status).toBe(200);
    expect(json).toEqual({ result: 42 });
  });

  it("maps undefined results to null", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "nothing", { args: [] });
    expect(status).toBe(200);
    expect(json).toEqual({ result: null });
  });

  it("404s unknown functions", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "nope", { args: [] });
    expect(status).toBe(404);
    expect((json["error"] as { code: string }).code).toBe("UNKNOWN_FUNCTION");
  });

  it("404s non-function exports and classes", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    for (const name of ["notAFunction", "MyClass"]) {
      const { status } = await post(base, name, { args: [] });
      expect(status).toBe(404);
    }
  });

  it("400s invalid bodies", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    for (const body of [{}, { args: "nope" }, { args: 42 }, []] as unknown[]) {
      const { status } = await post(base, "add", body);
      expect(status).toBe(400);
    }
  });

  it("400s malformed JSON", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const res = await fetch(`${base}/api/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("500s function errors without leaking a stack", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "boom", { args: [] });
    expect(status).toBe(500);
    expect(json).toEqual({ error: { code: "FUNCTION_ERROR", message: "kaput" } });
  });

  it("500s non-serializable results", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const { status, json } = await post(base, "big", { args: [] });
    expect(status).toBe(500);
    expect((json["error"] as { code: string }).code).toBe("SERIALIZATION_ERROR");
  });

  it("405s non-POST methods", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const res = await fetch(`${base}/api/add`);
    expect(res.status).toBe(405);
  });

  it("413s oversized bodies", async () => {
    const base = await serve(
      createApp(fakeLib as unknown as Record<string, unknown>, { bodyLimit: "100" }).app,
    );
    const { status, json } = await post(base, "add", { args: ["x".repeat(2000)] });
    expect(status).toBe(413);
    expect((json["error"] as { code: string }).code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("metadata and batch", () => {
  it("GET /healthz and GET /api", async () => {
    const { app, discovery } = createApp(fakeLib as unknown as Record<string, unknown>);
    const base = await serve(app);
    const health = (await (await fetch(`${base}/healthz`)).json()) as Record<string, unknown>;
    expect(health).toEqual({ status: "ok", functions: discovery.functions.size });
    const list = (await (await fetch(`${base}/api`)).json()) as {
      functions: string[];
      groups: Record<string, string[]>;
    };
    expect(list.functions).toEqual(["add", "asyncDouble", "big", "boom", "nothing"]);
    expect(list.groups).toEqual({ other: ["add", "asyncDouble", "big", "boom", "nothing"] });
  });

  it("serves autogenerated OpenAPI matching the exposed functions", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const spec = (await (await fetch(`${base}/openapi.json`)).json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(spec.openapi).toBe("3.1.0");
    // Only discovered functions get paths; skipped exports do not.
    expect(Object.keys(spec.paths)).toContain("/api/add");
    expect(Object.keys(spec.paths)).toContain("/api/asyncDouble");
    expect(Object.keys(spec.paths)).toContain("/api/batch");
    expect(Object.keys(spec.paths)).not.toContain("/api/notAFunction");
    expect(Object.keys(spec.paths)).not.toContain("/api/MyClass");
  });

  it("enriches the spec with the library's TSDoc comments", async () => {
    const base = await serve(
      createApp(realLib as unknown as Record<string, unknown>).app,
    );
    const spec = (await (await fetch(`${base}/openapi.json`)).json()) as {
      paths: Record<string, { post: { summary: string; description: string } }>;
    };
    expect(spec.paths["/api/gcd"].post.summary).toBe("Greatest common divisor.");
    expect(spec.paths["/api/hillFormula"].post.description).toContain("Hill-ordered");
    expect(spec.paths["/api/hillFormula"].post.description).toContain("`structure`");
  });

  it("serves Swagger UI docs enriched with library TSDoc", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const res = await fetch(`${base}/docs/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("swagger-ui");
  });

  it("POST /api/batch runs calls in order with per-item outcomes", async () => {
    const base = await serve(createApp(fakeLib as unknown as Record<string, unknown>).app);
    const res = await fetch(`${base}/api/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calls: [
          { fn: "add", args: [1, 2] },
          { fn: "asyncDouble", args: [21] },
          { fn: "nope", args: [] },
          { fn: "boom", args: [] },
          { fn: "add", args: "bad" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const { results } = (await res.json()) as { results: unknown[] };
    expect(results).toEqual([
      { ok: true, result: 3 },
      { ok: true, result: 42 },
      { ok: false, error: { code: "UNKNOWN_FUNCTION", message: "Unknown function: nope" } },
      { ok: false, error: { code: "FUNCTION_ERROR", message: "kaput" } },
      {
        ok: false,
        error: {
          code: "INVALID_ARGS",
          message: 'Each call must be of the form {"fn": "<name>", "args": [...]}',
        },
      },
    ]);
  });

  it("rejects empty and oversized batches", async () => {
    const base = await serve(
      createApp(fakeLib as unknown as Record<string, unknown>, { maxBatch: 2 }).app,
    );
    for (const calls of [[], [1, 2, 3].map(() => ({ fn: "add", args: [1, 1] }))] as unknown[][]) {
      const res = await fetch(`${base}/api/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calls }),
      });
      expect(res.status).toBe(400);
    }
  });
});
