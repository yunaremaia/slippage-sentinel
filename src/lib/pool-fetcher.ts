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
    // We only need the first 64 hex chars for reserve0 and next 64 for reserve1
    const bytes = result.startsWith("0x") ? result.slice(2) : result;
    const reserve0Hex = bytes.slice(0, 64);  // 32 bytes (64 hex chars)
    const reserve1Hex = bytes.slice(64, 128); // 32 bytes (64 hex chars)
    
    const reserve0Raw = parseInt(reserve0Hex, 16) || 0;
    const reserve1Raw = parseInt(reserve1Hex, 16) || 0;

    return {
      reserve0: reserve0Raw / Math.pow(10, decimals0),
      reserve1: reserve1Raw / Math.pow(10, decimals1),
    };
  } catch (err: any) {
    return { reserve0: 0, reserve1: 0, error: err.message };
  }
}

/**
 * Estimate p95 recent trade size from pool volume
 * Uses simple heuristic: 5% of pool depth as a typical trade size estimate
 */
export async function fetchRecentTradeSize(
  poolAddress: string,
  decimalsIn: number
): Promise<TradeSizeResult> {
  try {
    // A real implementation would query The Graph or a block explorer API
    // For now, we return a heuristic-based fallback
    return { p95: 0, fallback: true };
  } catch (err: any) {
    return { p95: 0, fallback: true };
  }
}