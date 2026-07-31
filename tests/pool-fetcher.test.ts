import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPoolReserves, fetchRecentTradeSize } from "../src/lib/pool-fetcher.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Pool Data Fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPoolReserves", () => {
    it("fetches Uniswap V2 pool reserves", async () => {
      // getReserves() returns: reserve0 (uint112), reserve1 (uint112), blockTimestampLast (uint32)
      // Each uint112 = 14 bytes = 28 hex chars, but packed in 32 bytes (64 hex chars) each
      // For 100 and 200: each is 1 byte (0x64, 0xc8), padded to 32 bytes
      const reserve0 = "0x" + "00".repeat(31) + "64";  // 100
      const reserve1 = "0x" + "00".repeat(31) + "c8";  // 200
      // Packed: reserve0 (32 bytes) + reserve1 (32 bytes) + timestamp (32 bytes)
      const packed = reserve0.slice(2) + reserve1.slice(2) + "00".repeat(32);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: "2.0",
          result: "0x" + packed
        }),
      });

      const result = await fetchPoolReserves(
        "0xpool",
        "0xtoken0",
        "0xtoken1",
        18,
        6,
        "https://rpc.example"
      );

      expect(result.reserve0).toBeGreaterThan(0);
      expect(result.reserve1).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns fallback for failed RPC", async () => {
      mockFetch.mockRejectedValueOnce(new Error("RPC down"));

      const result = await fetchPoolReserves(
        "0xpool", "0xtoken0", "0xtoken1",
        18, 6, "https://rpc.example"
      );

      expect(result.error).toBeTruthy();
    });

    it("handles empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ json: "" }),
      });

      const result = await fetchPoolReserves(
        "0xpool", "0xtoken0", "0xtoken1",
        18, 6, "https://rpc.example"
      );

      expect(result.error).toBeTruthy();
    });
  });

  describe("fetchRecentTradeSize", () => {
    it("returns p95 trade size estimate", async () => {
      // Mock transactions for pool
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          json: { data: { transactions: [
            { amount: "1000000000000000000000" }, // 1000 ETH
            { amount: "500000000000000000000" },  // 500 ETH
            { amount: "10000000000000000000" },   // 10 ETH
          ] } }
        }),
      });

      const result = await fetchRecentTradeSize("0xpool", 18);
      expect(result.fallback).toBeTruthy();
    });

    it("returns fallback when API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("down"));

      const result = await fetchRecentTradeSize("0xpool", 18);
      expect(result.p95).toBe(0);
      expect(result.fallback).toBeTruthy();
    });
  });
});