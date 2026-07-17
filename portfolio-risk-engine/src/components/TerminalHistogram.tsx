import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { terminalHistogram } from "../lib/quant/gbm";
import { fmtUSD } from "../lib/format";
import { TooltipShell } from "./ui";

interface Props {
  terminal: Float64Array;
  startValue: number;
  median: number;
}

/** Distribution of 10-year terminal portfolio values across all paths. */
export default function TerminalHistogram({ terminal, startValue, median }: Props) {
  const bins = terminalHistogram(terminal, 40);
  const data = bins.map((b) => ({
    mid: (b.x0 + b.x1) / 2,
    x0: b.x0,
    x1: b.x1,
    count: b.count,
    below: b.x1 <= startValue,
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }} barCategoryGap={1}>
          <XAxis
            dataKey="mid"
            tickFormatter={(v) => fmtUSD(v, true)}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "var(--gridline)", fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <TooltipShell
                  title={`${fmtUSD(d.x0, true)} – ${fmtUSD(d.x1, true)}`}
                  rows={[
                    { name: "Paths", value: String(d.count) },
                    {
                      name: "Share",
                      value: `${((d.count / terminal.length) * 100).toFixed(1)}%`,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="count" isAnimationActive={false} radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.below ? "var(--status-critical)" : "var(--seq-400)"}
                fillOpacity={d.below ? 0.75 : 0.9}
              />
            ))}
          </Bar>
          <ReferenceLine
            x={median}
            stroke="var(--text-primary)"
            strokeDasharray="4 4"
            label={{
              value: `median ${fmtUSD(median, true)}`,
              position: "top",
              fill: "var(--text-secondary)",
              fontSize: 11,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-3 rounded-sm" style={{ background: "var(--status-critical)", opacity: 0.75 }} />
          ends below today&apos;s (stressed) value
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-3 rounded-sm" style={{ background: "var(--seq-400)" }} />
          ends above
        </span>
      </div>
    </div>
  );
}
