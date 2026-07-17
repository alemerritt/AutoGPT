import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MptResult } from "../types";
import { fmtPct } from "../lib/format";
import { TooltipShell } from "./ui";

/**
 * Long-only efficient frontier over the concentrated sleeves
 * (NVDA / ASML / AMZN / SMH): sampled feasible cloud (muted), frontier
 * envelope (blue line), max-Sharpe portfolio and the CURRENT portfolio.
 */
export default function EfficientFrontier({ mpt }: { mpt: MptResult }) {
  // thin the cloud for rendering — 1200 dots reads the same as 5000
  const cloud = mpt.cloud.filter((_, i) => i % 4 === 0).map((p) => ({
    vol: p.vol,
    ret: p.ret,
    sharpe: p.sharpe,
  }));
  const frontier = mpt.frontier.map((p) => ({ vol: p.vol, ret: p.ret }));

  const weightRows = (weights: number[]) =>
    mpt.assets.map((a, i) => ({
      name: a,
      value: fmtPct(weights[i], 0),
    }));

  return (
    <div className="h-96">
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 8, right: 12, bottom: 18, left: 8 }}>
          <CartesianGrid stroke="var(--gridline)" strokeWidth={1} />
          <XAxis
            dataKey="vol"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => fmtPct(v, 0)}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            label={{
              value: "Annualized volatility",
              position: "insideBottom",
              offset: -12,
              fill: "var(--text-secondary)",
              fontSize: 11,
            }}
          />
          <YAxis
            dataKey="ret"
            type="number"
            tickFormatter={(v) => fmtPct(v, 0)}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
            label={{
              value: "Expected return",
              angle: -90,
              position: "insideLeft",
              fill: "var(--text-secondary)",
              fontSize: 11,
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const rows = [
                { name: "Return", value: fmtPct(d.ret, 1) },
                { name: "Volatility", value: fmtPct(d.vol, 1) },
              ];
              if (d.sharpe != null)
                rows.push({ name: "Sharpe", value: d.sharpe.toFixed(2) });
              if (d.weights) rows.push(...weightRows(d.weights));
              return <TooltipShell title={d.label ?? "Portfolio mix"} rows={rows} />;
            }}
          />
          <Scatter
            data={cloud}
            fill="var(--text-muted)"
            fillOpacity={0.28}
            isAnimationActive={false}
            shape={(p: any) => <circle cx={p.cx} cy={p.cy} r={2.5} fill={p.fill} fillOpacity={0.28} />}
          />
          <Line
            data={frontier}
            dataKey="ret"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Scatter
            data={[
              {
                vol: mpt.maxSharpe.vol,
                ret: mpt.maxSharpe.ret,
                sharpe: mpt.maxSharpe.sharpe,
                weights: mpt.maxSharpe.weights,
                label: "Max-Sharpe mix",
              },
            ]}
            fill="var(--series-2)"
            isAnimationActive={false}
            shape={(p: any) => (
              <circle cx={p.cx} cy={p.cy} r={6} fill={p.fill} stroke="var(--surface-1)" strokeWidth={2} />
            )}
          />
          <Scatter
            data={[
              {
                vol: mpt.current.vol,
                ret: mpt.current.ret,
                sharpe: mpt.current.sharpe,
                weights: mpt.current.weights,
                label: "Your current mix",
              },
            ]}
            fill="var(--series-6)"
            isAnimationActive={false}
            shape={(p: any) => (
              <rect
                x={p.cx - 5.5}
                y={p.cy - 5.5}
                width={11}
                height={11}
                transform={`rotate(45 ${p.cx} ${p.cy})`}
                fill={p.fill}
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--text-muted)", opacity: 0.5 }} />
          feasible long-only mixes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: "var(--series-1)" }} />
          efficient frontier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-2)" }} />
          max Sharpe
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: "var(--series-6)" }} />
          your portfolio
        </span>
      </div>
    </div>
  );
}
