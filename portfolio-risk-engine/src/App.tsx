import { useMemo, useRef, useState } from "react";
import { buildPortfolio, PortfolioState } from "./data/portfolio";
import { computeEngine, runSimulation } from "./lib/engine";
import { useMarketData } from "./hooks/useMarketData";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { StressState } from "./types";
import { fmtPct, fmtUSD } from "./lib/format";
import { Card, Delta, SourceBadge, StatTile } from "./components/ui";
import AllocationPanel from "./components/AllocationPanel";
import StressPanel from "./components/StressPanel";
import RiskPanel from "./components/RiskPanel";
import FanChart from "./components/FanChart";
import TerminalHistogram from "./components/TerminalHistogram";
import EfficientFrontier from "./components/EfficientFrontier";
import CorrelationMatrix from "./components/CorrelationMatrix";
import ValuationTable from "./components/ValuationTable";
import PositionsTable from "./components/PositionsTable";

const NO_STRESS: StressState = {
  rateSpikeBps: 0,
  semiDrawdown: 0,
  inflationSpike: 0,
};

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioState>(() =>
    buildPortfolio(),
  );
  const [stress, setStress] = useState<StressState>(NO_STRESS);
  const market = useMarketData();
  const fileRef = useRef<HTMLInputElement>(null);

  // Slider drags re-run a 10,000-path Monte Carlo — debounce the heavy pass.
  const debouncedStress = useDebouncedValue(stress, 150);
  const stressActive =
    debouncedStress.rateSpikeBps > 0 ||
    debouncedStress.semiDrawdown > 0 ||
    debouncedStress.inflationSpike > 0;

  const engine = useMemo(
    () =>
      computeEngine(
        portfolio,
        market.stats,
        debouncedStress,
        market.macro.tenYearYield,
        market.macro.cpiYoY,
      ),
    [portfolio, market.stats, debouncedStress, market.macro],
  );

  const sim = useMemo(
    () =>
      runSimulation(
        portfolio,
        market.stats,
        debouncedStress,
        market.macro.tenYearYield,
        market.macro.cpiYoY,
      ),
    [portfolio, market.stats, debouncedStress, market.macro],
  );

  const gain = portfolio.totalValue - portfolio.cash - portfolio.totalCostBasis;
  const shockPct = engine.stressedValue / engine.baseValue - 1;

  const toggleTheme = () => {
    const root = document.documentElement;
    const dark =
      root.getAttribute("data-theme") === "dark" ||
      (root.getAttribute("data-theme") !== "light" &&
        root.getAttribute("data-osdark") === "1");
    root.setAttribute("data-theme", dark ? "light" : "dark");
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const texts = await Promise.all([...files].map((f) => f.text()));
    try {
      setPortfolio(buildPortfolio(texts));
    } catch (err) {
      alert(`Could not parse CSV: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold text-ink">
            Dynamic Portfolio Risk &amp; Simulation Engine
          </h1>
          <p className="mt-0.5 text-xs text-ink-2">
            Two Schwab accounts · as of 2026-07-16 close ·{" "}
            {sim.paths.toLocaleString()}-path GBM Monte Carlo · 10-year horizon
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge label="Yahoo 10y history" status={market.status.yahoo} />
          <SourceBadge label="FRED macro" status={market.status.fred} />
          <SourceBadge label="FMP valuations" status={market.status.fmp} />
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border px-3 py-1 text-xs font-medium text-ink-2 hover:text-ink"
            style={{ borderColor: "var(--hairline)" }}
          >
            Load Schwab CSVs
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-full border px-3 py-1 text-xs font-medium text-ink-2 hover:text-ink"
            style={{ borderColor: "var(--hairline)" }}
            aria-label="Toggle color theme"
          >
            ☾ / ☀
          </button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <StatTile
          label="Portfolio value"
          value={fmtUSD(portfolio.totalValue)}
          emphasis
          sub={
            <Delta
              value={fmtUSD(Math.abs(gain))}
              direction={gain >= 0 ? "up" : "down"}
              note={`vs cost basis (${fmtPct(gain / portfolio.totalCostBasis, 0)})`}
            />
          }
        />
        <StatTile
          label="After instant shock"
          value={stressActive ? fmtUSD(engine.stressedValue) : "—"}
          sub={
            stressActive ? (
              <Delta
                value={fmtPct(Math.abs(shockPct), 1)}
                direction={shockPct < 0 ? "down" : "up"}
                note="repricing"
              />
            ) : (
              "no stress applied"
            )
          }
        />
        <StatTile
          label="10Y Treasury (risk-free)"
          value={fmtPct(engine.stressed.riskFree, 2)}
          sub={
            market.macro.source === "live"
              ? `FRED DGS10 · ${market.macro.asOf}`
              : "snapshot"
          }
        />
        <StatTile
          label="CPI inflation (YoY)"
          value={fmtPct(engine.stressed.inflation, 1)}
          sub={
            market.macro.source === "live" ? "FRED CPIAUCSL" : "snapshot"
          }
        />
        <StatTile
          label="Median value in 10y"
          value={fmtUSD(sim.medianTerminal, true)}
          sub={`P(loss) ${fmtPct(sim.probLoss, 0)} · P(2×) ${fmtPct(sim.probDouble, 0)}`}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Current allocation"
          subtitle="modeled sleeves across both accounts"
        >
          <AllocationPanel portfolio={portfolio} />
        </Card>
        <Card
          title="Stress testing"
          subtitle="shocks flow into the Monte Carlo, VaR and Sharpe stack below"
        >
          <StressPanel stress={stress} onChange={setStress} />
        </Card>
      </div>

      <div className="mb-4">
        <Card
          title="Risk metrics"
          subtitle={`daily log returns · risk-free ${fmtPct(engine.stressed.riskFree, 2)} · ${market.yahooDetail}`}
        >
          <RiskPanel
            risk={engine.risk}
            baseline={engine.baselineRisk}
            stressActive={stressActive}
          />
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Monte Carlo projection — 10 years"
          subtitle={`${sim.paths.toLocaleString()} correlated GBM paths, monthly steps · P(≥$1M) ${fmtPct(sim.probMillion, 0)}`}
        >
          <FanChart fan={sim.fan} />
        </Card>
        <Card
          title="Terminal value distribution"
          subtitle="portfolio value at year 10 across all paths (log-scaled bins, outer tails clipped)"
        >
          <TerminalHistogram
            terminal={sim.terminal}
            startValue={engine.stressedValue}
            median={sim.medianTerminal}
          />
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card
          title="Efficient frontier — NVDA · ASML · AMZN · SMH"
          subtitle="long-only mixes of the concentrated sleeves (unstressed history)"
          className="lg:col-span-3"
        >
          <EfficientFrontier mpt={engine.mpt} />
        </Card>
        <Card
          title="Correlation matrix"
          subtitle="modeled sleeves, aligned daily history"
          className="lg:col-span-2"
        >
          <CorrelationMatrix mpt={engine.mpt} />
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Valuation monitor"
          subtitle="TTM multiples vs uploaded 10-K filing history"
        >
          <ValuationTable rows={market.valuations} />
        </Card>
        <Card title="All positions" subtitle="parsed from the uploaded exports">
          <PositionsTable portfolio={portfolio} />
        </Card>
      </div>

      <footer className="pb-6 text-[11px] leading-relaxed text-muted">
        Simulation methodology: exact-discretization geometric Brownian motion
        with Cholesky-correlated shocks; drift and volatility estimated from
        daily log returns. VaR/CVaR at 99% confidence, 1-day horizon.
        Stress sensitivities (equity duration, sector betas, Fisher
        pass-through) are documented constants in{" "}
        <code>src/lib/quant/stress.ts</code>. This is an analytical tool, not
        investment advice.
      </footer>
    </div>
  );
}
