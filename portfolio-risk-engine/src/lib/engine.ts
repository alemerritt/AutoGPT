/**
 * Composition root for the quant stack: takes the parsed portfolio, market
 * statistics and the stress slider state, and produces everything the UI
 * renders — stressed sleeves, Monte Carlo fan, risk metrics and MPT outputs.
 */
import { PortfolioState } from "../data/portfolio";
import {
  AssetKey,
  MarketStats,
  MODELED_ASSETS,
  MptResult,
  RiskMetrics,
  SimulationResult,
  Sleeve,
  StressState,
} from "../types";
import { correlation } from "./stats";
import { runMonteCarlo } from "./quant/gbm";
import { buildMpt } from "./quant/mpt";
import { computeRiskMetrics } from "./quant/risk";
import { applyStress, StressedParams } from "./quant/stress";

export const SLEEVE_LABELS: Record<AssetKey, string> = {
  NVDA: "NVIDIA",
  ASML: "ASML",
  AMZN: "Amazon",
  AMD: "AMD",
  SMH: "SMH (VanEck Semis)",
  SPY: "S&P 500 (SWPPX)",
  OTHER: "Speculative basket",
};

export interface EngineResult {
  stressed: StressedParams;
  sleeves: Sleeve[];
  stressedValue: number; // portfolio value after instant repricing shock
  baseValue: number;
  risk: RiskMetrics;
  baselineRisk: RiskMetrics;
  mpt: MptResult;
}

const SIM_PATHS = 10_000;
const SIM_YEARS = 10;
const STEPS_PER_YEAR = 12;

/** Sleeves with stressed starting values, drift and volatility applied. */
export function buildStressedSleeves(
  portfolio: PortfolioState,
  stats: MarketStats,
  stressed: StressedParams,
): Sleeve[] {
  return MODELED_ASSETS.filter((k) => portfolio.sleeves[k] > 0).map((k) => ({
    key: k,
    label: SLEEVE_LABELS[k],
    value: portfolio.sleeves[k] * stressed.valueShock[k],
    logDrift: stats[k].logDrift + stressed.driftShift[k],
    vol: stats[k].vol * stressed.volMultiplier[k],
  }));
}

/** Annualized covariance from historical correlations × stressed vols. */
function stressedCovariance(sleeves: Sleeve[], stats: MarketStats): number[][] {
  const n = sleeves.length;
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const rho =
        i === j
          ? 1
          : correlation(
              stats[sleeves[i].key].returns,
              stats[sleeves[j].key].returns,
            );
      const c = rho * sleeves[i].vol * sleeves[j].vol;
      cov[i][j] = c;
      cov[j][i] = c;
    }
  }
  return cov;
}

/**
 * Daily portfolio simple-return series under the stress regime: stressed
 * weights, per-sleeve volatility scaling applied to the historical shocks.
 */
function portfolioReturnSeries(
  sleeves: Sleeve[],
  stats: MarketStats,
  stressed: StressedParams,
  cash: number,
): number[] {
  const total = sleeves.reduce((s, a) => s + a.value, 0) + cash;
  const weights = sleeves.map((a) => a.value / total);
  const len = Math.min(...sleeves.map((a) => stats[a.key].returns.length));
  const out = new Array<number>(len);
  for (let t = 0; t < len; t++) {
    let r = 0;
    for (let i = 0; i < sleeves.length; i++) {
      const series = stats[sleeves[i].key].returns;
      const lr = series[series.length - len + t];
      const scaled = lr * stressed.volMultiplier[sleeves[i].key];
      r += weights[i] * (Math.exp(scaled) - 1);
    }
    out[t] = r; // cash weight earns 0 daily here; rf enters via Sharpe/Sortino
  }
  return out;
}

export function runSimulation(
  portfolio: PortfolioState,
  stats: MarketStats,
  stress: StressState,
  baseRiskFree: number,
  baseInflation: number,
): SimulationResult {
  const stressed = applyStress(stress, baseRiskFree, baseInflation);
  const sleeves = buildStressedSleeves(portfolio, stats, stressed);
  return runMonteCarlo({
    sleeves,
    covariance: stressedCovariance(sleeves, stats),
    cash: portfolio.cash,
    years: SIM_YEARS,
    stepsPerYear: STEPS_PER_YEAR,
    paths: SIM_PATHS,
  });
}

export function computeEngine(
  portfolio: PortfolioState,
  stats: MarketStats,
  stress: StressState,
  baseRiskFree: number,
  baseInflation: number,
): EngineResult {
  const stressed = applyStress(stress, baseRiskFree, baseInflation);
  const sleeves = buildStressedSleeves(portfolio, stats, stressed);
  const stressedValue =
    sleeves.reduce((s, a) => s + a.value, 0) + portfolio.cash;

  const stressedReturns = portfolioReturnSeries(
    sleeves,
    stats,
    stressed,
    portfolio.cash,
  );
  const risk = computeRiskMetrics(
    stressedReturns,
    stats.SPY.returns.map((lr) => Math.exp(lr) - 1),
    stressed.riskFree,
    stressedValue,
  );

  const neutral = applyStress(
    { rateSpikeBps: 0, semiDrawdown: 0, inflationSpike: 0 },
    baseRiskFree,
    baseInflation,
  );
  const baseSleeves = buildStressedSleeves(portfolio, stats, neutral);
  const baselineRisk = computeRiskMetrics(
    portfolioReturnSeries(baseSleeves, stats, neutral, portfolio.cash),
    stats.SPY.returns.map((lr) => Math.exp(lr) - 1),
    baseRiskFree,
    portfolio.totalValue,
  );

  // Efficient frontier over the concentrated positions named in the mandate.
  const frontierAssets: AssetKey[] = ["NVDA", "ASML", "AMZN", "SMH"];
  const fw = frontierAssets.map((a) => portfolio.sleeves[a]);
  const fwSum = fw.reduce((a, b) => a + b, 0);
  const mpt = buildMpt({
    assets: frontierAssets,
    returnsByAsset: Object.fromEntries(
      MODELED_ASSETS.map((a) => [a, stats[a].returns]),
    ) as Record<AssetKey, number[]>,
    currentWeights: fw.map((x) => x / fwSum),
    riskFree: baseRiskFree,
    corrAssets: MODELED_ASSETS.filter(
      (a) => portfolio.sleeves[a] > 0 || a === "AMD",
    ),
  });

  return {
    stressed,
    sleeves,
    stressedValue,
    baseValue: portfolio.totalValue,
    risk,
    baselineRisk,
    mpt,
  };
}
