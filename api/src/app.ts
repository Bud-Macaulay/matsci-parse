/**
 * matsci-parse REST API, generated from the library: each `@api`-tagged
 * function (see src/generated.ts) becomes `POST /<module>/<function>` with a
 * JSON body keyed by parameter name. Validation, the OpenAPI spec and the
 * docs page all come from the library's own types and doc comments.
 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { bodyLimit } from "hono/body-limit";
import { schemaFactory, valueCodec, type Endpoint } from "./codec";
import { endpoints, functions, types } from "./generated";

export const VERSION = "0.1.0";

const ErrorSchema = z
  .object({ error: z.string() })
  .openapi("Error", { description: "Why the request could not be served." });

const { schemaOf, objectOf } = schemaFactory(types);
const { decode, encode } = valueCodec(types);

function routeFor(e: Endpoint) {
  const json = (schema: z.ZodType) => ({ "application/json": { schema } });
  return createRoute({
    method: "post",
    path: `/${e.tag}/${e.name}`,
    operationId: e.name,
    tags: [e.tag],
    summary: e.doc.split("\n")[0],
    description: e.doc,
    request: { body: { required: true, content: json(objectOf(e.params)) } },
    responses: {
      200: {
        description: e.returnsDoc ?? "OK",
        content: json(schemaOf(e.returns)),
      },
      400: { description: "Request does not match the schema", content: json(ErrorSchema) },
      422: { description: "The library rejected the input", content: json(ErrorSchema) },
      500: { description: "Server error", content: json(ErrorSchema) },
    },
  });
}

export function createApp() {
  const app = new OpenAPIHono({
    // Schema violations -> 400 naming the offending fields.
    defaultHook: (result, c) => {
      if (!result.success) {
        const msg = result.error.issues
          .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
          .join("; ");
        return c.json({ error: msg }, 400);
      }
    },
  });

  app.use("*", bodyLimit({ maxSize: 10 * 1024 * 1024 }));

  // Anything not handled below is a server-side bug.
  app.onError((err, c) => c.json({ error: err.message }, 500));

  app.get("/health", (c) => c.json({ status: "ok", version: VERSION }));

  for (const e of endpoints) {
    const fn = functions[e.name]!;
    app.openapi(routeFor(e), async (c) => {
      const body = c.req.valid("json") as Record<string, unknown>;
      let result: unknown;
      try {
        const args = e.params.map((p) => decode(p.type, body[p.name]));
        result = await fn(...args);
      } catch (err) {
        // The input passed the schema but the library rejected it.
        return c.json({ error: (err as Error).message }, 422);
      }
      return c.json(encode(e.returns, result) as any, 200);
    });
  }

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "matsci-parse API",
      version: VERSION,
      description: "Generated from the matsci-parse library's @api functions.",
    },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
