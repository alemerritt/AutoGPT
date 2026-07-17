/**
 * Advanced risk metrics computed over a daily portfolio return series.
 * All VaR/CVaR figures are 1-day, 99% confidence, expressed as positive
 * loss fractions (and dollars against the current portfolio value).
 */
import { mean, normInv, quantile, sampleStd, TRADING_DAYS } from "../stats";
import { RiskMetrics } from "../../types";

const Z_99 = normInv(0.01); // ≈ -2.326

export function annualizedReturn(dailySimpleReturns: number[]): number {
  // geometric annualization of the compounded daily series
  let cum = 1;
  for (const r of dailySimpleReturns) cum *= 1 + r;
  const years = dailySimpleReturns.length / TRADING_DAYS;
  return years > 0 ? Math.pow(cum, 1 / years) - 1 : 0;
}

export function annualizedVol(dailyReturns: number[]): number {
  return sampleStd(dailyReturns) * Math.sqrt(TRADING_DAYS);
}

export function sharpeRatio(
  dailyReturns: number[],
  riskFreeAnnual: number,
): number {
  const vol = annualizedVol(dailyReturns);
  if (vol === 0) return 0;
  return (annualizedReturn(dailyReturns) - riskFreeAnnual) / vol;
}

/**
 * Sortino ratio: excess return over the MAR divided by downside deviation,
 * where downside deviation only penalizes returns below the daily MAR.
 */
export function sortinoRatio(
  dailyReturns: number[],
  riskFreeAnnual: number,
): number {
  const marDaily = riskFreeAnnual / TRADING_DAYS;
  let sumSq = 0;
  for (const r of dailyReturns) {
    const shortfall = Math.min(0, r - marDaily);
    sumSq += shortfall * shortfall;
  }
  const downsideDev =
    Math.sqrt(sumSq / dailyReturns.length) * Math.sqrt(TRADING_DAYS);
  if (downsideDev === 0) return 0;
  return (annualizedReturn(dailyReturns) - riskFreeAnnual) / downsideDev;
}

/** Maximum peak-to-trough drawdown of the compounded equity curve. */
export function maxDrawdown(dailyReturns: number[]): number {
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  for (const r of dailyReturns) {
    equity *= 1 + r;
    if (equity > peak) peak = equity;
    const dd = 1 - equity / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/** Historical VaR: empirical 1st-percentile daily loss. */
export function historicalVaR99(dailyReturns: number[]): number {
  return Math.max(0, -quantile(dailyReturns, 0.01));
}

/** Parametric (variance–covariance) VaR under a normal assumption. */
export function parametricVaR99(dailyReturns: number[]): number {
  const mu = mean(dailyReturns);
  const sigma = sampleStd(dailyReturns);
  return Math.max(0, -(mu + Z_99 * sigma));
}

/**
 * Conditional VaR / Expected Shortfall: mean loss on days at or beyond the
 * 99% historical VaR threshold — the expected size of a tail event.
 */
export function conditionalVaR99(dailyReturns: number[]): number {
  const cutoff = quantile(dailyReturns, 0.01);
  const tail = dailyReturns.filter((r) => r <= cutoff);
  if (tail.length === 0) return historicalVaR99(dailyReturns);
  return Math.max(0, -mean(tail));
}

/** Portfolio beta vs. the market return series (CAPM slope). */
export function portfolioBeta(
  portfolioReturns: number[],
  marketReturns: number[],
): number {
  const n = Math.min(portfolioReturns.length, marketReturns.length);
  if (n < 2) return NaN;
  const p = portfolioReturns.slice(-n);
  const m = marketReturns.slice(-n);
  const mMean = mean(m);
  const pMean = mean(p);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (p[i] - pMean) * (m[i] - mMean);
    varM += (m[i] - mMean) * (m[i] - mMean);
  }
  return varM === 0 ? NaN : cov / varM;
}

export function computeRiskMetrics(
  dailyReturns: number[],
  marketReturns: number[],
  riskFreeAnnual: number,
  portfolioValue: number,
): RiskMetrics {
  const histVaR99 = historicalVaR99(dailyReturns);
  const paramVaR99 = parametricVaR99(dailyReturns);
  const cVaR99 = conditionalVaR99(dailyReturns);
  return {
    annReturn: annualizedReturn(dailyReturns),
    annVol: annualizedVol(dailyReturns),
    sharpe: sharpeRatio(dailyReturns, riskFreeAnnual),
    sortino: sortinoRatio(dailyReturns, riskFreeAnnual),
    maxDrawdown: maxDrawdown(dailyReturns),
    histVaR99,
    paramVaR99,
    cVaR99,
    histVaR99Dollar: histVaR99 * portfolioValue,
    paramVaR99Dollar: paramVaR99 * portfolioValue,
    cVaR99Dollar: cVaR99 * portfolioValue,
    beta: portfolioBeta(dailyReturns, marketReturns),
  };
}
