/**
 * Embedded snapshot dataset. Used ONLY when a live source is unreachable or
 * unkeyed, and every consumer surfaces a "SNAPSHOT" badge when it is active.
 *
 * Return statistics approximate 2021–2026 daily history (annualized log-drift
 * and volatility). The OTHER sleeve models the residual basket (NBIS, CRWV,
 * IONQ, AXON, CDNS, NOW, IBIT) — speculative AI/quantum/crypto exposure with
 * materially higher idiosyncratic volatility.
 */
import { AssetKey, MacroData, ValuationRow } from "../types";
import { cholesky, makeGaussian, mulberry32, TRADING_DAYS } from "../lib/stats";

export const FALLBACK_ASSET_PARAMS: Record<
  AssetKey,
  { logDrift: number; vol: number }
> = {
  NVDA: { logDrift: 0.32, vol: 0.5 },
  ASML: { logDrift: 0.11, vol: 0.38 },
  AMZN: { logDrift: 0.07, vol: 0.33 },
  AMD: { logDrift: 0.04, vol: 0.48 },
  SMH: { logDrift: 0.19, vol: 0.32 },
  SPY: { logDrift: 0.095, vol: 0.17 },
  OTHER: { logDrift: 0.1, vol: 0.65 },
};

/** Order must match MODELED_ASSETS in types.ts. */
export const FALLBACK_CORRELATION: number[][] = [
  //        NVDA  ASML  AMZN  AMD   SMH   SPY   OTHER
  /*NVDA */ [1.0, 0.62, 0.52, 0.68, 0.85, 0.6, 0.6],
  /*ASML */ [0.62, 1.0, 0.45, 0.58, 0.78, 0.55, 0.5],
  /*AMZN */ [0.52, 0.45, 1.0, 0.48, 0.52, 0.65, 0.42],
  /*AMD  */ [0.68, 0.58, 0.48, 1.0, 0.8, 0.58, 0.55],
  /*SMH  */ [0.85, 0.78, 0.52, 0.8, 1.0, 0.68, 0.62],
  /*SPY  */ [0.6, 0.55, 0.65, 0.58, 0.68, 1.0, 0.48],
  /*OTHER*/ [0.6, 0.5, 0.42, 0.55, 0.62, 0.48, 1.0],
];

export const FALLBACK_MACRO: MacroData = {
  tenYearYield: 0.0425,
  cpiYoY: 0.029,
  asOf: "snapshot",
  source: "snapshot",
};

export const FALLBACK_VALUATIONS: ValuationRow[] = [
  {
    symbol: "NVDA",
    peTTM: 46.2,
    evToEbitdaTTM: 39.8,
    source: "snapshot",
    historical10K: [
      { fiscalYear: "FY2023 10-K", pe: 55.1, evToEbitda: 61.3 },
      { fiscalYear: "FY2024 10-K", pe: 65.3, evToEbitda: 58.7 },
      { fiscalYear: "FY2025 10-K", pe: 52.4, evToEbitda: 44.2 },
    ],
  },
  {
    symbol: "ASML",
    peTTM: 33.4,
    evToEbitdaTTM: 26.1,
    source: "snapshot",
    historical10K: [
      { fiscalYear: "FY2023 20-F", pe: 36.8, evToEbitda: 28.9 },
      { fiscalYear: "FY2024 20-F", pe: 34.2, evToEbitda: 27.5 },
      { fiscalYear: "FY2025 20-F", pe: 31.9, evToEbitda: 25.3 },
    ],
  },
  {
    symbol: "AMZN",
    peTTM: 33.7,
    evToEbitdaTTM: 14.8,
    source: "snapshot",
    historical10K: [
      { fiscalYear: "FY2023 10-K", pe: 51.4, evToEbitda: 18.9 },
      { fiscalYear: "FY2024 10-K", pe: 40.6, evToEbitda: 16.4 },
      { fiscalYear: "FY2025 10-K", pe: 35.2, evToEbitda: 15.1 },
    ],
  },
  {
    symbol: "AMD",
    peTTM: 41.5,
    evToEbitdaTTM: 31.2,
    source: "snapshot",
    historical10K: [
      { fiscalYear: "FY2023 10-K", pe: 45.3, evToEbitda: 33.6 },
      { fiscalYear: "FY2024 10-K", pe: 48.9, evToEbitda: 35.8 },
      { fiscalYear: "FY2025 10-K", pe: 43.1, evToEbitda: 32.4 },
    ],
  },
];

/**
 * Synthesize five years of correlated daily log returns from the snapshot
 * parameters (seeded, reproducible). Downstream code — historical VaR,
 * drawdown, covariance, frontier — is agnostic to whether returns came from
 * Yahoo or from here.
 */
export function synthesizeReturns(
  assets: AssetKey[],
  days = 5 * TRADING_DAYS,
): Record<AssetKey, number[]> {
  const corr = FALLBACK_CORRELATION;
  const L = cholesky(corr);
  const gauss = makeGaussian(mulberry32(0x5eed1234));
  const out = {} as Record<AssetKey, number[]>;
  assets.forEach((a) => (out[a] = []));

  const dailyDrift = assets.map(
    (a) => FALLBACK_ASSET_PARAMS[a].logDrift / TRADING_DAYS,
  );
  const dailyVol = assets.map(
    (a) => FALLBACK_ASSET_PARAMS[a].vol / Math.sqrt(TRADING_DAYS),
  );

  const z = new Array(assets.length).fill(0);
  for (let t = 0; t < days; t++) {
    for (let i = 0; i < assets.length; i++) z[i] = gauss();
    for (let i = 0; i < assets.length; i++) {
      let corrZ = 0;
      for (let k = 0; k <= i; k++) corrZ += L[i][k] * z[k];
      out[assets[i]].push(dailyDrift[i] + dailyVol[i] * corrZ);
    }
  }
  return out;
}
