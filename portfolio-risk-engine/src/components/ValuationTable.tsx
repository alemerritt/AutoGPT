import { ValuationRow } from "../types";
import { fmtNum } from "../lib/format";

/**
 * Current TTM multiples (FMP live when keyed) against the point-in-time
 * multiples digested from the uploaded historical 10-K / 20-F filings.
 */
export default function ValuationTable({ rows }: { rows: ValuationRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="py-1.5 pr-3 font-medium">Ticker</th>
            <th className="py-1.5 pr-3 text-right font-medium">P/E (TTM)</th>
            <th className="py-1.5 pr-3 text-right font-medium">EV/EBITDA (TTM)</th>
            <th className="py-1.5 pr-3 text-right font-medium">10-K history (P/E · EV/EBITDA)</th>
            <th className="py-1.5 text-right font-medium">vs latest filing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const latest = r.historical10K[r.historical10K.length - 1];
            const peDelta =
              r.peTTM != null && latest ? r.peTTM / latest.pe - 1 : null;
            return (
              <tr key={r.symbol} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2 pr-3 font-semibold text-ink">
                  {r.symbol}
                  {r.source === "snapshot" && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted">snap</span>
                  )}
                </td>
                <td className="tabular py-2 pr-3 text-right text-ink">{fmtNum(r.peTTM, 1)}</td>
                <td className="tabular py-2 pr-3 text-right text-ink">{fmtNum(r.evToEbitdaTTM, 1)}</td>
                <td className="tabular py-2 pr-3 text-right text-ink-2">
                  {r.historical10K
                    .map((h) => `${h.fiscalYear.replace(/ .*/, "")}: ${h.pe.toFixed(0)}·${h.evToEbitda.toFixed(0)}`)
                    .join("  ")}
                </td>
                <td className="tabular py-2 text-right">
                  {peDelta == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span
                      style={{
                        color:
                          peDelta > 0
                            ? "var(--status-critical)"
                            : "var(--delta-good-text)",
                      }}
                    >
                      {peDelta > 0 ? "▲ richer" : "▼ cheaper"}{" "}
                      {(Math.abs(peDelta) * 100).toFixed(0)}%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-2">
        Historical multiples are point-in-time values digested from the
        uploaded 10-K / 20-F filings (snapshot). &ldquo;vs latest filing&rdquo;
        compares the live P/E against the most recent filing-year multiple.
      </p>
    </div>
  );
}
