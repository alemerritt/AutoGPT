import { PortfolioState } from "../data/portfolio";
import { SLEEVE_LABELS } from "../lib/engine";
import { fmtUSD, fmtPct } from "../lib/format";
import { MODELED_ASSETS } from "../types";
import { SERIES_COLOR } from "./ui";

/**
 * Allocation by modeled sleeve — horizontal bars (magnitude comparison),
 * value + share printed on every row so color never carries the number.
 */
export default function AllocationPanel({ portfolio }: { portfolio: PortfolioState }) {
  const rows = MODELED_ASSETS.filter((k) => portfolio.sleeves[k] > 0)
    .map((k) => ({
      key: k,
      label: SLEEVE_LABELS[k],
      value: portfolio.sleeves[k],
      share: portfolio.sleeves[k] / portfolio.totalValue,
    }))
    .sort((a, b) => b.value - a.value);
  const max = rows[0]?.value ?? 1;

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="mb-0.5 flex items-baseline justify-between text-xs">
              <span className="font-medium text-ink">
                {r.key}
                <span className="ml-1.5 text-muted">{r.label}</span>
              </span>
              <span className="tabular text-ink-2">
                {fmtUSD(r.value)} · {fmtPct(r.share, 1)}
              </span>
            </div>
            <div className="h-4 w-full rounded" style={{ background: "var(--gridline)" }}>
              <div
                className="h-4 rounded"
                style={{
                  width: `${Math.max(1.5, (r.value / max) * 100)}%`,
                  background: SERIES_COLOR[r.key],
                }}
                role="img"
                aria-label={`${r.key}: ${fmtUSD(r.value)}, ${fmtPct(r.share, 1)} of portfolio`}
              />
            </div>
          </li>
        ))}
        <li className="flex items-baseline justify-between pt-1 text-xs text-ink-2">
          <span>Cash &amp; money market</span>
          <span className="tabular">{fmtUSD(portfolio.cash)}</span>
        </li>
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Speculative basket = {portfolio.otherSymbols.join(", ")}. SWPPX is
        modeled with SPY daily data (same index). AMD is tracked in the data
        pipeline and valuation monitor but no AMD position exists in the
        uploaded exports.
      </p>
    </div>
  );
}
