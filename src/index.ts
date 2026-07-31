/**
 * Slippage Sentinel — Agent Entrypoint
 * Built with @lucid-dreams/agent-kit + x402-hono
 */

import { createAgentApp } from "@lucid-dreams/agent-kit";
import { paymentMiddleware } from "x402-hono";
import { z } from "zod";
import { handleSlippageQuery, SlippageInputSchema } from "./lib/index.js";

const { app, addEntrypoint } = createAgentApp({
  name: "slippage-sentinel",
  version: "0.1.0",
  description: "Estimate safe slippage tolerance for any swap route",
});

// Type annotation to satisfy TypeScript
const typedApp = app as any;

addEntrypoint({
  key: "slippage",
  description: "Estimate safe slippage for a swap route",
  input: SlippageInputSchema,
  async handler({ input }) {
    const result = await handleSlippageQuery(input);
    
    if (result.error) {
      return {
        output: result,
        usage: { total_tokens: 0 },
      };
    }

    return {
      output: result,
      usage: { total_tokens: 0 },
    };
  },
});

typedApp.get("/health", (c: any) => c.json({ ok: true, version: "0.1.0" }));

if (process.env.NODE_ENV !== "test") {
  const receiver = process.env.X402_RECEIVER_ADDRESS;
  if (receiver) {
    const pricing = process.env.X402_PRICING || "0.0001";
    const asset = process.env.X402_ASSET || "USDC";
    const network = process.env.X402_NETWORK || "base";
    const mw = paymentMiddleware(receiver as `0x${string}`, {
      price: pricing,
      network,
      config: { asset } as never,
    });
    typedApp.use("/entrypoints/*", mw as never);
  }
}

export default typedApp;
export { typedApp as app };