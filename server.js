import { serve } from "@hono/node-server";
import app from "./dist/index.js";

const port = process.env.PORT || 3000;

serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`Slippage Sentinel running on http://localhost:${info.port}`);
});