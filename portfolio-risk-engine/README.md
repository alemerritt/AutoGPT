# Dynamic Portfolio Risk & Simulation Engine

Interactive single-page React dashboard that parses Charles Schwab
"Individual Positions" CSV exports, pulls live market/macro data, and runs a
full quantitative risk stack over the portfolio:

- **Geometric Brownian Motion Monte Carlo** — 10,000 correlated paths
  (Cholesky factor of the annualized covariance matrix, exact log-space
  discretization), 10-year horizon, monthly steps → fan chart + terminal
  distribution + probability tracking (P(loss), P(2×), P(≥$1M)).
- **Modern Portfolio Theory** — covariance/correlation matrices, long-only
  efficient frontier over NVDA/ASML/AMZN/SMH, max-Sharpe mix, portfolio beta
  vs the S&P 500.
- **Risk metrics** — Sharpe, Sortino (downside deviation), max drawdown,
  historical & parametric VaR (99%, 1-day), Conditional VaR / expected
  shortfall.
- **Stress testing** — sliders for a 10Y-rate spike (duration-based equity
  repricing), a semiconductor-sector drawdown (SMH/NVDA at full beta), and an
  inflation spike (real-drift drag + Fisher rate pass-through), with presets
  for the +250bp / −30% / +20% scenarios and a combined "perfect storm".

## Quick start

```bash
npm install
cp .env.example .env   # optional: add FRED / FMP API keys
npm run dev            # http://localhost:5173
```

Everything works with **zero keys**: any source that is unreachable or
unkeyed falls back to an embedded, clearly-badged snapshot dataset
(seeded synthetic return series with the same correlation structure), so the
math stack never goes dark.

## Data pipelines

| Source | Data | Route | Fallback |
|---|---|---|---|
| Yahoo Finance chart API | 10y daily adjusted closes, volume, dividends for NVDA, ASML, AMZN, AMD, SMH, SPY | `/api/yahoo` proxy (no CORS upstream) | seeded synthetic returns |
| FRED | `DGS10` (risk-free rate), `CPIAUCSL` (CPI YoY) | `/api/fred` proxy + `VITE_FRED_API_KEY` | 4.25% / 2.9% snapshot |
| Financial Modeling Prep | TTM P/E, EV/EBITDA | `/api/fmp` proxy + `VITE_FMP_API_KEY` | filing-derived snapshot |

The Vite dev server provides the proxies (see `vite.config.ts`). For a
production deployment put the static build behind any reverse proxy exposing
the same three `/api/*` routes.

## Portfolio input

The two uploaded Schwab exports are embedded verbatim in
`src/data/rawPositions.ts` and parsed at startup by the CSV parser in
`src/lib/csv.ts` (quoted-field aware, `$`/`%`/thousands-separator tolerant).
Use the **Load Schwab CSVs** button to hot-swap newer exports at runtime —
they route through the same parser.

Modeling notes:

- **SWPPX** (Schwab S&P 500 fund) is modeled with SPY daily data — same index.
- **AMD** is wired through the entire data pipeline and valuation monitor per
  the mandate, but the uploaded exports contain no AMD position, so it
  carries zero portfolio weight.
- The residual small positions (NBIS, CRWV, IONQ, AXON, CDNS, NOW, IBIT) are
  aggregated into a "speculative basket" sleeve modeled as high-beta
  semiconductor/AI exposure with idiosyncratic volatility.

## Where the math lives

| Module | Contents |
|---|---|
| `src/lib/stats.ts` | log returns, covariance, quantiles, Acklam inverse-normal, Cholesky, seeded RNG |
| `src/lib/quant/gbm.ts` | correlated GBM Monte Carlo engine + histogram |
| `src/lib/quant/risk.ts` | Sharpe, Sortino, max drawdown, hist/param VaR, CVaR, beta |
| `src/lib/quant/mpt.ts` | covariance matrix, efficient frontier, max-Sharpe |
| `src/lib/quant/stress.ts` | scenario → (value shock, drift shift, vol regime, rate shift) mapping with documented sensitivities |
| `src/lib/engine.ts` | composition root feeding the UI |

Not investment advice.
