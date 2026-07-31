/**
 * Slippage calculations for DEX swap safety
 * Core math: Uniswap V2 constant product formula
 */

export interface PoolDepthResult {
  depthIn: number;
  depthOut: number;
  totalDepthUsd: number;
}

export interface TradeImpactResult {
  outputAmount: string;
  priceImpactBps: number;
}

/**
 * Calculate pool depth from reserves
 * @param reserveIn - Reserve of input token (raw units)
 * @param reserveOut - Reserve of output token (raw units)
 * @param decimalsIn - Decimals of input token
 * @param decimalsOut - Decimals of output token
 * @returns Pool depth in normalized units
 */
export function calcPoolDepth(
  reserveIn: string,
  reserveOut: string,
  decimalsIn: number,
  decimalsOut: number
): number {
  const rIn = parseFloat(reserveIn) / Math.pow(10, decimalsIn);
  const rOut = parseFloat(reserveOut) / Math.pow(10, decimalsOut);
  return rIn * rOut; // k = x * y
}

/**
 * Calculate slippage in basis points for a trade
 * Using Uniswap V2 formula: output = (amountIn * reserveOut) / (reserveIn + amountIn)
 * Price impact = 1 - (output / (amountIn * reserveOut / reserveIn))
 * @param amountIn - Input amount (raw units)
 * @param reserveIn - Input token reserve (raw units)
 * @param decimalsIn - Decimals of input token
 * @returns Slippage in basis points (1 bp = 0.01%)
 */
export function calcSlippageBps(
  amountIn: string,
  reserveIn: string,
  decimalsIn: number
): number {
  const amt = parseFloat(amountIn) / Math.pow(10, decimalsIn);
  const res = parseFloat(reserveIn) / Math.pow(10, decimalsIn);
  
  if (amt === 0 || res === 0) return 0;
  
  // Price impact for constant product AMM: impact = amt / (res + amt)
  const impact = amt / (res + amt);
  return impact * 10000; // Convert to basis points
}

/**
 * Estimate trade output and price impact
 */
export function estimateTradeImpact(
  amountIn: string,
  reserveIn: string,
  reserveOut: string,
  decimalsIn: number,
  decimalsOut: number
): TradeImpactResult {
  const amt = parseFloat(amountIn) / Math.pow(10, decimalsIn);
  const resIn = parseFloat(reserveIn) / Math.pow(10, decimalsIn);
  const resOut = parseFloat(reserveOut) / Math.pow(10, decimalsOut);
  
  if (amt === 0 || resIn === 0 || resOut === 0) {
    return { outputAmount: "0", priceImpactBps: 0 };
  }
  
  // Uniswap V2 formula: output = (amt * resOut) / (resIn + amt)
  const outputNormalized = (amt * resOut) / (resIn + amt);
  const outputRaw = Math.floor(outputNormalized * Math.pow(10, decimalsOut));
  
  // Price impact in bps
  const expectedOutput = (amt * resOut) / resIn; // without slippage
  const impact = 1 - (outputNormalized / expectedOutput);
  const priceImpactBps = Math.round(impact * 10000);
  
  return {
    outputAmount: outputRaw.toString(),
    priceImpactBps
  };
}

/**
 * Calculate safe slippage tolerance with buffer
 * @param estimatedImpactBps - Estimated price impact in basis points
 * @param multiplier - Safety multiplier (default 1.5x)
 * @returns Safe slippage in basis points
 */
export function calcSafeSlippage(
  estimatedImpactBps: number,
  multiplier: number = 1.5
): number {
  const safe = Math.round(estimatedImpactBps * multiplier);
  const minSafe = 10; // 10 bps minimum (0.1%)
  const maxSafe = 1000; // 1000 bps maximum (10%)
  
  return Math.min(Math.max(safe, minSafe), maxSafe);
}