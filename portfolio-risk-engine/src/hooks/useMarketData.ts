/**
 * Orchestrates the three live pipelines (Yahoo history, FRED macro, FMP
 * valuations) with independent snapshot fallbacks, and produces the aligned
 * per-asset daily log-return series the quant modules consume.
 */
import { useEffect, useState } from "react";
import {
  AssetKey,
  MacroData,
  MarketStats,
  MODELED_ASSETS,
  SourceStatus,
  ValuationRow,
} from "../types";
import {
  FALLBACK_ASSET_PARAMS,
  FALLBACK_MACRO,
  FALLBACK_VALUATIONS,
  synthesizeReturns,
} from "../data/fallback";
import { DailyHistory, fetchHistories } from "../lib/api/yahoo";
import { fetchMacro } from "../lib/api/fred";
import { fetchValuations } from "../lib/api/fmp";
import {
  logReturns,
  makeGaussian,
  mean,
  mulberry32,
  sampleStd,
  TRADING_DAYS,
} from "../lib/stats";

const YAHOO_SYMBOLS: AssetKey[] = ["NVDA", "ASML", "AMZN", "AMD", "SMH", "SPY"];
const VALUATION_SYMBOLS = ["NVDA", "ASML", "AMZN", "AMD"];
/** Residual basket ≈ leveraged semiconductor/AI exposure + idiosyncratic risk. */
const OTHER_SMH_BETA = 1.2;
const OTHER_TARGET_VOL = FALLBACK_ASSET_PARAMS.OTHER.vol;

export interface MarketDataState {
  stats: MarketStats;
  macro: MacroData;
  valuations: ValuationRow[];
  status: { yahoo: SourceStatus; fred: SourceStatus; fmp: SourceStatus };
  yahooDetail: string;
}

function snapshotStats(): MarketStats {
  const synth = synthesizeReturns(MODELED_ASSETS);
  const stats = {} as MarketStats;
  for (const a of MODELED_ASSETS) {
    stats[a] = {
      logDrift: FALLBACK_ASSET_PARAMS[a].logDrift,
      vol: FALLBACK_ASSET_PARAMS[a].vol,
      returns: synth[a],
    };
  }
  return stats;
}

/** Intersect trading days across symbols, then take aligned log returns. */
function alignHistories(
  histories: Record<string, DailyHistory>,
  symbols: AssetKey[],
): Record<AssetKey, number[]> {
  // Use day-granularity keys: Yahoo timestamps differ intraday per exchange.
  const dayKey = (ts: number) => Math.floor(ts / 86_400);
  let common = new Set(histories[symbols[0]].timestamps.map(dayKey));
  for (const s of symbols.slice(1)) {
    const days = new Set(histories[s].timestamps.map(dayKey));
    common = new Set([...common].filter((d) => days.has(d)));
  }
  const commonSorted = [...common].sort((a, b) => a - b);

  const out = {} as Record<AssetKey, number[]>;
  for (const s of symbols) {
    const h = histories[s];
    const byDay = new Map<number, number>();
    h.timestamps.forEach((ts, i) => byDay.set(dayKey(ts), h.adjClose[i]));
    const prices = commonSorted.map((d) => byDay.get(d)!);
    out[s] = logReturns(prices);
  }
  return out;
}

function liveStats(histories: Record<string, DailyHistory>): MarketStats {
  const aligned = alignHistories(histories, YAHOO_SYMBOLS);

  // Synthesize the OTHER sleeve from live SMH returns plus seeded
  // idiosyncratic noise sized to hit the basket's target volatility.
  const smh = aligned.SMH;
  const smhVar = sampleStd(smh) ** 2;
  const targetDailyVar = OTHER_TARGET_VOL ** 2 / TRADING_DAYS;
  const idioVar = Math.max(0, targetDailyVar - OTHER_SMH_BETA ** 2 * smhVar);
  const idioStd = Math.sqrt(idioVar);
  const gauss = makeGaussian(mulberry32(0x07e4));
  const otherDailyDrift = FALLBACK_ASSET_PARAMS.OTHER.logDrift / TRADING_DAYS;
  const smhMean = mean(smh);
  aligned.OTHER = smh.map(
    (r) => otherDailyDrift + OTHER_SMH_BETA * (r - smhMean) + idioStd * gauss(),
  );

  const stats = {} as MarketStats;
  for (const a of MODELED_ASSETS) {
    const rets = aligned[a];
    stats[a] = {
      logDrift: mean(rets) * TRADING_DAYS,
      vol: sampleStd(rets) * Math.sqrt(TRADING_DAYS),
      returns: rets,
    };
  }
  return stats;
}

export function useMarketData(): MarketDataState {
  const [state, setState] = useState<MarketDataState>(() => ({
    stats: snapshotStats(),
    macro: FALLBACK_MACRO,
    valuations: FALLBACK_VALUATIONS,
    status: { yahoo: "loading", fred: "loading", fmp: "loading" },
    yahooDetail: "Fetching 10y daily history…",
  }));

  useEffect(() => {
    let cancelled = false;

    fetchHistories(YAHOO_SYMBOLS, "10y").then(({ ok, failed }) => {
      if (cancelled) return;
      if (failed.length === 0) {
        setState((s) => ({
          ...s,
          stats: liveStats(ok),
          status: { ...s.status, yahoo: "live" },
          yahooDetail: `Live 10y daily history (${YAHOO_SYMBOLS.join(", ")})`,
        }));
      } else {
        // Partial data would skew the correlation structure — keep the
        // internally consistent snapshot set instead.
        setState((s) => ({
          ...s,
          status: { ...s.status, yahoo: "snapshot" },
          yahooDetail: `Snapshot statistics (failed: ${failed.join(", ")})`,
        }));
      }
    });

    fetchMacro()
      .then((macro) => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            macro,
            status: { ...s.status, fred: "live" },
          }));
      })
      .catch(() => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            status: { ...s.status, fred: "snapshot" },
          }));
      });

    fetchValuations(VALUATION_SYMBOLS)
      .then(({ rows, anyLive }) => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            valuations: rows,
            status: { ...s.status, fmp: anyLive ? "live" : "snapshot" },
          }));
      })
      .catch(() => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            status: { ...s.status, fmp: "snapshot" },
          }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
