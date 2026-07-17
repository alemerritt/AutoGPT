import { PortfolioState } from "../data/portfolio";
import { fmtPct, fmtUSD } from "../lib/format";

/** Full parsed position roster — also serves as the accessible table view. */
export default function PositionsTable({ portfolio }: { portfolio: PortfolioState }) {
  const rows = [...portfolio.positions].sort(
    (a, b) => b.marketValue - a.marketValue,
  );
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0" style={{ background: "var(--surface-1)" }}>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="py-1.5 pr-3 font-medium">Symbol</th>
            <th className="py-1.5 pr-3 font-medium">Account</th>
            <th className="py-1.5 pr-3 text-right font-medium">Qty</th>
            <th className="py-1.5 pr-3 text-right font-medium">Price</th>
            <th className="py-1.5 pr-3 text-right font-medium">Market value</th>
            <th className="py-1.5 pr-3 text-right font-medium">Cost basis</th>
            <th className="py-1.5 text-right font-medium">Gain</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={`${p.symbol}-${p.account}-${i}`} className="border-t" style={{ borderColor: "var(--gridline)" }}>
              <td className="py-1.5 pr-3 font-semibold text-ink" title={p.description}>
                {p.symbol}
              </td>
              <td className="py-1.5 pr-3 text-ink-2">…{p.account.slice(-3)}</td>
              <td className="tabular py-1.5 pr-3 text-right text-ink-2">
                {Number.isNaN(p.quantity) ? "—" : p.quantity.toLocaleString()}
              </td>
              <td className="tabular py-1.5 pr-3 text-right text-ink-2">
                {Number.isNaN(p.price) ? "—" : `$${p.price.toLocaleString()}`}
              </td>
              <td className="tabular py-1.5 pr-3 text-right font-medium text-ink">
                {fmtUSD(p.marketValue)}
              </td>
              <td className="tabular py-1.5 pr-3 text-right text-ink-2">
                {fmtUSD(p.costBasis)}
              </td>
              <td
                className="tabular py-1.5 text-right"
                style={{
                  color:
                    p.gainDollar >= 0
                      ? "var(--delta-good-text)"
                      : "var(--status-critical)",
                }}
              >
                {p.gainDollar >= 0 ? "▲" : "▼"} {fmtUSD(Math.abs(p.gainDollar))} (
                {fmtPct(Math.abs(p.gainPct) / 100, 1)})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
