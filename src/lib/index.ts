/**
 * Slippage Sentinel — Handler
 * Combines pool data fetching + slippage calculations
 */

import { z } from "zod";
import { 
  calcPoolDepth, 
  calcSlippageBps, 
  estimateTradeImpact, 
  calcSafeSlippage 
} from "./slippage.js";
import { fetchPoolReserves, fetchRecentTradeSize } from "./pool-fetcher.js";

const RPC_URLS: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  polygon: "https://polygon-rpc.com",
  base: "https://mainnet.base.org",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
};

const TOKEN_DECIMALS: Record<string, number> = {
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 18, // WETH
  "0xA0b86a33E6441d84b5F5c76a3b1D8086940e5d4A": 6,   // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": 6,   // USDT
};

export const SlippageInputSchema = z.object({
  token_in: z.string().min(42).max(42),
  token_out: z.string().min(42).max(42),
  amount_in: z.string(),
  pool_address: z.string().min(42).max(42),
  chain: z.string().optional().default("ethereum"),
});

export type SlippageInput = z.infer<typeof SlippageInputSchema>;

export interface SlippageResult {
  min_safe_slip_bps: number;
  pool_depths: { reserve0: number; reserve1: number };
  recent_trade_size_p95: number;
  error?: string;
}

export async function handleSlippageQuery(input: SlippageInput): Promise<SlippageResult> {
  // Validate input
  const validation = SlippageInputSchema.safeParse(input);
  if (!validation.success) {
    const errors = validation.error?.issues || [];
    const errorPath = errors[0]?.path?.join(".") || "unknown field";
    return { 
      min_safe_slip_bps: 0, 
      pool_depths: { reserve0: 0, reserve1: 0 }, 
      recent_trade_size_p95: 0,
      error: `Missing required field: ${errorPath}` 
    };
  }

  const { token_in, token_out, amount_in, pool_address, chain } = validation.data;
  const rpcUrl = RPC_URLS[chain] || RPC_URLS.ethereum;
  const decimalsIn = TOKEN_DECIMALS[token_in.toLowerCase()] || 18;
  const decimalsOut = TOKEN_DECIMALS[token_out.toLowerCase()] || 18;

  try {
    // Fetch pool reserves
    const reserves = await fetchPoolReserves(
      pool_address,
      token_in,
      token_out,
      decimalsIn,
      decimalsOut,
      rpcUrl
    );

    if (reserves.error || reserves.reserve0 === 0 || reserves.reserve1 === 0) {
      return {
        min_safe_slip_bps: 50, // Default 50 bps
        pool_depths: { reserve0: 0, reserve1: 0 },
        recent_trade_size_p95: 0,
        error: reserves.error || "Could not fetch pool reserves",
      };
    }

    // Calculate trade impact
    const impact = estimateTradeImpact(
      amount_in,
      String(Math.floor(reserves.reserve0 * Math.pow(10, decimalsIn))),
      String(Math.floor(reserves.reserve1 * Math.pow(10, decimalsOut))),
      decimalsIn,
      decimalsOut
    );

    // Calculate safe slippage
    const safeSlippage = calcSafeSlippage(impact.priceImpactBps);

    // Get recent trade size estimate
    const tradeSize = await fetchRecentTradeSize(pool_address, decimalsIn);

    return {
      min_safe_slip_bps: safeSlippage,
      pool_depths: { reserve0: reserves.reserve0, reserve1: reserves.reserve1 },
      recent_trade_size_p95: tradeSize.p95,
    };
  } catch (err: any) {
    return {
      min_safe_slip_bps: 50,
      pool_depths: { reserve0: 0, reserve1: 0 },
      recent_trade_size_p95: 0,
      error: err.message,
    };
  }
}