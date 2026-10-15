import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`matsci-parse API on http://localhost:${info.port} (docs: /docs)`);
});
