/**
 * Stress-testing transforms. Each scenario maps the slider state onto three
 * channels the rest of the engine already understands:
 *
 *   1. an immediate repricing shock to each sleeve's starting value,
 *   2. a shift in the forward drift used by the GBM simulation,
 *   3. a volatility multiplier per sleeve and a shift in the risk-free rate.
 *
 * Sensitivities are deliberately explicit constants so they can be audited
 * and tuned in one place.
 */
import { AssetKey, StressState } from "../../types";

/**
 * Effective (empirical) equity duration, applied exponentially:
 * price multiplier = exp(-D · Δy). Calibrated to the 2022 episode —
 * the 10Y rising ~275bp took long-duration growth equity down ~30-35%,
 * implying D ≈ 13-15 for the growth names and ~7 for the broad index.
 * The exponential form keeps extreme Δy from driving prices negative.
 */
export const EQUITY_DURATION: Record<AssetKey, number> = {
  NVDA: 14,
  ASML: 12,
  AMZN: 11,
  AMD: 14,
  SMH: 13,
  SPY: 7,
  OTHER: 16,
};

/**
 * Semiconductor-sector shock pass-through: fraction of the sector drawdown
 * each sleeve absorbs. SMH and NVDA take the full hit per the scenario
 * definition; ASML/AMD are semis and follow closely; the S&P carries a
 * ~12% semiconductor weight; AMZN sees mild spillover; the speculative
 * AI basket (OTHER) is highly sector-correlated.
 */
export const SEMI_BETA: Record<AssetKey, number> = {
  NVDA: 1.0,
  ASML: 0.85,
  AMZN: 0.15,
  AMD: 1.0,
  SMH: 1.0,
  SPY: 0.12,
  OTHER: 0.65,
};

/** Fisher pass-through of an inflation spike into the nominal 10Y yield. */
const INFLATION_TO_NOMINAL_RATE = 0.6;
/**
 * Direct multiple-compression from inflation: exp(-k · Δinfl). Kept separate
 * from the duration channel — inflation lifts nominal earnings too, so
 * running it through full Fisher × duration would badly double-count
 * (equities are partial real-asset hedges; cf. 1970s: real losses, but
 * nowhere near duration-implied nominal wipeout).
 */
const INFLATION_PE_COMPRESSION = 1.2;
/** Persistence of the inflation spike over the sim horizon (spikes decay). */
const INFLATION_PERSISTENCE = 0.5;
/** Fraction of a rate rise that also drags forward annual drift (multiple compression persists). */
const RATE_DRIFT_PASSTHROUGH = 0.5;
/** Volatility regime multipliers at full slider deflection. */
const SEMI_VOL_BUMP_AT_30PCT = 0.5; // +50% vol on semi sleeves at a 30% crash
const INFL_VOL_BUMP_AT_20PCT = 0.3; // +30% vol portfolio-wide at 20% inflation

export interface StressedParams {
  /** multiplicative shock to each sleeve's starting value (0.7 = -30%) */
  valueShock: Record<AssetKey, number>;
  /** additive change to each sleeve's annualized log drift */
  driftShift: Record<AssetKey, number>;
  /** multiplicative volatility scaling per sleeve */
  volMultiplier: Record<AssetKey, number>;
  /** stressed nominal risk-free rate (annual, decimal) */
  riskFree: number;
  /** stressed inflation (annual, decimal) for real-terms display */
  inflation: number;
}

const ASSET_KEYS: AssetKey[] = [
  "NVDA",
  "ASML",
  "AMZN",
  "AMD",
  "SMH",
  "SPY",
  "OTHER",
];

export function applyStress(
  stress: StressState,
  baseRiskFree: number,
  baseInflation: number,
): StressedParams {
  const dY = stress.rateSpikeBps / 10_000; // bps → decimal
  const dInfl = stress.inflationSpike;
  const semiDd = stress.semiDrawdown;

  const nominalRateShift = dY + INFLATION_TO_NOMINAL_RATE * dInfl;

  const valueShock = {} as Record<AssetKey, number>;
  const driftShift = {} as Record<AssetKey, number>;
  const volMultiplier = {} as Record<AssetKey, number>;

  for (const k of ASSET_KEYS) {
    // (1) instant repricing — three multiplicative channels:
    //     rate duration (rate slider only), inflation multiple compression,
    //     and the semiconductor sector drawdown at each sleeve's beta
    const rateHit = Math.exp(-EQUITY_DURATION[k] * dY);
    const inflHit = Math.exp(-INFLATION_PE_COMPRESSION * dInfl);
    const semiHit = 1 - SEMI_BETA[k] * semiDd;
    valueShock[k] = Math.max(0.05, rateHit * inflHit * semiHit);

    // (2) forward drift: real-terms drag from the persistent component of
    //     the inflation spike; rate rises compress forward multiples at
    //     partial pass-through
    driftShift[k] = -INFLATION_PERSISTENCE * dInfl - RATE_DRIFT_PASSTHROUGH * dY;

    // (3) volatility regime
    const semiVol =
      1 + SEMI_BETA[k] * SEMI_VOL_BUMP_AT_30PCT * (semiDd / 0.3);
    const inflVol = 1 + INFL_VOL_BUMP_AT_20PCT * (dInfl / 0.2);
    volMultiplier[k] = semiVol * inflVol;
  }

  return {
    valueShock,
    driftShift,
    volMultiplier,
    riskFree: baseRiskFree + nominalRateShift,
    inflation: baseInflation + dInfl,
  };
}

export const STRESS_PRESETS: {
  label: string;
  description: string;
  state: StressState;
}[] = [
  {
    label: "Rate shock",
    description: "+250bp 10Y treasury spike",
    state: { rateSpikeBps: 250, semiDrawdown: 0, inflationSpike: 0 },
  },
  {
    label: "Semi crash",
    description: "-30% semiconductor drawdown (SMH/NVDA)",
    state: { rateSpikeBps: 0, semiDrawdown: 0.3, inflationSpike: 0 },
  },
  {
    label: "Inflation",
    description: "+20% global inflation spike",
    state: { rateSpikeBps: 0, semiDrawdown: 0, inflationSpike: 0.2 },
  },
  {
    label: "Perfect storm",
    description: "All three shocks at once",
    state: { rateSpikeBps: 250, semiDrawdown: 0.3, inflationSpike: 0.2 },
  },
];
