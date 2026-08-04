# Slippage Sentinel

x402 agent that estimates safe slippage tolerance for any Uniswap V2-style swap route, preventing reverts from price impact.

## Bounty

Daydreams AI Agent Bounties — **#3 Slippage Sentinel** ($1,000)

## What it does

- Queries live pool reserves via Uniswap V2 pair contract (BigInt for precision)
- Estimates pool depth in USD using CoinGecko ETH prices (60s cache)
- Calculates safe slippage based on pool liquidity and trade size
- Returns minimum safe slippage in basis points

## Deploy

- **URL**: https://slippage-sentinel-self.vercel.app
- **Endpoint**: `POST /entrypoints/slippage/invoke`
- **Input**: `{ "token_in": "0x...", "token_out": "0x...", "amount_in": "1000000000000000000", "pool_address": "0x..." }`
- **x402**: Active — returns 402 without payment

## Tests

```bash
npm run test    # vitest: 30/30 passing
npm run build   # tsc: clean
```

## Tech Stack

- TypeScript + Hono + @lucid-dreams/agent-kit
- x402 payment middleware
- Uniswap V2 pair contracts (on-chain reserves)
- CoinGecko price API
- vitest
