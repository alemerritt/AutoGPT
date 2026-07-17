import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FanPoint } from "../types";
import { fmtUSD } from "../lib/format";
import { TooltipShell } from "./ui";

interface Props {
  fan: FanPoint[];
}

/**
 * Monte Carlo fan: 5–95% band (light), interquartile band (mid), median line
 * (dark) — one sequential blue ramp, since the encoding is magnitude of the
 * same quantity, not separate identities.
 */
export default function FanChart({ fan }: Props) {
  const data = fan.map((p) => ({
    year: p.year,
    band90: [p.p5, p.p95],
    band50: [p.p25, p.p75],
    median: p.p50,
    mean: p.mean,
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="year"
            tickFormatter={(y) => (y === 0 ? "Now" : `+${y}y`)}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtUSD(v, true)}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={58}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <TooltipShell
                  title={label === 0 ? "Today" : `Year +${label}`}
                  rows={[
                    { name: "95th pct", value: fmtUSD(d.band90[1]), swatch: "var(--seq-100)" },
                    { name: "75th pct", value: fmtUSD(d.band50[1]), swatch: "var(--seq-300)" },
                    { name: "Median", value: fmtUSD(d.median), swatch: "var(--seq-650)" },
                    { name: "25th pct", value: fmtUSD(d.band50[0]), swatch: "var(--seq-300)" },
                    { name: "5th pct", value: fmtUSD(d.band90[0]), swatch: "var(--seq-100)" },
                    { name: "Mean", value: fmtUSD(d.mean), swatch: "var(--text-muted)" },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="band90"
            stroke="none"
            fill="var(--seq-100)"
            fillOpacity={0.9}
            isAnimationActive={false}
            name="5–95%"
          />
          <Area
            dataKey="band50"
            stroke="none"
            fill="var(--seq-300)"
            fillOpacity={0.75}
            isAnimationActive={false}
            name="25–75%"
          />
          <Line
            dataKey="median"
            stroke="var(--seq-650)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Median"
          />
          <Line
            dataKey="mean"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            name="Mean"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
        <LegendSwatch color="var(--seq-100)" label="5–95% of paths" />
        <LegendSwatch color="var(--seq-300)" label="25–75% of paths" />
        <LegendSwatch color="var(--seq-650)" label="Median" line />
        <LegendSwatch color="var(--text-muted)" label="Mean (dashed)" line />
      </div>
    </div>
  );
}

function LegendSwatch(props: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        style={{
          background: props.color,
          width: 12,
          height: props.line ? 2 : 10,
          borderRadius: 2,
          display: "inline-block",
        }}
      />
      {props.label}
    </span>
  );
}
