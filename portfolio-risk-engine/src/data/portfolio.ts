import { parseSchwabPositions } from "../lib/csv";
import { RAW_ACCOUNT_589, RAW_ACCOUNT_920 } from "./rawPositions";
import { AssetKey, Position } from "../types";

export interface PortfolioState {
  positions: Position[]; // every row across both accounts
  cash: number;
  totalValue: number;
  totalCostBasis: number;
  /** dollars per modeled simulation sleeve (sums to totalValue - cash) */
  sleeves: Record<AssetKey, number>;
  /** symbols folded into the OTHER sleeve */
  otherSymbols: string[];
  accounts: { account: string; total: number }[];
}

/** Symbols modeled 1:1 against their own market data. */
const DIRECT: Record<string, AssetKey> = {
  NVDA: "NVDA",
  ASML: "ASML",
  AMZN: "AMZN",
  AMD: "AMD",
  SMH: "SMH",
  // SWPPX tracks the S&P 500; SPY daily data is the liquid proxy for it.
  SWPPX: "SPY",
  SPY: "SPY",
};

export function buildPortfolio(rawCsvs: string[] = [RAW_ACCOUNT_920, RAW_ACCOUNT_589]): PortfolioState {
  const parsed = rawCsvs.map(parseSchwabPositions);
  const positions = parsed.flatMap((p) => p.positions);
  const cash = parsed.reduce((s, p) => s + p.cash, 0);

  const sleeves: Record<AssetKey, number> = {
    NVDA: 0,
    ASML: 0,
    AMZN: 0,
    AMD: 0,
    SMH: 0,
    SPY: 0,
    OTHER: 0,
  };
  const otherSymbols = new Set<string>();

  for (const pos of positions) {
    const key = DIRECT[pos.symbol];
    if (key) {
      sleeves[key] += pos.marketValue;
    } else {
      sleeves.OTHER += pos.marketValue;
      otherSymbols.add(pos.symbol);
    }
  }

  const totalValue =
    cash + Object.values(sleeves).reduce((s, v) => s + v, 0);
  const totalCostBasis = positions.reduce(
    (s, p) => s + (Number.isNaN(p.costBasis) ? 0 : p.costBasis),
    0,
  );

  return {
    positions,
    cash,
    totalValue,
    totalCostBasis,
    sleeves,
    otherSymbols: [...otherSymbols],
    accounts: parsed.map((p) => ({ account: p.account, total: p.total })),
  };
}
