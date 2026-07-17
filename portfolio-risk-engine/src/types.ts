/** Modeled asset sleeves. OTHER aggregates the small residual positions. */
export type AssetKey = "NVDA" | "ASML" | "AMZN" | "AMD" | "SMH" | "SPY" | "OTHER";

export const MODELED_ASSETS: AssetKey[] = [
  "NVDA",
  "ASML",
  "AMZN",
  "AMD",
  "SMH",
  "SPY",
  "OTHER",
];

/** One row parsed out of a Schwab "Individual Positions" CSV export. */
export interface Position {
  account: string;
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  marketValue: number;
  costBasis: number;
  gainDollar: number;
  gainPct: number;
  pctOfAccount: number;
  assetType: string;
}

/** A simulation sleeve: current dollars + GBM parameters. */
export interface Sleeve {
  key: AssetKey;
  label: string;
  value: number; // current market value in dollars
  logDrift: number; // annualized mean of daily log returns (m = mu - sigma^2/2)
  vol: number; // annualized volatility of daily log returns
}

export interface AssetStats {
  logDrift: number;
  vol: number;
  /** aligned daily log-return series used for historical metrics */
  returns: number[];
}

export type MarketStats = Record<AssetKey, AssetStats>;

export interface MacroData {
  tenYearYield: number; // decimal, e.g. 0.0425
  cpiYoY: number; // decimal, e.g. 0.029
  asOf: string;
  source: "live" | "snapshot";
}

export interface ValuationRow {
  symbol: string;
  peTTM: number | null;
  evToEbitdaTTM: number | null;
  historical10K: { fiscalYear: string; pe: number; evToEbitda: number }[];
  source: "live" | "snapshot";
}

export interface StressState {
  /** basis points added to the 10Y treasury yield (0–400) */
  rateSpikeBps: number;
  /** fractional semiconductor sector drawdown, 0–0.5 */
  semiDrawdown: number;
  /** additional annual inflation, 0–0.3 */
  inflationSpike: number;
}

export interface FanPoint {
  year: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
}

export interface SimulationResult {
  fan: FanPoint[];
  terminal: Float64Array; // sorted terminal values, one per path
  probLoss: number; // P(terminal < stressed starting value)
  probDouble: number;
  probMillion: number;
  medianTerminal: number;
  paths: number;
}

export interface RiskMetrics {
  annReturn: number;
  annVol: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  histVaR99: number; // 1-day, decimal loss (positive number)
  paramVaR99: number;
  cVaR99: number;
  histVaR99Dollar: number;
  paramVaR99Dollar: number;
  cVaR99Dollar: number;
  beta: number;
}

export interface FrontierPoint {
  vol: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

export interface MptResult {
  cloud: FrontierPoint[];
  frontier: FrontierPoint[];
  maxSharpe: FrontierPoint;
  current: FrontierPoint;
  assets: AssetKey[];
  corrMatrix: number[][];
  corrAssets: AssetKey[];
}

export type SourceStatus = "loading" | "live" | "snapshot";
