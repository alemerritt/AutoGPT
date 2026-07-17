import { StressState } from "../types";
import { STRESS_PRESETS } from "../lib/quant/stress";
import { fmtPct } from "../lib/format";

interface Props {
  stress: StressState;
  onChange: (s: StressState) => void;
}

/**
 * Interactive stress-testing controls. Every slider write flows through the
 * engine (debounced) and re-runs the Monte Carlo fan + VaR stack.
 */
export default function StressPanel({ stress, onChange }: Props) {
  const active =
    stress.rateSpikeBps > 0 ||
    stress.semiDrawdown > 0 ||
    stress.inflationSpike > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STRESS_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.state)}
            title={p.description}
            className="rounded-full border px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
            style={{ borderColor: "var(--hairline)", background: "var(--plane)" }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() =>
            onChange({ rateSpikeBps: 0, semiDrawdown: 0, inflationSpike: 0 })
          }
          disabled={!active}
          className="rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40"
          style={{
            borderColor: "var(--hairline)",
            color: "var(--status-critical)",
          }}
        >
          Reset
        </button>
      </div>

      <Slider
        label="10Y Treasury rate spike"
        detail="duration-based repricing of long-duration growth equity"
        value={stress.rateSpikeBps}
        min={0}
        max={400}
        step={25}
        format={(v) => (v === 0 ? "0 bp" : `+${v} bp`)}
        scenarioAt={250}
        scenarioLabel="+250bp scenario"
        onChange={(v) => onChange({ ...stress, rateSpikeBps: v })}
      />
      <Slider
        label="Semiconductor sector drawdown"
        detail="full shock to SMH & NVDA; ASML/AMD/S&P at sector betas"
        value={Math.round(stress.semiDrawdown * 100)}
        min={0}
        max={50}
        step={1}
        format={(v) => (v === 0 ? "0%" : `−${v}%`)}
        scenarioAt={30}
        scenarioLabel="−30% scenario"
        onChange={(v) => onChange({ ...stress, semiDrawdown: v / 100 })}
      />
      <Slider
        label="Global inflation spike"
        detail="real-return drag on drift + Fisher pass-through to rates"
        value={Math.round(stress.inflationSpike * 100)}
        min={0}
        max={30}
        step={1}
        format={(v) => (v === 0 ? "0%" : `+${v}%`)}
        scenarioAt={20}
        scenarioLabel="+20% scenario"
        onChange={(v) => onChange({ ...stress, inflationSpike: v / 100 })}
      />

      {active && (
        <p className="text-[11px] leading-relaxed text-ink-2">
          Applying: {stress.rateSpikeBps > 0 && `+${stress.rateSpikeBps}bp rates`}
          {stress.rateSpikeBps > 0 &&
            (stress.semiDrawdown > 0 || stress.inflationSpike > 0) &&
            " · "}
          {stress.semiDrawdown > 0 && `${fmtPct(-stress.semiDrawdown, 0)} semis`}
          {stress.semiDrawdown > 0 && stress.inflationSpike > 0 && " · "}
          {stress.inflationSpike > 0 &&
            `+${fmtPct(stress.inflationSpike, 0)} inflation`}
          . Shocks hit starting values, forward drift, volatility regime and
          the risk-free rate simultaneously.
        </p>
      )}
    </div>
  );
}

function Slider(props: {
  label: string;
  detail: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  scenarioAt: number;
  scenarioLabel: string;
  onChange: (v: number) => void;
}) {
  const pct = ((props.scenarioAt - props.min) / (props.max - props.min)) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-medium text-ink">{props.label}</label>
        <span className="tabular text-sm font-semibold text-ink">
          {props.format(props.value)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          className="w-full"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          aria-label={props.label}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
        {/* tick marking the headline scenario */}
        <div
          className="pointer-events-none absolute top-[-3px] h-2.5 w-px"
          style={{ left: `${pct}%`, background: "var(--text-muted)" }}
          aria-hidden
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted">
        <span>{props.detail}</span>
        <button
          className="pointer-events-auto underline decoration-dotted"
          onClick={() => props.onChange(props.scenarioAt)}
        >
          {props.scenarioLabel}
        </button>
      </div>
    </div>
  );
}
