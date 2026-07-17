import { MptResult } from "../types";

/**
 * Correlation heatmap. Diverging encoding: +1 → warm pole (risk stacks up),
 * −1 → cool pole (diversifies), 0 → neutral gray. Every cell also prints its
 * value, so color never carries the number alone.
 */
export default function CorrelationMatrix({ mpt }: { mpt: MptResult }) {
  const assets = mpt.corrAssets;
  const m = mpt.corrMatrix;

  const cellBg = (rho: number) => {
    const pct = Math.round(Math.min(1, Math.abs(rho)) * 85);
    const pole = rho >= 0 ? "var(--div-pos)" : "var(--div-neg)";
    return `color-mix(in oklab, ${pole} ${pct}%, var(--div-mid))`;
  };
  const cellInk = (rho: number) =>
    Math.abs(rho) > 0.55 ? "#ffffff" : "var(--text-primary)";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th />
            {assets.map((a) => (
              <th key={a} className="pb-1 text-center text-[11px] font-medium text-muted">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((row, i) => (
            <tr key={row}>
              <th className="pr-2 text-right text-[11px] font-medium text-muted">
                {row}
              </th>
              {assets.map((colAsset, j) => {
                const rho = m[i][j];
                return (
                  <td
                    key={colAsset}
                    className="tabular rounded-[4px] py-2 text-center text-[11px]"
                    style={{
                      background: cellBg(rho),
                      color: cellInk(rho),
                      minWidth: 44,
                    }}
                    title={`ρ(${row}, ${colAsset}) = ${rho.toFixed(2)}`}
                  >
                    {rho.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-2">
        Red = moves together (concentration risk) · Blue = moves opposite
        (diversifier) · daily log returns
      </p>
    </div>
  );
}
