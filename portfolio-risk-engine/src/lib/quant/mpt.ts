/**
 * Modern Portfolio Theory module.
 *
 * - Annualized covariance & correlation matrices from aligned daily returns.
 * - Efficient frontier over the concentrated sleeve set (NVDA, ASML, AMZN,
 *   SMH) via dense random-portfolio sampling (Dirichlet weights, long-only)
 *   and an upper-envelope sweep — no QP solver dependency, and the sampled
 *   cloud itself is plotted, so the frontier is honest about its resolution.
 */
import {
  AssetKey,
  FrontierPoint,
  MptResult,
} from "../../types";
import {
  correlation,
  covariance,
  mean,
  mulberry32,
  TRADING_DAYS,
} from "../stats";

export function covarianceMatrix(
  series: number[][],
  annualize = true,
): number[][] {
  const n = series.length;
  const k = annualize ? TRADING_DAYS : 1;
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const c = covariance(series[i], series[j]) * k;
      out[i][j] = c;
      out[j][i] = c;
    }
  }
  return out;
}

export function correlationMatrix(series: number[][]): number[][] {
  const n = series.length;
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(1));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const c = correlation(series[i], series[j]);
      out[i][j] = c;
      out[j][i] = c;
    }
  return out;
}

function portfolioPoint(
  w: number[],
  annReturns: number[],
  cov: number[][],
  riskFree: number,
): FrontierPoint {
  let ret = 0;
  for (let i = 0; i < w.length; i++) ret += w[i] * annReturns[i];
  let variance = 0;
  for (let i = 0; i < w.length; i++)
    for (let j = 0; j < w.length; j++) variance += w[i] * w[j] * cov[i][j];
  const vol = Math.sqrt(Math.max(0, variance));
  return { vol, ret, sharpe: vol > 0 ? (ret - riskFree) / vol : 0, weights: w };
}

export function buildMpt(opts: {
  assets: AssetKey[];
  returnsByAsset: Record<AssetKey, number[]>;
  currentWeights: number[]; // same order as assets, sums to 1
  riskFree: number;
  corrAssets: AssetKey[]; // full sleeve set for the correlation heatmap
  samples?: number;
}): MptResult {
  const { assets, returnsByAsset, currentWeights, riskFree, corrAssets } = opts;
  const samples = opts.samples ?? 5000;

  const series = assets.map((a) => returnsByAsset[a]);
  const cov = covarianceMatrix(series);
  // arithmetic annualized expected returns from daily log returns:
  // E[R] ≈ exp(m + s²/2) - 1 with m, s² annualized
  const annReturns = series.map((s) => {
    const m = mean(s) * TRADING_DAYS;
    const v = covariance(s, s) * TRADING_DAYS;
    return Math.exp(m + v / 2) - 1;
  });

  const rand = mulberry32(0xf407713); // fixed seed → stable cloud
  const cloud: FrontierPoint[] = [];
  for (let s = 0; s < samples; s++) {
    // Dirichlet(1,...,1) via normalized exponentials → uniform on the simplex
    const raw = assets.map(() => -Math.log(1 - rand()));
    const sum = raw.reduce((a, b) => a + b, 0);
    cloud.push(
      portfolioPoint(
        raw.map((x) => x / sum),
        annReturns,
        cov,
        riskFree,
      ),
    );
  }
  // include the pure single-asset corners so the frontier spans fully
  for (let i = 0; i < assets.length; i++) {
    const w = new Array(assets.length).fill(0);
    w[i] = 1;
    cloud.push(portfolioPoint(w, annReturns, cov, riskFree));
  }

  // Upper envelope: sort by vol, keep points with a new max return.
  const byVol = [...cloud].sort((a, b) => a.vol - b.vol);
  const frontier: FrontierPoint[] = [];
  let bestRet = -Infinity;
  for (const p of byVol) {
    if (p.ret > bestRet) {
      frontier.push(p);
      bestRet = p.ret;
    }
  }

  const maxSharpe = cloud.reduce((a, b) => (b.sharpe > a.sharpe ? b : a));
  const current = portfolioPoint(currentWeights, annReturns, cov, riskFree);

  return {
    cloud,
    frontier,
    maxSharpe,
    current,
    assets,
    corrMatrix: correlationMatrix(corrAssets.map((a) => returnsByAsset[a])),
    corrAssets,
  };
}
