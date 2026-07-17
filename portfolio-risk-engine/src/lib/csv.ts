import { Position } from "../types";

/**
 * RFC-4180-ish CSV line splitter that survives Schwab's quirks:
 * quoted fields containing commas ("1,784.87"), embedded quotes,
 * and trailing commas at end of line.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** "$6,247.25" -> 6247.25, "-13.9%" -> -13.9, "--"/"N/A" -> NaN */
export function parseSchwabNumber(raw: string): number {
  const cleaned = raw.replace(/[$,%\s]/g, "").replace(/,/g, "");
  if (cleaned === "" || cleaned === "--" || cleaned === "N/A" || cleaned === "-")
    return NaN;
  return Number(cleaned);
}

const NON_POSITION_SYMBOLS = new Set([
  "Cash & Cash Investments",
  "Positions Total",
  "Account Total",
]);

/**
 * Parse one Schwab "Individual Positions" export. Returns security positions
 * plus the account's cash balance.
 */
export function parseSchwabPositions(csv: string): {
  account: string;
  positions: Position[];
  cash: number;
  total: number;
} {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // First line: `Positions for account Individual ...920 as of ...`
  const accountMatch = lines[0]?.match(/account\s+(.+?)\s+as of/i);
  const account = accountMatch ? accountMatch[1] : "Unknown";

  const headerIdx = lines.findIndex((l) => l.startsWith('"Symbol"'));
  if (headerIdx === -1) throw new Error("Schwab CSV: header row not found");
  const header = splitCsvLine(lines[headerIdx]);
  const col = (name: string) =>
    header.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));

  const iSym = col("Symbol");
  const iDesc = col("Description");
  const iQty = col("Qty");
  const iPrice = col("Price");
  const iMkt = col("Mkt Val");
  const iCost = col("Cost Basis");
  const iGain = col("Gain $");
  const iGainPct = col("Gain %");
  const iPctAcct = col("% of Acct");
  const iType = col("Asset Type");

  const positions: Position[] = [];
  let cash = 0;
  let total = 0;

  for (const line of lines.slice(headerIdx + 1)) {
    const f = splitCsvLine(line);
    const symbol = f[iSym]?.trim();
    if (!symbol) continue;
    const marketValue = parseSchwabNumber(f[iMkt] ?? "");
    if (symbol === "Cash & Cash Investments") {
      if (!Number.isNaN(marketValue)) cash += marketValue;
      continue;
    }
    if (NON_POSITION_SYMBOLS.has(symbol)) {
      if (symbol === "Positions Total" && !Number.isNaN(marketValue))
        total = marketValue;
      continue;
    }
    positions.push({
      account,
      symbol,
      description: f[iDesc] ?? "",
      quantity: parseSchwabNumber(f[iQty] ?? ""),
      price: parseSchwabNumber(f[iPrice] ?? ""),
      marketValue,
      costBasis: parseSchwabNumber(f[iCost] ?? ""),
      gainDollar: parseSchwabNumber(f[iGain] ?? ""),
      gainPct: parseSchwabNumber(f[iGainPct] ?? ""),
      pctOfAccount: parseSchwabNumber(f[iPctAcct] ?? ""),
      assetType: f[iType] ?? "",
    });
  }
  return { account, positions, cash, total };
}
