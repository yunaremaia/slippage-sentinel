import { describe, it, expect } from "vitest";
import { 
  calcPoolDepth, 
  calcSlippageBps, 
  calcSafeSlippage, 
  estimateTradeImpact 
} from "../src/lib/slippage.js";

describe("Slippage Core Calculations", () => {
  describe("calcPoolDepth", () => {
    it("calculates pool depth from reserves", () => {
      // 1000 ETH + 2,000,000 USDC (6 decimals) = pool depth
      const depth = calcPoolDepth("1000000000000000000000", "2000000000000", 18, 6);
      expect(depth).toBeGreaterThan(0);
    });

    it("handles zero reserves", () => {
      const depth = calcPoolDepth("0", "0", 18, 6);
      expect(depth).toBe(0);
    });

    it("works with different decimal configurations", () => {
      // WETH (18) / USDC (6)
      const depth1 = calcPoolDepth("1000000000000000000000", "2000000000000", 18, 6);
      // USDC (6) / USDT (6)
      const depth2 = calcPoolDepth("1000000000000", "1000000000000", 6, 6);
      expect(depth1).toBeGreaterThan(0);
      expect(depth2).toBeGreaterThan(0);
    });
  });

  describe("calcSlippageBps", () => {
    it("calculates slippage in basis points for a given trade", () => {
      // Trade 10 ETH in 1000 ETH pool = ~1% price impact = ~99 bps
      const slippage = calcSlippageBps(
        "10000000000000000000", // 10 ETH
        "1000000000000000000000", // ETH reserve
        18
      );
      expect(slippage).toBeCloseTo(99, 0); // ~99 bps (0.99%)
    });

    it("returns 0 for zero amount", () => {
      const slippage = calcSlippageBps("0", "1000000000000000000000", 18);
      expect(slippage).toBe(0);
    });

    it("increases with trade size relative to pool", () => {
      const small = calcSlippageBps("1000000000000000000", "1000000000000000000000", 18); // 1 ETH
      const large = calcSlippageBps("100000000000000000000", "1000000000000000000000", 18); // 100 ETH
      expect(large).toBeGreaterThan(small);
    });
  });

  describe("estimateTradeImpact", () => {
    it("estimates output amount after slippage", () => {
      const result = estimateTradeImpact(
        "10000000000000000000", // 10 ETH in
        "1000000000000000000000", // 1000 ETH reserve
        "2000000000000", // 2M USDC reserve
        18, 6
      );
      expect(Number(result.outputAmount)).toBeGreaterThan(0);
      expect(result.priceImpactBps).toBeGreaterThan(0);
    });

    it("returns zero output for zero input", () => {
      const result = estimateTradeImpact("0", "1000000000000000000000", "2000000000000", 18, 6);
      expect(result.outputAmount).toBe("0");
      expect(result.priceImpactBps).toBe(0);
    });
  });

  describe("calcSafeSlippage", () => {
    it("returns safe slippage buffer above estimated impact", () => {
      const safe = calcSafeSlippage(
        50,  // estimated impact: 50 bps (0.5%)
        1.5  // 1.5x multiplier
      );
      expect(safe).toBe(75); // 50 * 1.5 = 75 bps
    });

    it("enforces minimum safe slippage", () => {
      const safe = calcSafeSlippage(5, 1.5); // tiny impact
      expect(safe).toBeGreaterThanOrEqual(10); // min 10 bps
    });

    it("caps at maximum reasonable slippage", () => {
      const safe = calcSafeSlippage(5000, 2.0); // huge impact
      expect(safe).toBeLessThanOrEqual(1000); // max 10% (1000 bps)
    });
  });
});