/**
 * Slippage Sentinel — Agent Entrypoint
 * Built with @lucid-dreams/agent-kit + x402
 */

import { createAgentApp } from "@lucid-dreams/agent-kit";
import { z } from "zod";
import { handleSlippageQuery, SlippageInputSchema } from "./lib/index.js";

const { app, addEntrypoint }: { app: any; addEntrypoint: any } = createAgentApp({
  name: "slippage-sentinel",
  version: "1.0.0",
  description: "Estimate safe slippage tolerance for any swap route",
});

addEntrypoint({
  key: "slippage",
  description: "Estimate safe slippage for a swap route",
  price: process.env.DEFAULT_PRICE ?? "0.001",
  input: SlippageInputSchema,
  async handler({ input }: { input: any }) {
    const result = await handleSlippageQuery(input);
    return {
      output: result,
      usage: { total_tokens: 0 },
    };
  },
});

app.get("/health", (c: any) => c.json({ ok: true, version: "1.0.0" }));

export default app;
export { app };
