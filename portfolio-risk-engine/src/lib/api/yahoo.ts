/**
 * Yahoo Finance chart API client (routed through the /api/yahoo dev-server
 * proxy — Yahoo sends no CORS headers, so browsers cannot call it directly).
 * Pulls up to 10 years of daily adjusted closes, volume and dividend events.
 */
import { fetchJson } from "./http";

export interface DailyHistory {
  symbol: string;
  timestamps: number[]; // unix seconds
  adjClose: number[];
  volume: number[];
  /** trailing-12-month dividend sum / last price */
  dividendYield: number;
}

interface YahooChartResponse {
  chart: {
    result?: {
      meta: { symbol: string; regularMarketPrice?: number };
      timestamp?: number[];
      indicators: {
        quote?: { volume?: (number | null)[] }[];
        adjclose?: { adjclose?: (number | null)[] }[];
      };
      events?: {
        dividends?: Record<string, { amount: number; date: number }>;
      };
    }[];
    error?: { code: string; description: string } | null;
  };
}

export async function fetchDailyHistory(
  symbol: string,
  range: "5y" | "10y" = "10y",
): Promise<DailyHistory> {
  const url =
    `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=1d&events=div&includeAdjustedClose=true`;
  const data = await fetchJson<YahooChartResponse>(url);

  if (data.chart.error) {
    throw new Error(
      `Yahoo error for ${symbol}: ${data.chart.error.description}`,
    );
  }
  const result = data.chart.result?.[0];
  const ts = result?.timestamp;
  const adj = result?.indicators.adjclose?.[0]?.adjclose;
  const vol = result?.indicators.quote?.[0]?.volume;
  if (!result || !ts || !adj) {
    throw new Error(`Yahoo: malformed chart payload for ${symbol}`);
  }

  // Drop null bars (halts/holidays) while keeping arrays aligned.
  const timestamps: number[] = [];
  const adjClose: number[] = [];
  const volume: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const price = adj[i];
    if (price == null || !Number.isFinite(price) || price <= 0) continue;
    timestamps.push(ts[i]);
    adjClose.push(price);
    volume.push(vol?.[i] ?? 0);
  }
  if (adjClose.length < 100) {
    throw new Error(`Yahoo: insufficient history for ${symbol}`);
  }

  const oneYearAgo = Date.now() / 1000 - 365 * 86400;
  const ttmDividends = Object.values(result.events?.dividends ?? {})
    .filter((d) => d.date >= oneYearAgo)
    .reduce((s, d) => s + d.amount, 0);
  const lastPrice =
    result.meta.regularMarketPrice ?? adjClose[adjClose.length - 1];

  return {
    symbol,
    timestamps,
    adjClose,
    volume,
    dividendYield: lastPrice > 0 ? ttmDividends / lastPrice : 0,
  };
}

/** Fetch several tickers concurrently; resolves per-symbol success/failure. */
export async function fetchHistories(
  symbols: string[],
  range: "5y" | "10y" = "10y",
): Promise<{ ok: Record<string, DailyHistory>; failed: string[] }> {
  const settled = await Promise.allSettled(
    symbols.map((s) => fetchDailyHistory(s, range)),
  );
  const ok: Record<string, DailyHistory> = {};
  const failed: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") ok[symbols[i]] = r.value;
    else failed.push(symbols[i]);
  });
  return { ok, failed };
}
