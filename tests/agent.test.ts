import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSlippageQuery } from "../src/lib/index.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Slippage Sentinel Agent — Handler Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles valid slippage query", async () => {
    const packed = "00".repeat(31) + "64" + "00".repeat(31) + "c8" + "00".repeat(32);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x" + packed }),
    });

    const result = await handleSlippageQuery({
      token_in: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      token_out: "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A",
      amount_in: "10000000000000000000",
      pool_address: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
      chain: "ethereum",
    });

    expect(result.min_safe_slip_bps).toBeGreaterThan(0);
    expect(result.pool_depths).toBeDefined();
    expect(result.recent_trade_size_p95).toBeDefined();
  });

  it("returns error for missing token_in", async () => {
    const result = await handleSlippageQuery({
      token_out: "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A",
      amount_in: "10000000000000000000",
      pool_address: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
      chain: "ethereum",
    });

    expect(result.error).toBeTruthy();
  });

  it("returns error for missing pool_address", async () => {
    const result = await handleSlippageQuery({
      token_in: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      token_out: "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A",
      amount_in: "10000000000000000000",
      chain: "ethereum",
    });

    expect(result.error).toBeTruthy();
  });

  it("handles RPC failure gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("RPC down"));

    const result = await handleSlippageQuery({
      token_in: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      token_out: "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A",
      amount_in: "10000000000000000000",
      pool_address: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
      chain: "ethereum",
    });

    expect(result.error).toBeTruthy();
  });
});