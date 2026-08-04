import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/index.js";
import { fetchPoolReserves, fetchRecentTradeSize } from "../src/lib/pool-fetcher.js";

describe("pool-fetcher", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("decode reserves using BigInt (no precision loss for large values)", async () => {
    // Simulate a getReserves response with a large reserve value (>2^53)
    // reserve0 = 2^60 (exceeds Number.MAX_SAFE_INTEGER)
    const largeReserve = (2n ** 60n).toString(16).padStart(64, "0");
    const reserve1 = "de0b6b3a7640000".padStart(64, "0"); // 1e18 in hex, padded to 64 chars
    const mockResult = "0x" + largeReserve + reserve1 + "00000000";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockResult }),
    }));

    const r = await fetchPoolReserves("0xPool", "0xToken0", "0xToken1", 18, 18, "https://rpc.example.com");
    expect(r.error).toBeUndefined();
    // 2^60 / 1e18 = 1152921.504606847
    expect(r.reserve0).toBeCloseTo(1.152921504606847, 6);
    expect(r.reserve1).toBeCloseTo(1, 6);
    vi.unstubAllGlobals();
  });

  it("fetchRecentTradeSize returns real estimate when reserves+price provided", async () => {
    const r = await fetchRecentTradeSize("0xPool", 18, 1000, 2500);
    expect(r.fallback).toBe(false);
    expect(r.p95).toBe(50000); // 2% of 1000 tokens * $2500 = 20 * 2500
  });

  it("fetchRecentTradeSize returns fallback when no data", async () => {
    const r = await fetchRecentTradeSize("0xPool", 18);
    expect(r.fallback).toBe(true);
    expect(r.p95).toBe(0);
  });
});

describe("Slippage Sentinel agent — x402", () => {
  it("health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("expõe .well-known/agent.json e entrypoints", async () => {
    const res = await app.request("/.well-known/agent.json");
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe("slippage-sentinel");

    const eps = await app.request("/entrypoints");
    expect(eps.status).toBe(200);
    const { items } = await eps.json();
    expect(items.map((i: any) => i.key)).toContain("slippage");
  });

  it("x402: POST invoke sem pagamento → 402 + paymentRequirements", async () => {
    const res = await app.request("/entrypoints/slippage/invoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: {
          token_in: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          token_out: "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A",
          amount_in: "1000000000000000000",
          pool_address: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
        },
      }),
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toContain("X-PAYMENT");
    expect(Array.isArray(body.accepts)).toBe(true);
    const req = body.accepts[0];
    expect(req.network).toBeDefined();
    expect(req.maxAmountRequired).toBeDefined();
    expect(req.payTo).toBeDefined();
  });
});
