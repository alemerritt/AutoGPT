/**
 * Financial Modeling Prep client, via the /api/fmp proxy. Pulls TTM P/E and
 * EV/EBITDA per ticker to compare against the historical 10-K multiples.
 * Requires VITE_FMP_API_KEY; callers fall back to the snapshot without it.
 */
import { ValuationRow } from "../../types";
import { FALLBACK_VALUATIONS } from "../../data/fallback";
import { fetchJson } from "./http";

interface FmpRatiosTTM {
  peRatioTTM?: number;
  enterpriseValueMultipleTTM?: number; // EV/EBITDA
}

const KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;

export async function fetchValuation(symbol: string): Promise<ValuationRow> {
  if (!KEY) throw new Error("FMP: no API key configured");
  const url = `/api/fmp/api/v3/ratios-ttm/${encodeURIComponent(symbol)}?apikey=${KEY}`;
  const rows = await fetchJson<FmpRatiosTTM[]>(url);
  const r = rows?.[0];
  if (!r) throw new Error(`FMP: empty payload for ${symbol}`);

  // Historical 10-K comparables stay from the uploaded-filing snapshot —
  // they are point-in-time by definition.
  const fallback = FALLBACK_VALUATIONS.find((v) => v.symbol === symbol);
  return {
    symbol,
    peTTM: r.peRatioTTM ?? null,
    evToEbitdaTTM: r.enterpriseValueMultipleTTM ?? null,
    historical10K: fallback?.historical10K ?? [],
    source: "live",
  };
}

export async function fetchValuations(
  symbols: string[],
): Promise<{ rows: ValuationRow[]; anyLive: boolean }> {
  const settled = await Promise.allSettled(symbols.map(fetchValuation));
  let anyLive = false;
  const rows = settled.map((r, i) => {
    if (r.status === "fulfilled") {
      anyLive = true;
      return r.value;
    }
    return (
      FALLBACK_VALUATIONS.find((v) => v.symbol === symbols[i]) ?? {
        symbol: symbols[i],
        peTTM: null,
        evToEbitdaTTM: null,
        historical10K: [],
        source: "snapshot" as const,
      }
    );
  });
  return { rows, anyLive };
}
