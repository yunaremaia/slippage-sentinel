/**
 * Pool data fetching — Uniswap V2 pair reserves + recent trade size estimates
 */

export interface PoolReservesResult {
  reserve0: number;
  reserve1: number;
  error?: string;
}

export interface TradeSizeResult {
  p95: number;
  fallback?: boolean;
}

/**
 * Fetch Uniswap V2 pair reserves via eth_call getReserves()
 * Uses BigInt for reserve decoding to avoid precision loss on large values.
 */
export async function fetchPoolReserves(
  poolAddress: string,
  token0: string,
  token1: string,
  decimals0: number,
  decimals1: number,
  rpcUrl: string
): Promise<PoolReservesResult> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{
          to: poolAddress,
          data: "0x0902f1ac", // getReserves() signature
        }, "latest"],
        id: 1,
      }),
    });

    if (!response.ok) {
      return { reserve0: 0, reserve1: 0, error: `HTTP ${response.status}` };
    }

    const data: any = await response.json();
    const result = data.result;

    if (!result || result === "0x") {
      return { reserve0: 0, reserve1: 0, error: "No reserves data" };
    }

    // Decode: reserves are packed as uint256 (32 bytes = 64 hex chars) each + 4 bytes timestamp
    // Use BigInt to avoid precision loss on large uint256 values
    const bytes = result.startsWith("0x") ? result.slice(2) : result;
    const reserve0Hex = bytes.slice(0, 64);  // 32 bytes (64 hex chars)
    const reserve1Hex = bytes.slice(64, 128); // 32 bytes (64 hex chars)

    const reserve0BigInt = BigInt("0x" + reserve0Hex);
    const reserve1BigInt = BigInt("0x" + reserve1Hex);

    return {
      reserve0: Number(reserve0BigInt) / Math.pow(10, decimals0),
      reserve1: Number(reserve1BigInt) / Math.pow(10, decimals1),
    };
  } catch (err: any) {
    return { reserve0: 0, reserve1: 0, error: err.message };
  }
}

/**
 * Estimate p95 recent trade size from pool reserves + token price.
 * Heuristic: 2% of pool depth (conservative estimate for typical DEX trade size).
 * Returns a USD-denominated estimate.
 */
export async function fetchRecentTradeSize(
  poolAddress: string,
  decimalsIn: number,
  reserveIn?: number,
  tokenPriceUsd?: number
): Promise<TradeSizeResult> {
  try {
    if (!reserveIn || reserveIn <= 0 || !tokenPriceUsd || tokenPriceUsd <= 0) {
      return { p95: 0, fallback: true };
    }
    // 2% of pool depth as typical trade size
    const tradeSizeTokens = reserveIn * 0.02;
    const tradeSizeUsd = tradeSizeTokens * tokenPriceUsd;
    return { p95: Math.round(tradeSizeUsd * 100) / 100, fallback: false };
  } catch {
    return { p95: 0, fallback: true };
  }
}
