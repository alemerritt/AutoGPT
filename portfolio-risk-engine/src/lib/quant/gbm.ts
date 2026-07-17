/**
 * Geometric Brownian Motion Monte Carlo engine.
 *
 * Each sleeve i follows  dS_i = mu_i S_i dt + sigma_i S_i dW_i  with
 * correlated Brownian increments (Cholesky factor of the asset covariance).
 * The exact log-space discretization is used, so there is no Euler bias:
 *
 *   S_i(t+dt) = S_i(t) * exp( m_i dt + sqrt(dt) * (L z)_i )
 *
 * where m_i = mu_i - sigma_i^2 / 2 is the log-drift estimated directly from
 * daily log returns, and L L^T equals the annualized covariance matrix.
 */
import { FanPoint, SimulationResult, Sleeve } from "../../types";
import { cholesky, makeGaussian, mulberry32, quantileSorted } from "../stats";

export interface GbmConfig {
  sleeves: Sleeve[];
  /** annualized covariance of log returns, sleeve order */
  covariance: number[][];
  cash: number;
  years: number;
  stepsPerYear: number;
  paths: number;
  seed?: number;
}

export function runMonteCarlo(cfg: GbmConfig): SimulationResult {
  const { sleeves, covariance, cash, years, stepsPerYear, paths } = cfg;
  const n = sleeves.length;
  const steps = Math.round(years * stepsPerYear);
  const dt = 1 / stepsPerYear;
  const sqrtDt = Math.sqrt(dt);

  const L = cholesky(covariance);
  const gauss = makeGaussian(mulberry32(cfg.seed ?? 0xc0ffee));

  const startValue = sleeves.reduce((s, a) => s + a.value, 0) + cash;
  const driftDt = sleeves.map((a) => a.logDrift * dt);

  // Portfolio value per path per step (only percentile columns are kept
  // after aggregation). paths x (steps+1) Float64 ≈ 9.7 MB at 10k x 121.
  const values = new Float64Array(paths * (steps + 1));
  const z = new Float64Array(n);
  const shocked = new Float64Array(n);
  const holdings = new Float64Array(n);

  for (let p = 0; p < paths; p++) {
    for (let i = 0; i < n; i++) holdings[i] = sleeves[i].value;
    values[p * (steps + 1)] = startValue;
    for (let t = 1; t <= steps; t++) {
      for (let i = 0; i < n; i++) z[i] = gauss();
      // shocked = L z (correlated standard normals scaled by covariance)
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let k = 0; k <= i; k++) s += L[i][k] * z[k];
        shocked[i] = s;
      }
      let total = cash;
      for (let i = 0; i < n; i++) {
        holdings[i] *= Math.exp(driftDt[i] + sqrtDt * shocked[i]);
        total += holdings[i];
      }
      values[p * (steps + 1) + t] = total;
    }
  }

  // Column-wise percentiles → fan chart series (sampled yearly for the UI).
  const fan: FanPoint[] = [];
  const col = new Float64Array(paths);
  for (let t = 0; t <= steps; t++) {
    if (t % stepsPerYear !== 0) continue;
    for (let p = 0; p < paths; p++) col[p] = values[p * (steps + 1) + t];
    col.sort();
    let sum = 0;
    for (let p = 0; p < paths; p++) sum += col[p];
    fan.push({
      year: t / stepsPerYear,
      p5: quantileSorted(col, 0.05),
      p25: quantileSorted(col, 0.25),
      p50: quantileSorted(col, 0.5),
      p75: quantileSorted(col, 0.75),
      p95: quantileSorted(col, 0.95),
      mean: sum / paths,
    });
  }

  const terminal = new Float64Array(paths);
  for (let p = 0; p < paths; p++)
    terminal[p] = values[p * (steps + 1) + steps];
  terminal.sort();

  const countBelow = (x: number) => {
    // binary search over the sorted terminal array
    let lo = 0;
    let hi = terminal.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (terminal[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  return {
    fan,
    terminal,
    probLoss: countBelow(startValue) / paths,
    probDouble: 1 - countBelow(2 * startValue) / paths,
    probMillion: 1 - countBelow(1_000_000) / paths,
    medianTerminal: quantileSorted(terminal, 0.5),
    paths,
  };
}

/**
 * Histogram of terminal values for the distribution chart. Terminal GBM
 * values are lognormal — heavily right-skewed — so bins are equal-width in
 * LOG space (and the outer 0.1% / 1% tails are clipped); linear bins would
 * pile most paths into the first bar.
 */
export function terminalHistogram(
  terminal: Float64Array,
  bins = 40,
): { x0: number; x1: number; count: number }[] {
  if (terminal.length === 0) return [];
  const lo = Math.max(1, quantileSorted(terminal, 0.001));
  const hi = Math.max(lo * 1.0001, quantileSorted(terminal, 0.99));
  const logLo = Math.log(lo);
  const width = (Math.log(hi) - logLo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    x0: Math.exp(logLo + i * width),
    x1: Math.exp(logLo + (i + 1) * width),
    count: 0,
  }));
  for (let i = 0; i < terminal.length; i++) {
    if (terminal[i] < lo || terminal[i] > hi) continue;
    const b = Math.min(
      bins - 1,
      Math.floor((Math.log(terminal[i]) - logLo) / width),
    );
    out[b].count++;
  }
  return out;
}
