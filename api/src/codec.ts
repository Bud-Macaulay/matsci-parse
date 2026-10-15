/**
 * Runtime side of the generated API: turns the type descriptions written by
 * scripts/generate.ts into zod schemas (request validation + OpenAPI), and
 * converts values between JSON and the library's in-memory types
 * (Float64Arrays, Matrix, Lattice, Structure, DisorderedStructure).
 */
import { z } from "@hono/zod-openapi";
import { createLattice } from "../../lib/core/lattice/lattice";
import { createMatrix } from "../../lib/core/matrix/matrix";
import { createDisorderedSite } from "../../lib/core/site/disorder";

/** A JSON-describable type, as extracted from the library's TypeScript. */
export type Desc =
  | { k: "number" | "string" | "boolean" | "null" | "unknown" }
  | { k: "literal"; v: string | number | boolean }
  | { k: "array"; of: Desc }
  | { k: "tuple"; of: Desc[] }
  | { k: "record"; of: Desc }
  | { k: "object"; props: Prop[] }
  | { k: "union"; of: Desc[] }
  | { k: "ref"; name: string }
  // Library types with a fixed JSON form.
  | { k: "structure" | "disordered" | "lattice" | "matrix" | "vector" };

export interface Prop {
  name: string;
  optional: boolean;
  doc?: string;
  type: Desc;
}

export interface Endpoint {
  name: string;
  tag: string;
  doc: string;
  params: Prop[];
  returns: Desc;
  returnsDoc?: string;
  async: boolean;
}

// ---------------------------------------------------------------- schemas

const Vec3 = z.array(z.number()).length(3);
const Rows3 = z.array(Vec3).length(3);

const LatticeSchema = Rows3.openapi({
  description: "Lattice vectors a, b, c as rows, in angstrom.",
});

const StructureSchema = z
  .object({
    lattice: LatticeSchema,
    sites: z.array(
      z.object({
        species: z.string().openapi({ example: "Na" }),
        frac: Vec3.openapi({ description: "Fractional coordinates." }),
      }),
    ),
  })
  .openapi("Structure");

const DisorderedStructureSchema = z
  .object({
    disordered: z.literal(true),
    lattice: LatticeSchema,
    sites: z.array(
      z.object({
        occupancy: z
          .array(z.object({ symbol: z.string(), fraction: z.number().min(0).max(1) }))
          .min(1),
        frac: Vec3,
      }),
    ),
  })
  .openapi("DisorderedStructure", {
    description: "Shared or partially vacant sites; fractions per site sum to at most 1.",
  });

const MatrixSchema = z
  .array(z.array(z.number()))
  .openapi({ description: "Matrix as a list of rows." });

/** Build zod schemas for descriptions; named types become OpenAPI components. */
export function schemaFactory(types: Record<string, Desc>) {
  const named = new Map<string, z.ZodType>();

  function schemaOf(d: Desc): z.ZodType {
    switch (d.k) {
      case "number":
        return z.number();
      case "string":
        return z.string();
      case "boolean":
        return z.boolean();
      case "null":
        return z.null();
      case "unknown":
        return z.unknown();
      case "literal":
        return z.literal(d.v);
      case "array":
        return z.array(schemaOf(d.of));
      case "tuple":
        return z.tuple(d.of.map(schemaOf) as [z.ZodType, ...z.ZodType[]]);
      case "record":
        return z.record(z.string(), schemaOf(d.of));
      case "object":
        return objectOf(d.props);
      case "union": {
        const literals = d.of.every((o) => o.k === "literal" && typeof o.v === "string");
        if (literals) {
          return z.enum(d.of.map((o) => (o as { v: string }).v) as [string, ...string[]]);
        }
        return d.of.length === 1
          ? schemaOf(d.of[0])
          : z.union(d.of.map(schemaOf) as [z.ZodType, z.ZodType, ...z.ZodType[]]);
      }
      case "ref": {
        let s = named.get(d.name);
        if (!s) {
          // Placeholder first, so recursive types terminate.
          named.set(d.name, z.lazy(() => named.get(d.name)!));
          s = schemaOf(types[d.name]).openapi(d.name);
          named.set(d.name, s);
        }
        return s;
      }
      case "structure":
        return StructureSchema;
      case "disordered":
        return DisorderedStructureSchema;
      case "lattice":
        return LatticeSchema;
      case "matrix":
        return MatrixSchema;
      case "vector":
        return z.array(z.number());
    }
  }

  function objectOf(props: Prop[]) {
    const shape: Record<string, z.ZodType> = {};
    for (const p of props) {
      let s = schemaOf(p.type);
      if (p.doc) s = s.openapi({ description: p.doc });
      shape[p.name] = p.optional ? s.optional() : s;
    }
    return z.object(shape);
  }

  return { schemaOf, objectOf };
}

// ---------------------------------------------------------------- values

const rows = (data: ArrayLike<number>, cols: number): number[][] => {
  const out: number[][] = [];
  for (let i = 0; i < data.length; i += cols) out.push(Array.from(data).slice(i, i + cols));
  return out;
};

const isObj = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !ArrayBuffer.isView(v);

/** Converts values according to their descriptions, in both directions. */
export function valueCodec(types: Record<string, Desc>) {
  const { schemaOf } = schemaFactory(types);

  /** JSON -> library value. */
  function decode(d: Desc, v: unknown): unknown {
    if (v === undefined || v === null) return v;
    switch (d.k) {
      case "structure": {
        const w = v as { lattice: number[][]; sites: { species: string; frac: number[] }[] };
        return {
          lattice: createLattice(w.lattice.flat()),
          sites: w.sites.map((s) => ({
            species: { symbol: s.species },
            frac: new Float64Array(s.frac),
          })),
        };
      }
      case "disordered": {
        const w = v as {
          lattice: number[][];
          sites: { occupancy: { symbol: string; fraction: number }[]; frac: number[] }[];
        };
        return {
          disordered: true,
          lattice: createLattice(w.lattice.flat()),
          sites: w.sites.map((s) => createDisorderedSite(s.frac, s.occupancy)),
        };
      }
      case "lattice":
        return createLattice((v as number[][]).flat());
      case "matrix": {
        const m = v as number[][];
        return createMatrix(m.length, m[0]?.length ?? 0, m.flat());
      }
      case "vector":
        return Float64Array.from(v as number[]);
      case "array":
        return (v as unknown[]).map((x) => decode(d.of, x));
      case "tuple":
        return (v as unknown[]).map((x, i) => decode(d.of[i], x));
      case "record":
        return Object.fromEntries(
          Object.entries(v as object).map(([key, x]) => [key, decode(d.of, x)]),
        );
      case "object":
        return Object.fromEntries(
          d.props
            .filter((p) => (v as any)[p.name] !== undefined)
            .map((p) => [p.name, decode(p.type, (v as any)[p.name])]),
        );
      case "ref":
        return decode(types[d.name], v);
      case "union": {
        // First branch whose schema accepts the JSON value.
        const branch = d.of.find((o) => schemaOf(o).safeParse(v).success);
        return branch ? decode(branch, v) : v;
      }
      default:
        return v;
    }
  }

  /** Library value -> JSON. */
  function encode(d: Desc, v: unknown): unknown {
    if (v === undefined || v === null) return null;
    switch (d.k) {
      case "structure": {
        const s = v as any;
        return {
          lattice: rows(s.lattice.basis.data, 3),
          sites: s.sites.map((site: any) => ({
            species: site.species.symbol,
            frac: Array.from(site.frac),
          })),
        };
      }
      case "disordered": {
        const s = v as any;
        return {
          disordered: true,
          lattice: rows(s.lattice.basis.data, 3),
          sites: s.sites.map((site: any) => ({
            occupancy: site.occupancy.map(({ symbol, fraction }: any) => ({ symbol, fraction })),
            frac: Array.from(site.frac),
          })),
        };
      }
      case "lattice":
        return rows((v as any).basis.data, 3);
      case "matrix":
        return rows((v as any).data, (v as any).cols);
      case "vector":
        return Array.from(v as ArrayLike<number>);
      case "array":
        return Array.from(v as ArrayLike<unknown>).map((x) => encode(d.of, x));
      case "tuple":
        return Array.from(v as ArrayLike<unknown>).map((x, i) => encode(d.of[i], x));
      case "record":
        return Object.fromEntries(
          Object.entries(v as object).map(([key, x]) => [key, encode(d.of, x)]),
        );
      case "object":
        return Object.fromEntries(
          d.props
            .filter((p) => (v as any)[p.name] !== undefined)
            .map((p) => [p.name, encode(p.type, (v as any)[p.name])]),
        );
      case "ref":
        return encode(types[d.name], v);
      case "union": {
        const branch = d.of.find((o) => matches(o, v));
        return branch ? encode(branch, v) : plain(v);
      }
      default:
        return plain(v);
    }
  }

  /** Does a library value belong to this description (for picking union branches)? */
  function matches(d: Desc, v: unknown): boolean {
    switch (d.k) {
      case "structure":
        return isObj(v) && Array.isArray(v.sites) && v.disordered !== true;
      case "disordered":
        return isObj(v) && v.disordered === true;
      case "matrix":
        return isObj(v) && "rows" in v && "cols" in v && "data" in v;
      case "lattice":
        return isObj(v) && "basis" in v;
      case "vector":
        return ArrayBuffer.isView(v) || Array.isArray(v);
      case "number":
        return typeof v === "number";
      case "string":
        return typeof v === "string";
      case "boolean":
        return typeof v === "boolean";
      case "null":
        return v === null;
      case "literal":
        return v === d.v;
      case "array":
      case "tuple":
        return Array.isArray(v) || ArrayBuffer.isView(v);
      case "ref":
        return matches(types[d.name], v);
      case "union":
        return d.of.some((o) => matches(o, v));
      default:
        return isObj(v);
    }
  }

  return { decode, encode };
}

/** Fallback for untyped values: typed arrays become plain arrays. */
function plain(v: unknown): unknown {
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>);
  if (Array.isArray(v)) return v.map(plain);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}
