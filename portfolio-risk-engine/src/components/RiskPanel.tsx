import { RiskMetrics } from "../types";
import { fmtPct, fmtUSD, fmtNum } from "../lib/format";
import { Delta } from "./ui";

interface Props {
  risk: RiskMetrics;
  baseline: RiskMetrics;
  stressActive: boolean;
}

/**
 * Risk metric tiles. Under stress, each tile shows the stressed figure with
 * the delta vs. the unstressed baseline (labeled, not color-alone).
 */
export default function RiskPanel({ risk, baseline, stressActive }: Props) {
  const tiles: {
    label: string;
    value: string;
    base: string;
    better: "higher" | "lower";
    raw: number;
    baseRaw: number;
    sub?: string;
  }[] = [
    {
      label: "Sharpe ratio",
      value: fmtNum(risk.sharpe),
      base: fmtNum(baseline.sharpe),
      better: "higher",
      raw: risk.sharpe,
      baseRaw: baseline.sharpe,
    },
    {
      label: "Sortino ratio",
      value: fmtNum(risk.sortino),
      base: fmtNum(baseline.sortino),
      better: "higher",
      raw: risk.sortino,
      baseRaw: baseline.sortino,
      sub: "downside deviation only",
    },
    {
      label: "Beta vs S&P 500",
      value: fmtNum(risk.beta),
      base: fmtNum(baseline.beta),
      better: "lower",
      raw: risk.beta,
      baseRaw: baseline.beta,
    },
    {
      label: "Annualized volatility",
      value: fmtPct(risk.annVol, 1),
      base: fmtPct(baseline.annVol, 1),
      better: "lower",
      raw: risk.annVol,
      baseRaw: baseline.annVol,
    },
    {
      label: "Max drawdown (hist.)",
      value: fmtPct(risk.maxDrawdown, 1),
      base: fmtPct(baseline.maxDrawdown, 1),
      better: "lower",
      raw: risk.maxDrawdown,
      baseRaw: baseline.maxDrawdown,
    },
    {
      label: "VaR 99% · historical",
      value: fmtPct(risk.histVaR99, 2),
      base: fmtPct(baseline.histVaR99, 2),
      better: "lower",
      raw: risk.histVaR99,
      baseRaw: baseline.histVaR99,
      sub: `1-day · ${fmtUSD(risk.histVaR99Dollar)}`,
    },
    {
      label: "VaR 99% · parametric",
      value: fmtPct(risk.paramVaR99, 2),
      base: fmtPct(baseline.paramVaR99, 2),
      better: "lower",
      raw: risk.paramVaR99,
      baseRaw: baseline.paramVaR99,
      sub: `1-day · ${fmtUSD(risk.paramVaR99Dollar)}`,
    },
    {
      label: "CVaR 99% (exp. shortfall)",
      value: fmtPct(risk.cVaR99, 2),
      base: fmtPct(baseline.cVaR99, 2),
      better: "lower",
      raw: risk.cVaR99,
      baseRaw: baseline.cVaR99,
      sub: `1-day tail mean · ${fmtUSD(risk.cVaR99Dollar)}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => {
        const diff = t.raw - t.baseRaw;
        const worse = t.better === "higher" ? diff < -1e-9 : diff > 1e-9;
        const improved = t.better === "higher" ? diff > 1e-9 : diff < -1e-9;
        return (
          <div key={t.label} className="card px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-muted">
              {t.label}
            </div>
            <div className="mt-1 text-lg font-semibold tabular text-ink">
              {t.value}
            </div>
            {t.sub && <div className="text-[11px] text-ink-2">{t.sub}</div>}
            {stressActive && (
              <div className="mt-1 text-[11px]">
                <Delta
                  value={`from ${t.base}`}
                  direction={worse ? "down" : improved ? "up" : "flat"}
                  note={worse ? "worse" : improved ? "better" : "unchanged"}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
